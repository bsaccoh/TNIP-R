import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { getSummary, listTests, DriveTest } from '@/api/drivetest';
import { useTheme, palette, shadow, radius, space } from '@/theme';
import { rsrpColor, rsrpLabel } from '@/utils/signalColor';

const TECH_COLORS: Record<string, string> = {
  '4G': palette.primary, '5G': palette.purple,
  '3G': palette.warning, '2G': '#546E7A',
};

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function getDateLabel() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

// RSRP quality bar 0–100%
function rsrpPct(rsrp: number | null) {
  if (rsrp == null) return 0;
  return Math.max(0, Math.min(100, ((rsrp + 140) / 80) * 100));
}

function KpiCard({ icon, label, value, unit, color, t }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string | number; unit?: string; color: string;
  t: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={[kpi.card, { backgroundColor: t.surface }, shadow.sm]}>
      <View style={[kpi.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[kpi.value, { color }]}>{value}</Text>
      {unit && <Text style={[kpi.unit, { color: color + 'BB' }]}>{unit}</Text>}
      <Text style={[kpi.label, { color: t.textMuted }]}>{label}</Text>
    </View>
  );
}

const kpi = StyleSheet.create({
  card: { flex: 1, borderRadius: radius.lg, padding: 14, shadowColor: '#000' },
  iconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  value: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  unit: { fontSize: 11, marginTop: -1 },
  label: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 5 },
});

