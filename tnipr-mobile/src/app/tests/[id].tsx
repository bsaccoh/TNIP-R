import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList, StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LeafletMap from '@/components/LeafletMap';
import { getAnalysis, getSamples, getCompliance, Sample } from '@/api/drivetest';
import { rsrpColor, rsrpLabel } from '@/utils/signalColor';
import { useTheme, palette, shadow, radius, space } from '@/theme';
import { exportReportAsPdf, ReportData } from '@/utils/exportReport';

const TECH_COLORS: Record<string, string> = {
  '4G': palette.primary, '5G': palette.purple,
  '3G': palette.warning, '2G': '#546E7A',
};

const TABS = ['Map', 'Stats', 'Samples', 'Compliance'];

function TabBar({ active, onSelect, t }: {
  active: string; onSelect: (tab: string) => void; t: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[tb.bar, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
      {TABS.map((tab) => {
        const isActive = active === tab;
        return (
          <TouchableOpacity key={tab} style={tb.item} onPress={() => onSelect(tab)} activeOpacity={0.7}>
            <Text style={[tb.label, { color: isActive ? palette.primary : t.textMuted, fontWeight: isActive ? '700' : '500' }]}>
              {tab}
            </Text>
            {isActive && <View style={[tb.indicator, { backgroundColor: palette.primary }]} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tb = StyleSheet.create({
  bar: { flexDirection: 'row', borderBottomWidth: 1 },
  item: { flex: 1, alignItems: 'center', paddingVertical: 13 },
  label: { fontSize: 13 },
  indicator: { position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2.5, borderRadius: 2 },
});

function StatRow({ label, value, color, t }: { label: string; value: string; color?: string; t: ReturnType<typeof useTheme> }) {
  return (
    <View style={[sr.row, { borderBottomColor: t.border }]}>
      <Text style={[sr.label, { color: t.textSub }]}>{label}</Text>
      <Text style={[sr.value, { color: color || t.text }]}>{value}</Text>
    </View>
  );
}
const sr = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1 },
  label: { fontSize: 13 },
  value: { fontSize: 13, fontWeight: '700' },
});

export default function TestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();

  const [tab, setTab] = useState('Map');
  const [analysis, setAnalysis] = useState<any>(null);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [compliance, setCompliance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const n = Number(id);
    Promise.all([getAnalysis(n), getSamples(n), getCompliance(n)])
      .then(([a, s, c]) => { setAnalysis(a); setSamples(s); setCompliance(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={[{ color: t.textSub, marginTop: 12, fontSize: 13 }]}>Loading test data…</Text>
      </View>
    );
  }

  const meta = analysis?.meta;
  const stats = analysis?.stats;
  const techColor = TECH_COLORS[meta?.technology] || palette.primary;

  const handleExport = async () => {
    if (!analysis || exporting) return;
    setExporting(true);
    try {
      const reportData: ReportData = {
        meta: meta ?? {},
        stats: stats ?? {},
        compliance: {
          status: compliance?.status,
          checks_passed: compliance?.checks_passed,
          checks_total: compliance?.checks_total,
          checks: compliance?.checks ?? [],
        },
      };
      await exportReportAsPdf(reportData);
    } catch (e: any) {
      const { Alert } = await import('react-native');
      Alert.alert('Export failed', e?.message ?? 'Could not generate PDF.');
    } finally {
      setExporting(false);
    }
  };
  const mapCoords = samples
    .filter((s) => s.latitude && s.longitude)
    .map((s) => ({ latitude: Number(s.latitude), longitude: Number(s.longitude), color: rsrpColor(s.rsrp) }));

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={palette.primaryDark} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: palette.primaryDark }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{meta?.test_name || 'Test Detail'}</Text>
          <View style={styles.headerMeta}>
            {meta?.technology && (
              <View style={[styles.techBadge, { backgroundColor: techColor + '30' }]}>
                <Text style={[styles.techBadgeText, { color: '#fff' }]}>{meta.technology}</Text>
              </View>
            )}
            <Text style={styles.headerSub}>{meta?.operator_name} · {meta?.test_date}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport} disabled={exporting} activeOpacity={0.75}>
          {exporting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="share-outline" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>

      <TabBar active={tab} onSelect={setTab} t={t} />

      {/* ── MAP TAB ── */}
      {tab === 'Map' && (
        <View style={{ flex: 1 }}>
          {mapCoords.length > 1 ? (
            <LeafletMap coordinates={mapCoords} />
          ) : (
            <View style={[styles.centered, { backgroundColor: t.bg }]}>
              <View style={[styles.emptyIcon, { backgroundColor: palette.primary + '12' }]}>
                <Ionicons name="map-outline" size={28} color={palette.primary} />
              </View>
              <Text style={[styles.emptyText, { color: t.textSub }]}>No GPS data for this test</Text>
            </View>
          )}
        </View>
      )}

      {/* ── STATS TAB ── */}
      {tab === 'Stats' && (
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* Info card */}
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
            <Text style={[styles.cardTitle, { color: t.text }]}>Test Info</Text>
            <StatRow label="Distance" value={`${Number(meta?.distance_km || 0).toFixed(2)} km`} t={t} />
            <StatRow label="Duration" value={`${meta?.duration_min || 0} min`} t={t} />
            <StatRow label="Samples" value={String(stats?.total_samples || 0)} t={t} />
            <StatRow label="Route Type" value={(meta?.route_type || '—').toUpperCase()} t={t} />
            <StatRow label="Tester" value={meta?.tester_name || '—'} t={t} />
            <StatRow label="Device" value={meta?.device_model || '—'} t={t} />
          </View>

          {/* Signal metrics */}
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
            <Text style={[styles.cardTitle, { color: t.text }]}>Signal Metrics</Text>
            <StatRow label="Avg RSRP" value={stats?.avg_rsrp != null ? `${stats.avg_rsrp} dBm` : '—'} color={rsrpColor(stats?.avg_rsrp)} t={t} />
            <StatRow label="Min / Max RSRP" value={stats?.min_rsrp != null ? `${stats.min_rsrp} / ${stats.max_rsrp} dBm` : '—'} t={t} />
            <StatRow label="Avg RSRQ" value={stats?.avg_rsrq != null ? `${stats.avg_rsrq} dB` : '—'} t={t} />
            <StatRow label="Avg SINR" value={stats?.avg_sinr != null ? `${stats.avg_sinr} dB` : '—'} t={t} />
            <StatRow label="Avg DL" value={stats?.avg_dl != null ? `${(stats.avg_dl / 1000).toFixed(1)} Mbps` : '—'} t={t} />
            <StatRow label="Max DL" value={stats?.max_dl != null ? `${(stats.max_dl / 1000).toFixed(1)} Mbps` : '—'} t={t} />
            <StatRow label="Avg UL" value={stats?.avg_ul != null ? `${(stats.avg_ul / 1000).toFixed(1)} Mbps` : '—'} t={t} />
          </View>

          {/* RSRP distribution */}
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
            <Text style={[styles.cardTitle, { color: t.text }]}>RSRP Distribution</Text>
            {[
              { label: 'Excellent', range: '≥ −80 dBm', count: stats?.rsrp_excellent, color: palette.success },
              { label: 'Good',      range: '−90 to −80', count: stats?.rsrp_good,      color: palette.successLight },
              { label: 'Fair',      range: '−100 to −90', count: stats?.rsrp_fair,     color: palette.warning },
              { label: 'Poor',      range: '−110 to −100', count: stats?.rsrp_poor,    color: palette.error },
              { label: 'No Signal', range: '< −110 dBm',  count: stats?.rsrp_no_signal, color: t.textMuted },
            ].map(({ label, range, count, color }) => {
              const pct = stats?.total_samples > 0 ? ((count || 0) / stats.total_samples) * 100 : 0;
              return (
                <View key={label} style={styles.distRow}>
                  <View style={styles.distLabelWrap}>
                    <View style={[styles.distDot, { backgroundColor: color }]} />
                    <View>
                      <Text style={[styles.distLabel, { color: t.text }]}>{label}</Text>
                      <Text style={[styles.distRange, { color: t.textMuted }]}>{range}</Text>
                    </View>
                  </View>
                  <View style={styles.distBarWrap}>
                    <View style={[styles.distBarTrack, { backgroundColor: t.border }]}>
                      <View style={[styles.distBarFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: color }]} />
                    </View>
                    <Text style={[styles.distPct, { color }]}>{pct.toFixed(1)}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ── SAMPLES TAB ── */}
      {tab === 'Samples' && (
        <View style={{ flex: 1 }}>
          <View style={[styles.tableHeader, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
            {['RSRP', 'RSRQ', 'SINR', 'DL', 'Event'].map((h, i) => (
              <Text key={h} style={[styles.tableHead, { color: t.textMuted, flex: i === 4 ? 2 : 1 }]}>{h}</Text>
            ))}
          </View>
          <FlatList
            data={samples}
            keyExtractor={(s) => String(s.sample_id)}
            renderItem={({ item, index }) => (
              <View style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? t.bg : t.surface, borderBottomColor: t.border }]}>
                <Text style={[styles.tableCell, { color: rsrpColor(item.rsrp), flex: 1 }]}>{item.rsrp ?? '—'}</Text>
                <Text style={[styles.tableCell, { color: t.textSub, flex: 1 }]}>{item.rsrq ?? '—'}</Text>
                <Text style={[styles.tableCell, { color: t.textSub, flex: 1 }]}>{item.sinr ?? '—'}</Text>
                <Text style={[styles.tableCell, { color: t.textSub, flex: 1 }]}>
                  {item.dl_throughput ? (Number(item.dl_throughput) / 1000).toFixed(1) : '—'}
                </Text>
                <Text style={[styles.tableCell, { color: t.textMuted, flex: 2 }]} numberOfLines={1}>{item.event_type || '—'}</Text>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* ── COMPLIANCE TAB ── */}
      {tab === 'Compliance' && (
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {compliance ? (
            <>
              {(() => {
                const ov = compliance.overall_result;
                const c = ov === 'PASS' ? palette.success : ov === 'MARGINAL' ? palette.warning : palette.error;
                const passed = compliance.checks?.filter((x: any) => x.pass).length ?? 0;
                const total = compliance.checks?.length ?? 0;
                return (
                  <View style={[styles.overallBadge, { backgroundColor: c + '10', borderColor: c + '50' }, shadow.sm]}>
                    <View style={[styles.overallIcon, { backgroundColor: c + '18' }]}>
                      <Ionicons name={ov === 'PASS' ? 'checkmark-circle' : ov === 'MARGINAL' ? 'warning' : 'close-circle'} size={28} color={c} />
                    </View>
                    <Text style={[styles.overallResult, { color: c }]}>{ov}</Text>
                    <Text style={[styles.overallSub, { color: t.textSub }]}>{passed}/{total} thresholds passed</Text>
                  </View>
                );
              })()}

              {compliance.checks?.map((chk: any, i: number) => (
                <View key={i} style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
                  <View style={styles.checkHeader}>
                    <Text style={[styles.checkLabel, { color: t.text }]}>{chk.label || chk.metric}</Text>
                    <View style={[styles.checkPill, { backgroundColor: (chk.pass ? palette.success : palette.error) + '14' }]}>
                      <Ionicons name={chk.pass ? 'checkmark' : 'close'} size={12} color={chk.pass ? palette.success : palette.error} />
                      <Text style={[styles.checkPillText, { color: chk.pass ? palette.success : palette.error }]}>
                        {chk.pass ? 'PASS' : 'FAIL'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.checkMeta, { color: t.textSub }]}>
                    Measured: <Text style={{ fontWeight: '700', color: t.text }}>{chk.actual ?? '—'}</Text>
                    {'  ·  '}Required: <Text style={{ fontWeight: '700', color: t.text }}>{chk.threshold}</Text>
                  </Text>
                  {chk.compliance_pct != null && (
                    <View style={styles.checkBarWrap}>
                      <View style={[styles.checkBarTrack, { backgroundColor: t.border }]}>
                        <View style={[styles.checkBarFill, {
                          width: `${Math.min(chk.compliance_pct, 100)}%` as any,
                          backgroundColor: chk.pass ? palette.success : palette.error,
                        }]} />
                      </View>
                      <Text style={[styles.checkPct, { color: t.textMuted }]}>{chk.compliance_pct?.toFixed(1)}%</Text>
                    </View>
                  )}
                </View>
              ))}
            </>
          ) : (
            <View style={[styles.centered, { flex: 0, paddingTop: 48 }]}>
              <Text style={[{ color: t.textSub, fontSize: 14 }]}>No compliance data available.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.sm },
  emptyIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14 },

  header: { paddingTop: 52, paddingBottom: space.lg, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  exportBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  techBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  techBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },

  card: { borderRadius: radius.lg, borderWidth: 1, padding: space.md, marginBottom: space.md, shadowColor: '#000' },
  cardTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },

  distRow: { paddingVertical: 8 },
  distLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  distDot: { width: 8, height: 8, borderRadius: 4 },
  distLabel: { fontSize: 13, fontWeight: '600' },
  distRange: { fontSize: 10, marginTop: 1 },
  distBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distBarTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  distBarFill: { height: 6, borderRadius: 3 },
  distPct: { fontSize: 12, fontWeight: '700', width: 38, textAlign: 'right' },

  tableHeader: { flexDirection: 'row', paddingHorizontal: space.md, paddingVertical: 10, borderBottomWidth: 1 },
  tableHead: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  tableRow: { flexDirection: 'row', paddingHorizontal: space.md, paddingVertical: 10, borderBottomWidth: 1 },
  tableCell: { fontSize: 12 },

  overallBadge: { borderRadius: radius.xl, borderWidth: 1.5, padding: space.xl, alignItems: 'center', gap: 6, marginBottom: space.md, shadowColor: '#000' },
  overallIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  overallResult: { fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  overallSub: { fontSize: 13 },

  checkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  checkLabel: { fontSize: 14, fontWeight: '700', flex: 1 },
  checkPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  checkPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  checkMeta: { fontSize: 12, marginBottom: 8 },
  checkBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkBarTrack: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  checkBarFill: { height: 5, borderRadius: 3 },
  checkPct: { fontSize: 11, width: 38, textAlign: 'right' },
});
