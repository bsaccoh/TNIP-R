import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Alert, Dimensions, StatusBar, Animated, Modal, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import LeafletMap from '@/components/LeafletMap';
import { useRecording } from '@/context/RecordingContext';
import { endLiveTest, LiveSample } from '@/api/drivetest';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { rsrpColor, rsrpLabel, sinrColor } from '@/utils/signalColor';
import { haversine } from '@/utils/haversine';
import { useTheme, palette, radius, space, shadow } from '@/theme';
import { getSignalMetrics } from 'expo-telephony';
import { runPingTest, runDownloadTest, runUploadTest } from '@/utils/speedTest';

const { width } = Dimensions.get('window');

function Gauge({ label, value, unit, color, t }: {
  label: string; value: number | null; unit: string; color: string;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[g.card, { backgroundColor: t.surface }, shadow.sm]}>
      <View style={[g.dot, { backgroundColor: color + '22' }]}>
        <View style={[g.dotInner, { backgroundColor: color }]} />
      </View>
      <Text style={[g.val, { color }]}>{value != null ? value.toFixed(1) : '—'}</Text>
      <Text style={[g.unit, { color: t.textMuted }]}>{unit}</Text>
      <Text style={[g.lbl, { color: t.textMuted }]}>{label}</Text>
    </View>
  );
}

const g = StyleSheet.create({
  card: { flex: 1, borderRadius: radius.md, padding: 10, alignItems: 'center', shadowColor: '#000' },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  dotInner: { width: 10, height: 10, borderRadius: 5 },
  val: { fontSize: 19, fontWeight: '800', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 9, marginTop: -1 },
  lbl: { fontSize: 10, fontWeight: '600', letterSpacing: 0.4, marginTop: 3 },
});