function TestCard({ test, onPress, t }: { test: DriveTest; onPress: () => void; t: ReturnType<typeof useTheme> }) {
  const sc = test.status === 'COMPLETED' ? palette.success : test.status === 'RECORDING' ? palette.error : palette.warning;
  const tc = TECH_COLORS[test.technology] || palette.primary;
  return (
    <TouchableOpacity style={[styles.testCard, { backgroundColor: t.surface }, shadow.sm]} onPress={onPress} activeOpacity={0.75}>
      {/* Left accent bar */}
      <View style={[styles.testAccent, { backgroundColor: tc }]} />

      <View style={{ flex: 1, paddingLeft: 12 }}>
        <View style={styles.testTopRow}>
          <View style={[styles.techChip, { backgroundColor: tc + '18' }]}>
            <Text style={[styles.techText, { color: tc }]}>{test.technology || '–'}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: sc + '14' }]}>
            <View style={[styles.statusDot, { backgroundColor: sc }]} />
            <Text style={[styles.statusText, { color: sc }]}>{test.status}</Text>
          </View>
        </View>

        <Text style={[styles.testName, { color: t.text }]} numberOfLines={1}>{test.test_name}</Text>
        <Text style={[styles.testOp, { color: t.textSub }]}>{test.operator_name}</Text>

        <View style={[styles.testMeta, { borderTopColor: t.border }]}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={11} color={t.textMuted} />
            <Text style={[styles.metaText, { color: t.textMuted }]}>{test.test_date}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={11} color={t.textMuted} />
            <Text style={[styles.metaText, { color: t.textMuted }]}>{Number(test.distance_km || 0).toFixed(1)} km</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="pulse-outline" size={11} color={t.textMuted} />
            <Text style={[styles.metaText, { color: t.textMuted }]}>{test.total_samples} pts</Text>
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={t.textMuted} style={{ marginLeft: 4, marginTop: 2 }} />
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const t = useTheme();
  const [summary, setSummary] = useState<any>(null);
  const [recent, setRecent] = useState<DriveTest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [s, tests] = await Promise.all([getSummary(), listTests()]);
      setSummary(s);
      setRecent(tests.slice(0, 6));
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const ov = summary?.overall ?? summary ?? {};
  const avgRsrp: number | null = ov.avg_rsrp ?? null;
  const initials = (user?.fullName || user?.email || '?').slice(0, 2).toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor={palette.primaryDark} />

      {/* ── HERO ── */}
      <View style={styles.hero}>
        {/* Decorative top-right glow */}
        <View style={styles.heroGlow} />

        {/* Top bar: avatar + date + bell */}
        <View style={styles.heroTopBar}>
          <TouchableOpacity style={styles.avatar} onPress={() => router.push('/(tabs)/settings')}>
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.heroDate}>{getDateLabel()}</Text>
            <Text style={styles.heroRole}>{user?.role?.replace(/_/g, ' ')}</Text>
          </View>
          <TouchableOpacity style={styles.heroBell}>
            <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <Text style={styles.heroGreeting}>Good {getTimeOfDay()},</Text>
        <Text style={styles.heroName}>{user?.fullName?.split(' ')[0] || 'Tester'} 👋</Text>

        {/* Signal health strip */}
        {avgRsrp !== null && (
          <View style={styles.signalStrip}>
            <View style={[styles.signalDot, { backgroundColor: rsrpColor(avgRsrp) }]} />
            <Text style={styles.signalStripText}>Network avg: {rsrpLabel(avgRsrp)}</Text>
            <Text style={styles.signalRsrp}>{avgRsrp} dBm</Text>
          </View>
        )}

        {/* RSRP bar */}
        {avgRsrp !== null && (
          <View style={styles.rsrpBarTrack}>
            <View style={[styles.rsrpBarFill, { width: `${rsrpPct(avgRsrp)}%` as any, backgroundColor: rsrpColor(avgRsrp) }]} />
          </View>
        )}

        {/* Curved bottom cap */}
        <View style={styles.heroCurve} />
      </View>

      {/* ── QUICK ACTIONS ── */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionPrimary, { backgroundColor: palette.primary }]} onPress={() => router.push('/record/setup')} activeOpacity={0.85}>
          <View style={styles.actionIconCircle}>
            <Ionicons name="radio-button-on" size={20} color={palette.primary} />
          </View>
          <Text style={styles.actionPrimaryText}>New Drive Test</Text>
          <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionSecondary, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]} onPress={() => router.push('/tests/upload')} activeOpacity={0.85}>
          <Ionicons name="cloud-upload-outline" size={22} color={palette.primary} />
          <Text style={[styles.actionSecondaryText, { color: t.text }]}>Upload</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: space.lg }}>
        {/* ── KPI GRID ── */}
        {loading ? (
          <View style={[styles.loadBox, { backgroundColor: t.surface }, shadow.sm]}>
            <ActivityIndicator color={palette.primary} size="small" />
            <Text style={[{ color: t.textSub, fontSize: 13, marginTop: 8 }]}>Loading statistics…</Text>
          </View>
        ) : summary ? (
          <>
            <View style={styles.kpiRow}>
              <KpiCard icon="layers-outline" label="Total Tests" value={ov.total_tests ?? 0} color={palette.primary} t={t} />
              <View style={{ width: space.sm }} />
              <KpiCard icon="cellular-outline" label="Avg RSRP" value={avgRsrp ?? '—'} unit="dBm" color={rsrpColor(avgRsrp)} t={t} />
            </View>
            <View style={[styles.kpiRow, { marginTop: space.sm }]}>
              <KpiCard icon="wifi-outline" label="Avg SINR" value={ov.avg_sinr ?? '—'} unit="dB" color={palette.successLight} t={t} />
              <View style={{ width: space.sm }} />
              <KpiCard icon="speedometer-outline" label="Avg DL" value={ov.avg_dl ? (ov.avg_dl / 1000).toFixed(1) : '—'} unit="Mbps" color={palette.warning} t={t} />
            </View>

            {/* Per-operator summary */}
            {summary?.perOperator?.length > 0 && (
              <View style={[styles.opCard, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
                <Text style={[styles.opCardTitle, { color: t.text }]}>Coverage by Operator</Text>
                {summary.perOperator.map((op: any) => (
                  <View key={op.operator_name} style={styles.opRow}>
                    <Text style={[styles.opName, { color: t.textSub }]}>{op.operator_name}</Text>
                    <View style={[styles.opBar, { backgroundColor: t.border }]}>
                      <View style={[styles.opBarFill, {
                        width: `${Math.min(100, ((op.total_tests || 0) / (ov.total_tests || 1)) * 100)}%` as any,
                        backgroundColor: palette.primary,
                      }]} />
                    </View>
                    <Text style={[styles.opCount, { color: palette.primary }]}>{op.total_tests}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : null}

        {/* ── RECENT TESTS ── */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: t.text }]}>Recent Tests</Text>
            <Text style={[styles.sectionSub, { color: t.textMuted }]}>Latest drive test sessions</Text>
          </View>
          <TouchableOpacity style={[styles.seeAllBtn, { borderColor: palette.primary + '40', backgroundColor: palette.primary + '0C' }]} onPress={() => router.push('/(tabs)/tests')}>
            <Text style={[styles.seeAllText, { color: palette.primary }]}>See all</Text>
            <Ionicons name="chevron-forward" size={13} color={palette.primary} />
          </TouchableOpacity>
        </View>

        {recent.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
            <View style={[styles.emptyIcon, { backgroundColor: palette.primary + '12' }]}>
              <Ionicons name="map-outline" size={32} color={palette.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: t.text }]}>No tests yet</Text>
            <Text style={[styles.emptyHint, { color: t.textSub }]}>Start a drive test or upload a file to see your data here</Text>
            <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: palette.primary }]} onPress={() => router.push('/record/setup')}>
              <Text style={styles.emptyBtnText}>Start Drive Test</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recent.map((test) => (
            <TestCard key={test.drive_test_id} test={test} t={t}
              onPress={() => router.push(`/tests/${test.drive_test_id}` as any)} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // ── Hero ──
  hero: {
    backgroundColor: palette.primaryDark,
    paddingTop: 56,
    paddingHorizontal: space.lg,
    paddingBottom: 32,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroTopBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  heroDate: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: '500' },
  heroRole: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', marginTop: 1 },
  heroBell: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroGreeting: { color: 'rgba(255,255,255,0.65)', fontSize: 15, fontWeight: '500' },
  heroName: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 0.2, marginTop: 2, marginBottom: 16 },
  signalStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    alignSelf: 'flex-start', marginBottom: 10,
  },
  signalDot: { width: 8, height: 8, borderRadius: 4 },
  signalStripText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500' },
  signalRsrp: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginLeft: 2 },
  rsrpBarTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, marginTop: 4 },
  rsrpBarFill: { height: 4, borderRadius: 2 },
  heroCurve: {
    position: 'absolute', bottom: -20, left: -20, right: -20,
    height: 40, backgroundColor: 'transparent',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },

  // ── Quick actions ──
  actionsRow: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, marginTop: space.lg, marginBottom: space.lg },
  actionPrimary: {
    flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: radius.lg, padding: space.md,
    shadowColor: palette.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  actionIconCircle: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  actionPrimaryText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '700' },
  actionSecondary: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4,
    borderRadius: radius.lg, padding: space.md, borderWidth: 1, shadowColor: '#000',
  },
  actionSecondaryText: { fontSize: 12, fontWeight: '700' },

  // ── KPI grid ──
  kpiRow: { flexDirection: 'row' },
  loadBox: { borderRadius: radius.lg, padding: space.xl, alignItems: 'center', shadowColor: '#000', marginBottom: space.md },

  // ── Operator card ──
  opCard: { borderRadius: radius.lg, padding: space.md, borderWidth: 1, marginTop: space.md, marginBottom: 4, shadowColor: '#000' },
  opCardTitle: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  opRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  opName: { fontSize: 12, width: 80 },
  opBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  opBarFill: { height: 6, borderRadius: 3 },
  opCount: { fontSize: 12, fontWeight: '700', width: 24, textAlign: 'right' },

  // ── Section header ──
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.xl, marginBottom: space.md },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  sectionSub: { fontSize: 11, marginTop: 2 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  seeAllText: { fontSize: 12, fontWeight: '600' },

  // ── Test card ──
  testCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, marginBottom: space.sm,
    overflow: 'hidden', shadowColor: '#000',
    paddingRight: space.md, paddingVertical: 0,
  },
  testAccent: { width: 4, alignSelf: 'stretch' },
  testTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, marginTop: 12 },
  techChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  techText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  testName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  testOp: { fontSize: 12, marginBottom: 8 },
  testMeta: { flexDirection: 'row', gap: space.md, paddingTop: 8, paddingBottom: 12, borderTopWidth: 1 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11 },

  // ── Empty state ──
  emptyBox: { borderRadius: radius.xl, padding: space.xxl, alignItems: 'center', gap: space.sm, borderWidth: 1, shadowColor: '#000' },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { borderRadius: radius.md, paddingHorizontal: 24, paddingVertical: 11, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
