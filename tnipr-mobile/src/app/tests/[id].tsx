import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useColorScheme, ActivityIndicator, FlatList, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { getAnalysis, getSamples, getCompliance, Sample } from '@/api/drivetest';
import { rsrpColor, rsrpLabel } from '@/utils/signalColor';

const BLUE = '#1565C0';
const GREEN = '#2E7D32';
const ORANGE = '#E65100';
const RED = '#C62828';

const TABS = ['Map', 'Stats', 'Samples', 'Compliance'];

function TabBar({ active, onSelect, dark }: { active: string; onSelect: (t: string) => void; dark: boolean }) {
  return (
    <View style={[tabStyles.bar, { backgroundColor: dark ? '#1A1A1A' : '#fff', borderBottomColor: dark ? '#333' : '#eee' }]}>
      {TABS.map((t) => (
        <TouchableOpacity key={t} style={tabStyles.tab} onPress={() => onSelect(t)}>
          <Text style={[tabStyles.text, { color: active === t ? BLUE : dark ? '#9E9E9E' : '#757575', fontWeight: active === t ? '700' : '500' }]}>{t}</Text>
          {active === t && <View style={tabStyles.indicator} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}
const tabStyles = StyleSheet.create({
  bar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  text: { fontSize: 13 },
  indicator: { position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, backgroundColor: BLUE, borderRadius: 1 },
});

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  const dark = useColorScheme() === 'dark';
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: dark ? '#333' : '#eee' }}>
      <Text style={{ color: dark ? '#9E9E9E' : '#757575', fontSize: 13 }}>{label}</Text>
      <Text style={{ color: color || (dark ? '#fff' : '#212121'), fontSize: 13, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

export default function TestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const bg = dark ? '#121212' : '#F5F7FA';
  const card = dark ? '#1E1E1E' : '#fff';
  const text = dark ? '#fff' : '#212121';
  const sub = dark ? '#9E9E9E' : '#757575';

  const [tab, setTab] = useState('Map');
  const [analysis, setAnalysis] = useState<any>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [compliance, setCompliance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const n = Number(id);
    Promise.all([getAnalysis(n), getSamples(n), getCompliance(n)]).then(([a, s, c]) => {
      setAnalysis(a);
      setSamples(s);
      setCompliance(c);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={BLUE} />
      </View>
    );
  }

  const meta = analysis?.meta;
  const stats = analysis?.stats;
  const mapCoords = samples
    .filter((s) => s.latitude && s.longitude)
    .map((s) => ({ latitude: Number(s.latitude), longitude: Number(s.longitude) }));
  const midpoint = mapCoords[Math.floor(mapCoords.length / 2)];

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: dark ? '#1A1A1A' : '#fff' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: BLUE, fontSize: 16, marginBottom: 4 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: text }]} numberOfLines={1}>{meta?.test_name || 'Test Detail'}</Text>
        <Text style={[styles.sub, { color: sub }]}>{meta?.operator_name} · {meta?.test_date} · {meta?.technology}</Text>
      </View>

      <TabBar active={tab} onSelect={setTab} dark={dark} />

      {/* MAP TAB */}
      {tab === 'Map' && (
        <View style={{ flex: 1 }}>
          {mapCoords.length > 0 && midpoint ? (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={StyleSheet.absoluteFill}
              initialRegion={{ ...midpoint, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
            >
              <Polyline
                coordinates={mapCoords}
                strokeColors={samples.filter((s) => s.latitude && s.longitude).map((s) => rsrpColor(s.rsrp))}
                strokeWidth={4}
              />
              <Marker coordinate={mapCoords[0]} pinColor={GREEN} title="Start" />
              <Marker coordinate={mapCoords[mapCoords.length - 1]} pinColor={RED} title="End" />
            </MapView>
          ) : (
            <View style={styles.centered}>
              <Text style={{ color: sub }}>No GPS data available for this test.</Text>
            </View>
          )}
        </View>
      )}

      {/* STATS TAB */}
      {tab === 'Stats' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <View style={[styles.card, { backgroundColor: card }]}>
            <Text style={[styles.cardTitle, { color: text }]}>Drive Test Info</Text>
            <StatRow label="Distance" value={`${Number(meta?.distance_km || 0).toFixed(2)} km`} />
            <StatRow label="Duration" value={`${meta?.duration_min || 0} min`} />
            <StatRow label="Samples" value={String(stats?.total_samples || 0)} />
            <StatRow label="Route Type" value={(meta?.route_type || '—').toUpperCase()} />
            <StatRow label="Tester" value={meta?.tester_name || '—'} />
            <StatRow label="Device" value={meta?.device_model || '—'} />
          </View>
          <View style={[styles.card, { backgroundColor: card }]}>
            <Text style={[styles.cardTitle, { color: text }]}>Signal Metrics</Text>
            <StatRow label="Avg RSRP" value={stats?.avg_rsrp != null ? `${stats.avg_rsrp} dBm` : '—'} color={rsrpColor(stats?.avg_rsrp)} />
            <StatRow label="Min / Max RSRP" value={stats?.min_rsrp != null ? `${stats.min_rsrp} / ${stats.max_rsrp} dBm` : '—'} />
            <StatRow label="Avg RSRQ" value={stats?.avg_rsrq != null ? `${stats.avg_rsrq} dB` : '—'} />
            <StatRow label="Avg SINR" value={stats?.avg_sinr != null ? `${stats.avg_sinr} dB` : '—'} />
            <StatRow label="Avg DL" value={stats?.avg_dl != null ? `${(stats.avg_dl / 1000).toFixed(1)} Mbps` : '—'} />
            <StatRow label="Max DL" value={stats?.max_dl != null ? `${(stats.max_dl / 1000).toFixed(1)} Mbps` : '—'} />
            <StatRow label="Avg UL" value={stats?.avg_ul != null ? `${(stats.avg_ul / 1000).toFixed(1)} Mbps` : '—'} />
          </View>
          <View style={[styles.card, { backgroundColor: card }]}>
            <Text style={[styles.cardTitle, { color: text }]}>RSRP Distribution</Text>
            {[
              { label: 'Excellent ≥ −80', count: stats?.rsrp_excellent, color: GREEN },
              { label: 'Good −90 to −80', count: stats?.rsrp_good, color: '#558B2F' },
              { label: 'Fair −100 to −90', count: stats?.rsrp_fair, color: ORANGE },
              { label: 'Poor −110 to −100', count: stats?.rsrp_poor, color: RED },
              { label: 'No Signal < −110', count: stats?.rsrp_no_signal, color: '#757575' },
            ].map(({ label, count, color }) => {
              const pct = stats?.total_samples > 0 ? ((count || 0) / stats.total_samples) * 100 : 0;
              return (
                <View key={label} style={{ marginVertical: 5 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ color: sub, fontSize: 12 }}>{label}</Text>
                    <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{pct.toFixed(1)}%</Text>
                  </View>
                  <View style={{ height: 5, backgroundColor: dark ? '#333' : '#eee', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.min(pct, 100)}%`, height: 5, backgroundColor: color, borderRadius: 3 }} />
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* SAMPLES TAB */}
      {tab === 'Samples' && (
        <View style={{ flex: 1 }}>
          <View style={[styles.tableHeader, { backgroundColor: dark ? '#1A1A1A' : '#F5F5F5' }]}>
            {['RSRP', 'RSRQ', 'SINR', 'DL', 'Event'].map((h) => (
              <Text key={h} style={[styles.tableHead, { color: sub, flex: h === 'Event' ? 2 : 1 }]}>{h}</Text>
            ))}
          </View>
          <FlatList
            data={samples}
            keyExtractor={(s) => String(s.sample_id)}
            renderItem={({ item }) => (
              <View style={[styles.tableRow, { borderBottomColor: dark ? '#333' : '#eee' }]}>
                <Text style={[styles.tableCell, { color: rsrpColor(item.rsrp), flex: 1 }]}>{item.rsrp ?? '—'}</Text>
                <Text style={[styles.tableCell, { color: text, flex: 1 }]}>{item.rsrq ?? '—'}</Text>
                <Text style={[styles.tableCell, { color: text, flex: 1 }]}>{item.sinr ?? '—'}</Text>
                <Text style={[styles.tableCell, { color: text, flex: 1 }]}>{item.dl_throughput ? (Number(item.dl_throughput) / 1000).toFixed(1) : '—'}</Text>
                <Text style={[styles.tableCell, { color: sub, flex: 2 }]} numberOfLines={1}>{item.event_type || '—'}</Text>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </View>
      )}

      {/* COMPLIANCE TAB */}
      {tab === 'Compliance' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {compliance ? (
            <>
              {(() => {
                const ov = compliance.overall_result;
                const c = ov === 'PASS' ? GREEN : ov === 'MARGINAL' ? ORANGE : RED;
                return (
                  <View style={[styles.badge, { backgroundColor: c + '18', borderColor: c }]}>
                    <Text style={[styles.badgeText, { color: c }]}>{ov}</Text>
                    <Text style={[styles.badgeSub, { color: sub }]}>
                      {compliance.checks?.filter((x: any) => x.pass).length}/{compliance.checks?.length} thresholds passed
                    </Text>
                  </View>
                );
              })()}
              {compliance.checks?.map((chk: any, i: number) => (
                <View key={i} style={[styles.card, { backgroundColor: card }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={[{ color: text, fontSize: 14, fontWeight: '700' }]}>{chk.label || chk.metric}</Text>
                    <Text style={{ color: chk.pass ? GREEN : RED, fontWeight: '700', fontSize: 13 }}>{chk.pass ? 'PASS' : 'FAIL'}</Text>
                  </View>
                  <Text style={{ color: sub, fontSize: 12 }}>
                    Measured: {chk.actual ?? '—'} · Required: {chk.threshold}
                  </Text>
                  {chk.compliance_pct != null && (
                    <Text style={{ color: sub, fontSize: 12, marginTop: 2 }}>
                      {chk.compliance_pct?.toFixed(1)}% of samples meet threshold
                    </Text>
                  )}
                </View>
              ))}
            </>
          ) : (
            <Text style={{ color: sub, textAlign: 'center', marginTop: 40 }}>No compliance data available.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2 },
  card: { borderRadius: 12, padding: 14, marginBottom: 14, elevation: 2, shadowOpacity: 0.05, shadowRadius: 3 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  badge: { borderRadius: 14, borderWidth: 1.5, padding: 16, alignItems: 'center', marginBottom: 16 },
  badgeText: { fontSize: 20, fontWeight: '800' },
  badgeSub: { fontSize: 13, marginTop: 4 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8 },
  tableHead: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  tableCell: { fontSize: 13 },
});
