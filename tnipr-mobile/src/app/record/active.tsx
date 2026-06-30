import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Platform, Alert, useColorScheme, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useKeepAwake } from 'expo-keep-awake';
import LeafletMap from '@/components/LeafletMap';
import { useRecording } from '@/context/RecordingContext';
import { appendSamples, endLiveTest, LiveSample } from '@/api/drivetest';
import { rsrpColor, rsrpLabel, sinrColor } from '@/utils/signalColor';
import { haversine } from '@/utils/haversine';

const BLUE = '#1565C0';
const RED = '#C62828';
const GREEN = '#2E7D32';
const ORANGE = '#E65100';
const { width } = Dimensions.get('window');

function Gauge({ label, value, unit, color }: { label: string; value: number | null; unit: string; color: string }) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return (
    <View style={[gaugeStyles.box, { backgroundColor: dark ? '#1A1A1A' : '#F0F0F0' }]}>
      <Text style={[gaugeStyles.val, { color }]}>{value != null ? value.toFixed(1) : '—'}</Text>
      <Text style={[gaugeStyles.unit, { color: dark ? '#9E9E9E' : '#757575' }]}>{unit}</Text>
      <Text style={[gaugeStyles.label, { color: dark ? '#9E9E9E' : '#757575' }]}>{label}</Text>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  box: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  val: { fontSize: 22, fontWeight: '800' },
  unit: { fontSize: 10, marginTop: -2 },
  label: { fontSize: 11, marginTop: 4, fontWeight: '600' },
});