export default function ActiveScreen() {
  useKeepAwake();
  const router = useRouter();
  const { session, addSample, togglePause, clearSession } = useRecording();
  const t = useTheme();

  const [elapsed, setElapsed] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lon: number }[]>([]);
  const [distance, setDistance] = useState(0);
  const [rsrp, setRsrp] = useState<number | null>(null);
  const [rsrq, setRsrq] = useState<number | null>(null);
  const [sinr, setSinr] = useState<number | null>(null);
  const [dl, setDl] = useState<number | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [mRsrp, setMRsrp] = useState('');
  const [mRsrq, setMRsrq] = useState('');
  const [mSinr, setMSinr] = useState('');
  const [mDl, setMDl] = useState('');
  const [mEvent, setMEvent] = useState('');
  const [ending, setEnding] = useState(false);

  const [autoSignal, setAutoSignal] = useState(false);

  // Speed test states
  const [showSpeedTest, setShowSpeedTest] = useState(false);
  const [speedTestStatus, setSpeedTestStatus] = useState<'idle' | 'ping' | 'download' | 'upload' | 'completed' | 'error'>('idle');
  const [testPing, setTestPing] = useState<number | null>(null);
  const [testDl, setTestDl] = useState<number | null>(null);
  const [testUl, setTestUl] = useState<number | null>(null);
  const [testProgress, setTestProgress] = useState(0);
  const [currentSpeedVal, setCurrentSpeedVal] = useState(0);

  const batchRef = useRef<LiveSample[]>([]);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const batchTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { flush, pendingCount, syncStatus, lastSyncAt } = useOfflineQueue(session?.testId ?? null);

  // Auto-read signal from modem every 5 s (dev build only — not Expo Go)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const m = await getSignalMetrics();
        if (m.error) return; // permission denied or unavailable
        setAutoSignal(true);
        if (m.rsrp != null)          setRsrp(m.rsrp);
        if (m.rsrq != null)          setRsrq(m.rsrq);
        if (m.sinr != null)          setSinr(Number(m.sinr.toFixed(1)));
        if (m.dl_throughput != null) setDl(m.dl_throughput);
      } catch {
        // Module not available in Expo Go — silently ignore
      }
    };

    poll();
    timer = setInterval(poll, 5000);
    return () => { if (timer) clearInterval(timer); };
  }, []);

  // Pulsing recording dot
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const flushBatch = useCallback(async () => {
    if (!batchRef.current.length) return;
    const toSend = [...batchRef.current];
    batchRef.current = [];
    const ok = await flush(toSend);
    if (!ok) {
      // flush already enqueued toSend to AsyncStorage on failure
    }
  }, [flush]);

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
            rsrp: rsrp ?? undefined, rsrq: rsrq ?? undefined,
            sinr: sinr ?? undefined, dl_throughput: dl ?? undefined,
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
    batchTimer.current = setInterval(flushBatch, 10000);
    return () => {
      clearInterval(timer);
      if (batchTimer.current) clearInterval(batchTimer.current);
      locationSub.current?.remove();
    };
  }, [session?.testId]);

  const logSpeedSample = (downloadMbps: number | null, uploadMbps: number | null, isFinal = false) => {
    if (!coords.length) return;
    const last = coords[coords.length - 1];
    const sample: LiveSample = {
      ts: new Date().toISOString().replace('T', ' ').slice(0, 19),
      latitude: last.lat, longitude: last.lon,
      rsrp: rsrp ?? undefined,
      rsrq: rsrq ?? undefined,
      sinr: sinr ?? undefined,
      dl_throughput: downloadMbps ? Math.round(downloadMbps * 1000) : undefined,
      ul_throughput: uploadMbps ? Math.round(uploadMbps * 1000) : undefined,
      event_type: isFinal ? 'speed_test_completed' : 'speed_test_running',
    };
    batchRef.current.push(sample);
    addSample(sample);
  };

  const startSpeedTest = async () => {
    setSpeedTestStatus('ping');
    setTestPing(null);
    setTestDl(null);
    setTestUl(null);
    setTestProgress(0);
    setCurrentSpeedVal(0);

    try {
      // 1. Run Ping
      const pingResult = await runPingTest();
      setTestPing(pingResult);

      // 2. Run Download
      setSpeedTestStatus('download');
      let lastLogTime = Date.now();
      const dlResult = await runDownloadTest((mbps, progress) => {
        setTestProgress(progress);
        setCurrentSpeedVal(mbps);
        setDl(mbps * 1000); // Update DL gauge (kbps)
        
        const now = Date.now();
        if (now - lastLogTime > 1500) {
          lastLogTime = now;
          logSpeedSample(mbps, null);
        }
      });
      setTestDl(dlResult);
      setDl(dlResult * 1000);

      // 3. Run Upload
      setSpeedTestStatus('upload');
      setTestProgress(0);
      setCurrentSpeedVal(0);
      lastLogTime = Date.now();
      const ulResult = await runUploadTest((mbps, progress) => {
        setTestProgress(progress);
        setCurrentSpeedVal(mbps);
        
        const now = Date.now();
        if (now - lastLogTime > 1500) {
          lastLogTime = now;
          logSpeedSample(null, mbps);
        }
      });
      setTestUl(ulResult);

      // 4. Completed
      setSpeedTestStatus('completed');
      logSpeedSample(dlResult, ulResult, true);
    } catch (err) {
      setSpeedTestStatus('error');
      Alert.alert('Speed Test Failed', 'Please check your internet connection and try again.');
    }
  };

  const logManualSample = () => {
    if (!coords.length) { Alert.alert('No GPS', 'Waiting for GPS fix…'); return; }
    const last = coords[coords.length - 1];
    const sample: LiveSample = {
      ts: new Date().toISOString().replace('T', ' ').slice(0, 19),
      latitude: last.lat, longitude: last.lon,
      rsrp: mRsrp ? Number(mRsrp) : undefined,
      rsrq: mRsrq ? Number(mRsrq) : undefined,
      sinr: mSinr ? Number(mSinr) : undefined,
      dl_throughput: mDl ? Number(mDl) : undefined,
      event_type: mEvent || undefined,
    };
    batchRef.current.push(sample);
    addSample(sample);
    if (mRsrp) setRsrp(Number(mRsrp));
    if (mRsrq) setRsrq(Number(mRsrq));
    if (mSinr) setSinr(Number(mSinr));
    if (mDl) setDl(Number(mDl));
    setMRsrp(''); setMRsrq(''); setMSinr(''); setMDl(''); setMEvent('');
    setShowManual(false);
  };

  const endTest = () => {
    Alert.alert('End Test?', 'This will finalise and save the drive test.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End Test', style: 'destructive', onPress: async () => {
        setEnding(true);
        try {
          await flushBatch();
          await endLiveTest(session!.testId);
          const id = session!.testId;
          clearSession();
          router.replace(`/record/result/${id}` as any);
        } catch {
          Alert.alert('Error', 'Failed to end test. Try again.');
          setEnding(false);
        }
      }},
    ]);
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2,'0')}:${String(Math.floor((s % 3600) / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  const fmtAgo = (d: Date) => {
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
  };

  const mapCoords = coords.map((c) => ({ latitude: c.lat, longitude: c.lon, color: rsrpColor(rsrp) }));
  const lastCoord = mapCoords[mapCoords.length - 1];
  const isPaused = session?.paused;

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={palette.primaryDark} />

      {/* Top status bar */}
      <View style={[styles.topBar, { backgroundColor: palette.primaryDark }]}>
        {/* Recording badge */}
        <View style={styles.recBadge}>
          <Animated.View style={[styles.recDot, {
            backgroundColor: isPaused ? palette.warning : palette.error,
            transform: [{ scale: isPaused ? 1 : pulseAnim }],
          }]} />
          <Text style={styles.recText}>{isPaused ? 'PAUSED' : 'REC'}</Text>
        </View>

        {/* Stats */}
        <View style={styles.topStat}>
          <Text style={styles.topStatVal}>{fmt(elapsed)}</Text>
          <Text style={styles.topStatLbl}>ELAPSED</Text>
        </View>
        <View style={[styles.topDivider]} />
        <View style={styles.topStat}>
          <Text style={styles.topStatVal}>{distance.toFixed(2)}</Text>
          <Text style={styles.topStatLbl}>KM</Text>
        </View>
        <View style={styles.topDivider} />
        <View style={styles.topStat}>
          <Text style={styles.topStatVal}>{session?.samples.length || 0}</Text>
          <Text style={styles.topStatLbl}>SAMPLES</Text>
        </View>
      </View>

      {/* KPI gauges */}
      <View style={[styles.gaugeBar, { backgroundColor: t.bg }]}>
        <Gauge label="RSRP" value={rsrp} unit="dBm" color={rsrpColor(rsrp)} t={t} />
        <Gauge label="RSRQ" value={rsrq} unit="dB"
          color={rsrq != null && rsrq >= -10 ? palette.success : rsrq != null && rsrq >= -15 ? palette.warning : palette.error} t={t} />
        <Gauge label="SINR" value={sinr} unit="dB" color={sinrColor(sinr)} t={t} />
        <Gauge label="DL" value={dl != null ? dl / 1000 : null} unit="Mbps" color={palette.primary} t={t} />
      </View>

      {/* Unified status strip: sync state (left) + signal source (right) */}
      <View style={[styles.statusStrip, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
        {/* Sync indicator */}
        <View style={styles.statusLeft}>
          <View style={[styles.statusDot, {
            backgroundColor:
              syncStatus === 'ok'      ? palette.success :
              syncStatus === 'syncing' ? palette.primary  :
              syncStatus === 'offline' ? palette.error    :
              syncStatus === 'error'   ? palette.warning  : t.border,
          }]} />
          <Text style={[styles.statusText, { color: t.textMuted }]}>
            {syncStatus === 'syncing' ? 'Uploading…' :
             syncStatus === 'ok'      ? `Synced${lastSyncAt ? ' ' + fmtAgo(lastSyncAt) : ''}` :
             syncStatus === 'offline' ? `Offline · ${pendingCount} queued` :
             syncStatus === 'error'   ? `Upload error · ${pendingCount} queued` :
             'Waiting for samples'}
          </Text>
        </View>
        {/* Signal source */}
        <View style={styles.statusRight}>
          <View style={[styles.statusDot, { backgroundColor: autoSignal ? palette.success : palette.warning }]} />
          <Text style={[styles.statusText, { color: t.textMuted }]}>
            {autoSignal ? 'Auto signal' : 'Manual'}
          </Text>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapArea}>
        {lastCoord ? (
          <LeafletMap coordinates={mapCoords} live style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[styles.mapPlaceholder, { backgroundColor: t.surface }]}>
            <View style={[styles.gpsIcon, { backgroundColor: palette.primary + '18' }]}>
              <Ionicons name="locate-outline" size={28} color={palette.primary} />
            </View>
            <Text style={[styles.gpsText, { color: t.text }]}>Acquiring GPS…</Text>
            <Text style={[styles.gpsSub, { color: t.textMuted }]}>Move to an open area for a faster fix</Text>
          </View>
        )}

        {/* Speed Test Floating Action Button */}
        <TouchableOpacity
          style={[styles.speedTestFab, { backgroundColor: palette.primary }]}
          onPress={() => setShowSpeedTest(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="speedometer" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Speed Test Modal */}
      <Modal
        visible={showSpeedTest}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          if (speedTestStatus !== 'download' && speedTestStatus !== 'upload') {
            setShowSpeedTest(false);
          }
        }}
      >
        <View style={[styles.modalContainer, { backgroundColor: t.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: t.border }]}>
            <Text style={[styles.modalTitle, { color: t.text }]}>Network Speed Test</Text>
            <TouchableOpacity
              onPress={() => setShowSpeedTest(false)}
              disabled={speedTestStatus === 'download' || speedTestStatus === 'upload'}
              style={{ opacity: (speedTestStatus === 'download' || speedTestStatus === 'upload') ? 0.3 : 1 }}
            >
              <Ionicons name="close" size={28} color={t.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Speed Gauge / Value Display */}
            <View style={styles.gaugeContainer}>
              <View style={[styles.gaugeCircle, { borderColor: palette.primary + '30' }]}>
                <Ionicons name="speedometer-outline" size={48} color={palette.primary} />
                <Text style={[styles.gaugeSpeedText, { color: t.text }]}>
                  {currentSpeedVal > 0 ? currentSpeedVal.toFixed(1) : '0.0'}
                </Text>
                <Text style={[styles.gaugeUnitText, { color: t.textMuted }]}>Mbps</Text>
              </View>
              
              <Text style={[styles.statusMessage, { color: palette.primary }]}>
                {speedTestStatus === 'idle' && 'Ready to start'}
                {speedTestStatus === 'ping' && 'Measuring Ping latency...'}
                {speedTestStatus === 'download' && 'Testing download speed...'}
                {speedTestStatus === 'upload' && 'Testing upload speed...'}
                {speedTestStatus === 'completed' && 'Test completed!'}
                {speedTestStatus === 'error' && 'Error during speed test'}
              </Text>
            </View>

            {/* Test Progress Bar */}
            {(speedTestStatus === 'download' || speedTestStatus === 'upload') && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBarBg, { backgroundColor: t.inputBg }]}>
                  <View style={[styles.progressBarFill, { backgroundColor: palette.primary, width: `${testProgress * 100}%` }]} />
                </View>
                <Text style={[styles.progressPct, { color: t.textMuted }]}>
                  {Math.round(testProgress * 100)}%
                </Text>
              </View>
            )}

            {/* Metrics Dashboard */}
            <View style={styles.metricsRow}>
              {/* Ping card */}
              <View style={[styles.metricCard, { backgroundColor: t.surface }, shadow.sm]}>
                <Ionicons name="swap-vertical" size={24} color={palette.warning} />
                <Text style={[styles.metricValue, { color: t.text }]}>
                  {testPing != null ? `${testPing} ms` : '—'}
                </Text>
                <Text style={[styles.metricLabel, { color: t.textMuted }]}>Ping</Text>
              </View>

              {/* Download card */}
              <View style={[styles.metricCard, { backgroundColor: t.surface }, shadow.sm]}>
                <Ionicons name="download-outline" size={24} color={palette.success} />
                <Text style={[styles.metricValue, { color: t.text }]}>
                  {testDl != null ? `${testDl.toFixed(1)} Mbps` : '—'}
                </Text>
                <Text style={[styles.metricLabel, { color: t.textMuted }]}>Download</Text>
              </View>

              {/* Upload card */}
              <View style={[styles.metricCard, { backgroundColor: t.surface }, shadow.sm]}>
                <Ionicons name="cloud-upload-outline" size={24} color={palette.primary} />
                <Text style={[styles.metricValue, { color: t.text }]}>
                  {testUl != null ? `${testUl.toFixed(1)} Mbps` : '—'}
                </Text>
                <Text style={[styles.metricLabel, { color: t.textMuted }]}>Upload</Text>
              </View>
            </View>

            {/* Start Button */}
            {speedTestStatus !== 'download' && speedTestStatus !== 'upload' && (
              <TouchableOpacity
                style={[styles.startTestBtn, { backgroundColor: palette.primary }]}
                onPress={startSpeedTest}
                activeOpacity={0.8}
              >
                <Text style={styles.startTestBtnText}>
                  {speedTestStatus === 'completed' ? 'Test Again' : 'Start Speed Test'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Active loading indicator */}
            {(speedTestStatus === 'download' || speedTestStatus === 'upload' || speedTestStatus === 'ping') && (
              <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: 24 }} />
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Manual entry panel */}
      {showManual && (
        <View style={[styles.manualPanel, { backgroundColor: t.surface, borderTopColor: t.border }]}>
          <View style={styles.manualHeader}>
            <Text style={[styles.manualTitle, { color: t.text }]}>Log Manual Sample</Text>
            <TouchableOpacity onPress={() => setShowManual(false)}>
              <Ionicons name="close-circle" size={22} color={t.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.manualGrid}>
            {([['RSRP', 'dBm', mRsrp, setMRsrp], ['RSRQ', 'dB', mRsrq, setMRsrq],
               ['SINR', 'dB', mSinr, setMSinr], ['DL', 'kbps', mDl, setMDl]] as const).map(([lbl, unit, val, set]: any) => (
              <View key={lbl} style={styles.manualField}>
                <Text style={[styles.manualLbl, { color: t.textMuted }]}>{lbl} <Text style={{ fontSize: 9 }}>{unit}</Text></Text>
                <TextInput
                  style={[styles.manualInput, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
                  value={val}
                  onChangeText={set}
                  keyboardType="numeric"
                  placeholder="—"
                  placeholderTextColor={t.textMuted}
                />
              </View>
            ))}
          </View>
          <TextInput
            style={[styles.manualInputFull, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
            value={mEvent}
            onChangeText={setMEvent}
            placeholder="Event type (optional)"
            placeholderTextColor={t.textMuted}
          />
          <TouchableOpacity style={[styles.logBtn, { backgroundColor: palette.success }]} onPress={logManualSample}>
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.logBtnText}>Log Sample</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom action bar */}
      <View style={[styles.bottomBar, { backgroundColor: t.surface, borderTopColor: t.border }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: isPaused ? palette.success + '15' : palette.warning + '15', borderColor: isPaused ? palette.success : palette.warning }]}
          onPress={togglePause}
          activeOpacity={0.8}
        >
          <Ionicons name={isPaused ? 'play' : 'pause'} size={18} color={isPaused ? palette.success : palette.warning} />
          <Text style={[styles.actionBtnText, { color: isPaused ? palette.success : palette.warning }]}>
            {isPaused ? 'Resume' : 'Pause'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: palette.primary + '15', borderColor: palette.primary }]}
          onPress={() => setShowManual(!showManual)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={18} color={palette.primary} />
          <Text style={[styles.actionBtnText, { color: palette.primary }]}>Signal</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.endBtn, { opacity: ending ? 0.6 : 1 }]}
          onPress={endTest}
          disabled={ending}
          activeOpacity={0.85}
        >
          <Ionicons name="stop-circle" size={18} color="#fff" />
          <Text style={styles.endBtnText}>{ending ? 'Saving…' : 'End Test'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: space.lg, gap: 10,
  },
  recBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  recDot: { width: 8, height: 8, borderRadius: 4 },
  recText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  topStat: { flex: 1, alignItems: 'center' },
  topStatVal: { color: '#fff', fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  topStatLbl: { color: 'rgba(255,255,255,0.5)', fontSize: 8, letterSpacing: 1, marginTop: 1 },
  topDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)' },

  gaugeBar: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.sm },
  statusStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.md, paddingVertical: 5, borderBottomWidth: 1 },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11 },

  mapArea: { flex: 1, overflow: 'hidden' },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  gpsIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  gpsText: { fontSize: 16, fontWeight: '700' },
  gpsSub: { fontSize: 13, textAlign: 'center', maxWidth: 240 },

  manualPanel: { borderTopWidth: 1, padding: space.md },
  manualHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm },
  manualTitle: { fontSize: 15, fontWeight: '700' },
  manualGrid: { flexDirection: 'row', gap: space.sm, marginBottom: space.sm },
  manualField: { flex: 1 },
  manualLbl: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  manualInput: { borderWidth: 1, borderRadius: radius.sm, padding: 8, fontSize: 13, textAlign: 'center' },
  manualInputFull: { borderWidth: 1, borderRadius: radius.sm, padding: 10, fontSize: 13, marginBottom: space.sm },
  logBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.md, padding: 12 },
  logBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  bottomBar: { flexDirection: 'row', gap: space.sm, padding: space.sm, paddingBottom: 28, borderTopWidth: 1 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.md, paddingVertical: 12, borderWidth: 1.5 },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  endBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: radius.md, paddingVertical: 12,
    backgroundColor: palette.error,
    shadowColor: palette.error, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  endBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  speedTestFab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },

  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalContent: {
    padding: 20,
    alignItems: 'center',
  },
  gaugeContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  gaugeCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  gaugeSpeedText: {
    fontSize: 48,
    fontWeight: '800',
    marginTop: 8,
  },
  gaugeUnitText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statusMessage: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '700',
    width: 32,
    textAlign: 'right',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
    width: '100%',
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  startTestBtn: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startTestBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
