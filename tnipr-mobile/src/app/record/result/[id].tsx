import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useColorScheme } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getAnalysis, getCompliance } from '@/api/drivetest';
import { rsrpLabel, rsrpColor } from '@/utils/signalColor';

const BLUE = '#1565C0';
const GREEN = '#2E7D32';
const RED = '#C62828';
const ORANGE = '#E65100';

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  const dark = useColorScheme() === 'dark';
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: dark ? '#333' : '#eee' }}>
      <Text style={{ color: dark ? '#9E9E9E' : '#757575', fontSize: 14 }}>{label}</Text>
      <Text style={{ color: color || (dark ? '#fff' : '#212121'), fontSize: 14, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const bg = dark ? '#121212' : '#F5F7FA';
  const card = dark ? '#1E1E1E' : '#fff';
  const text = dark ? '#fff' : '#212121';
  const sub = dark ? '#9E9E9E' : '#757575';

  const [analysis, setAnalysis] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getAnalysis(Number(id)), getCompliance(Number(id))]).then(([a, c]) => {
      setAnalysis(a);
      setCompliance(c);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={BLUE} />
        <Text style={[{ color: sub, marginTop: 12 }]}>Computing results…</Text>
      </View>
    );
  }

  const s = analysis?.stats;
  const m = analysis?.meta;
  const overallPass = compliance?.overall_result === 'PASS';
  const resultColor = overallPass ? GREEN : compliance?.overall_result === 'MARGINAL' ? ORANGE : RED;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      {/* Header */}
      <Text style={[styles.title, { color: text }]}>Test Complete!</Text>
      <Text style={[styles.sub, { color: sub }]}>{m?.test_name}</Text>

      {/* Compliance badge */}
      {compliance && (
        <View style={[styles.badge, { backgroundColor: resultColor + '18', borderColor: resultColor }]}>
          <Text style={[styles.badgeText, { color: resultColor }]}>
            {compliance.overall_result || 'UNKNOWN'} — {compliance.checks?.filter((c: any) => c.pass).length || 0}/{compliance.checks?.length || 0} thresholds met
          </Text>
        </View>
      )}

      {/* Summary */}
      <View style={[styles.card, { backgroundColor: card }]}>
        <Text style={[styles.cardTitle, { color: text }]}>Summary</Text>
        <StatRow label="Distance" value={`${Number(m?.distance_km || 0).toFixed(2)} km`} />
        <StatRow label="Duration" value={`${m?.duration_min || 0} min`} />
        <StatRow label="Total Samples" value={String(s?.total_samples || 0)} />
        <StatRow label="Route Type" value={m?.route_type?.toUpperCase() || '—'} />
        <StatRow label="Technology" value={m?.technology || '—'} />
      </View>

      {/* Signal quality */}
      <View style={[styles.card, { backgroundColor: card }]}>
        <Text style={[styles.cardTitle, { color: text }]}>Signal Quality</Text>
        <StatRow label="Avg RSRP" value={s?.avg_rsrp != null ? `${s.avg_rsrp} dBm` : '—'} color={rsrpColor(s?.avg_rsrp)} />
        <StatRow label="Min RSRP" value={s?.min_rsrp != null ? `${s.min_rsrp} dBm` : '—'} color={rsrpColor(s?.min_rsrp)} />
        <StatRow label="Avg RSRQ" value={s?.avg_rsrq != null ? `${s.avg_rsrq} dB` : '—'} />
        <StatRow label="Avg SINR" value={s?.avg_sinr != null ? `${s.avg_sinr} dB` : '—'} />
        <StatRow label="Avg DL" value={s?.avg_dl != null ? `${(s.avg_dl / 1000).toFixed(1)} Mbps` : '—'} />
        <StatRow label="Max DL" value={s?.max_dl != null ? `${(s.max_dl / 1000).toFixed(1)} Mbps` : '—'} />
        <StatRow label="Coverage Quality" value={rsrpLabel(s?.avg_rsrp)} color={rsrpColor(s?.avg_rsrp)} />
      </View>

      {/* RSRP distribution */}
      {s && (
        <View style={[styles.card, { backgroundColor: card }]}>
          <Text style={[styles.cardTitle, { color: text }]}>RSRP Distribution</Text>
          {[
            { label: 'Excellent (≥ −80)', count: s.rsrp_excellent, color: '#2E7D32' },
            { label: 'Good (−90 to −80)', count: s.rsrp_good, color: '#558B2F' },
            { label: 'Fair (−100 to −90)', count: s.rsrp_fair, color: '#F57F17' },
            { label: 'Poor (−110 to −100)', count: s.rsrp_poor, color: '#BF360C' },
            { label: 'No Signal (< −110)', count: s.rsrp_no_signal, color: '#757575' },
          ].map(({ label, count, color }) => {
            const pct = s.total_samples > 0 ? (count / s.total_samples) * 100 : 0;
            return (
              <View key={label} style={{ marginVertical: 5 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: sub, fontSize: 12 }}>{label}</Text>
                  <Text style={{ color: text, fontSize: 12, fontWeight: '600' }}>{pct.toFixed(0)}%</Text>
                </View>
                <View style={{ height: 6, backgroundColor: dark ? '#333' : '#eee', borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ height: 6, width: `${pct}%`, backgroundColor: color, borderRadius: 3 }} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Actions */}
      <TouchableOpacity style={[styles.btn, { backgroundColor: BLUE }]} onPress={() => router.push(`/tests/${id}` as any)}>
        <Text style={styles.btnText}>View Full Details & Map</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btnOutline, { borderColor: BLUE }]} onPress={() => router.replace('/(tabs)')}>
        <Text style={[styles.btnText, { color: BLUE }]}>Back to Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  sub: { fontSize: 14, marginBottom: 20 },
  badge: { borderRadius: 12, borderWidth: 1.5, padding: 14, marginBottom: 20, alignItems: 'center' },
  badgeText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  card: { borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2, shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  btn: { borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  btnOutline: { borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