export default function ActiveScreen() {
  useKeepAwake();
  const router = useRouter();
  const { session, addSample, togglePause, clearSession } = useRecording();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  const [elapsed, setElapsed] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lon: number }[]>([]);
  const [distance, setDistance] = useState(0);
  const [rsrp, setRsrp] = useState<number | null>(null);
  const [rsrq, setRsrq] = useState<number | null>(null);
  const [sinr, setSinr] = useState<number | null>(null);
  const [dl, setDl] = useState<number | null>(null);

  // manual entry
  const [showManual, setShowManual] = useState(false);
  const [mRsrp, setMRsrp] = useState('');
  const [mRsrq, setMRsrq] = useState('');
  const [mSinr, setMSinr] = useState('');
  const [mDl, setMDl] = useState('');
  const [mEvent, setMEvent] = useState('');

  const [ending, setEnding] = useState(false);
  const batchRef = useRef<LiveSample[]>([]);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const batchTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const flush = useCallback(async () => {
    if (!session || !batchRef.current.length) return;
    const toSend = [...batchRef.current];
    batchRef.current = [];
    try { await appendSamples(session.testId, toSend); } catch {
      batchRef.current = [...toSend, ...batchRef.current];
    }
  }, [session]);

  useEffect(() => {
    if (!session) { router.replace('/record'); return; }

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed for drive testing.');
        return;
      }

      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 5000, distanceInterval: 5 },
        (loc) => {
          if (session?.paused) return;
          const { latitude, longitude, accuracy } = loc.coords;
          if (accuracy && accuracy > 30) return;

          const sample: LiveSample = {
            ts: new Date().toISOString().replace('T', ' ').slice(0, 19),
            latitude, longitude,
            rsrp: rsrp ?? undefined,
            rsrq: rsrq ?? undefined,
            sinr: sinr ?? undefined,
            dl_throughput: dl ?? undefined,
          };
          batchRef.current.push(sample);
          addSample(sample);

          setCoords((prev) => {
            if (prev.length > 0) {
              const last = prev[prev.length - 1];
              setDistance((d) => d + haversine(last.lat, last.lon, latitude, longitude));
            }
            return [...prev, { lat: latitude, lon: longitude }];
          });
        },
      );
    })();

    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    batchTimer.current = setInterval(flush, 10000);

    return () => {
      clearInterval(timer);
      if (batchTimer.current) clearInterval(batchTimer.current);
      locationSub.current?.remove();
    };
  }, [session?.testId]);

  const logManualSample = () => {
    if (!coords.length) { Alert.alert('Wait for GPS', 'Waiting for GPS fix...'); return; }
    const last = coords[coords.length - 1];
    const sample: LiveSample = {
      ts: new Date().toISOString().replace('T', ' ').slice(0, 19),
      latitude: last.lat,
      longitude: last.lon,
      rsrp: mRsrp ? Number(mRsrp) : undefined,
      rsrq: mRsrq ? Number(mRsrq) : undefined,
      sinr: mSinr ? Number(mSinr) : undefined,
      dl_throughput: mDl ? Number(mDl) : undefined,
      event_type: mEvent || undefined,
    };
    batchRef.current.push(sample);
    addSample(sample);
    if (mRsrp) setRsrp(Number(mRsrp));
    if (mSinr) setSinr(Number(mSinr));
    if (mDl) setDl(Number(mDl));
    setMRsrp(''); setMRsrq(''); setMSinr(''); setMDl(''); setMEvent('');
    setShowManual(false);
  };

  const endTest = () => {
    Alert.alert('End Test?', 'This will finalise and save the drive test.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Test', style: 'destructive', onPress: async () => {
          setEnding(true);
          try {
            await flush();
            await endLiveTest(session!.testId);
            const id = session!.testId;
            clearSession();
            router.replace(`/record/result/${id}` as any);
          } catch {
            Alert.alert('Error', 'Failed to end test. Try again.');
            setEnding(false);
          }
        },
      },
    ]);
  };

  const fmt = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const mapCoords = coords.map((c) => ({ latitude: c.lat, longitude: c.lon, color: rsrpColor(rsrp) }));
  const lastCoord = mapCoords[mapCoords.length - 1];
  const bg = dark ? '#0A0A0A' : '#F5F7FA';
  const text = dark ? '#fff' : '#212121';
  const sub = dark ? '#9E9E9E' : '#757575';
  const inputBg = dark ? '#2A2A2A' : '#F5F5F5';
  const border = dark ? '#333' : '#E0E0E0';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Status bar */}
      <View style={[styles.topBar, { backgroundColor: dark ? '#1A1A1A' : '#fff' }]}>
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: text }]}>{fmt(elapsed)}</Text>
          <Text style={[styles.statLbl, { color: sub }]}>ELAPSED</Text>
        </View>
        <View style={[styles.recDot, { backgroundColor: session?.paused ? ORANGE : RED }]} />
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: text }]}>{distance.toFixed(2)}</Text>
          <Text style={[styles.statLbl, { color: sub }]}>KM</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: text }]}>{session?.samples.length || 0}</Text>
          <Text style={[styles.statLbl, { color: sub }]}>POINTS</Text>
        </View>
      </View>

      {/* Gauges */}
      <View style={styles.gaugeRow}>
        <Gauge label="RSRP" value={rsrp} unit="dBm" color={rsrpColor(rsrp)} />
        <Gauge label="RSRQ" value={rsrq} unit="dB" color={rsrq != null && rsrq >= -10 ? GREEN : rsrq != null && rsrq >= -15 ? ORANGE : RED} />
        <Gauge label="SINR" value={sinr} unit="dB" color={sinrColor(sinr)} />
        <Gauge label="DL" value={dl != null ? dl / 1000 : null} unit="Mbps" color={BLUE} />
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {lastCoord ? (
          <LeafletMap coordinates={mapCoords} live style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[styles.mapPlaceholder, { backgroundColor: dark ? '#1A1A1A' : '#E8EAF6' }]}>
            <Text style={{ color: sub, fontSize: 14 }}>Waiting for GPS fix…</Text>
          </View>
        )}
      </View>

      {/* Manual entry */}
      {showManual && (
        <View style={[styles.manualPanel, { backgroundColor: dark ? '#1E1E1E' : '#fff' }]}>
          <Text style={[styles.manualTitle, { color: text }]}>Log Manual Sample</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            {[['RSRP', mRsrp, setMRsrp], ['RSRQ', mRsrq, setMRsrq], ['SINR', mSinr, setMSinr], ['DL kbps', mDl, setMDl]].map(([lbl, val, set]: any) => (
              <View key={lbl} style={{ flex: 1 }}>
                <Text style={[styles.inputLbl, { color: sub }]}>{lbl}</Text>
                <TextInput
                  style={[styles.minInput, { backgroundColor: inputBg, borderColor: border, color: text }]}
                  value={val}
                  onChangeText={set}
                  keyboardType="numeric"
                  placeholder="—"
                  placeholderTextColor={sub}
                />
              </View>
            ))}
          </View>
          <TextInput
            style={[styles.minInput, { backgroundColor: inputBg, borderColor: border, color: text, marginBottom: 10 }]}
            value={mEvent}
            onChangeText={setMEvent}
            placeholder="Event type (optional)"
            placeholderTextColor={sub}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[styles.logBtn, { backgroundColor: GREEN }]} onPress={logManualSample}>
              <Text style={styles.logBtnText}>Log Sample</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.logBtn, { backgroundColor: dark ? '#333' : '#eee' }]} onPress={() => setShowManual(false)}>
              <Text style={[styles.logBtnText, { color: text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Action buttons */}
      <View style={[styles.bottomBar, { backgroundColor: dark ? '#1A1A1A' : '#fff' }]}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: ORANGE }]} onPress={togglePause}>
          <Text style={styles.actionBtnText}>{session?.paused ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: BLUE }]} onPress={() => setShowManual(!showManual)}>
          <Text style={styles.actionBtnText}>+ Signal</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: RED, opacity: ending ? 0.6 : 1 }]} onPress={endTest} disabled={ending}>
          <Text style={styles.actionBtnText}>{ending ? 'Saving…' : 'End Test'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 14, paddingTop: 52, elevation: 2, shadowOpacity: 0.08 },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLbl: { fontSize: 9, letterSpacing: 1, marginTop: 2 },
  recDot: { width: 14, height: 14, borderRadius: 7 },
  gaugeRow: { flexDirection: 'row', padding: 10, gap: 8 },
  mapContainer: { flex: 1 },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  manualPanel: { padding: 16, elevation: 8, shadowOpacity: 0.12 },
  manualTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  inputLbl: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
  minInput: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13, textAlign: 'center' },
  logBtn: { flex: 1, borderRadius: 8, padding: 12, alignItems: 'center' },
  logBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  bottomBar: { flexDirection: 'row', padding: 12, gap: 10, paddingBottom: 28, elevation: 8, shadowOpacity: 0.1 },
  actionBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
