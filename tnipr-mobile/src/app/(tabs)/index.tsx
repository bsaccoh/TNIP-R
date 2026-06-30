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

function StatCard({ icon, label, value, unit, color, bg }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string; unit?: string; color: string; bg: string;
}) {
  return (
    <View style={[styles.statCard, shadow.sm, { backgroundColor: bg, flex: 1 }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {unit && <Text style={[styles.statUnit, { color: color + 'AA' }]}>{unit}</Text>}
      <Text style={[styles.statLabel]}>{label}</Text>
    </View>
  );
}

function TestCard({ test, onPress, t }: { test: DriveTest; onPress: () => void; t: ReturnType<typeof useTheme> }) {
  const sc = test.status === 'COMPLETED' ? palette.success : test.status === 'RECORDING' ? palette.error : palette.warning;
  const techColor = TECH_COLORS[test.technology] || palette.primary;
  return (
    <TouchableOpacity style={[styles.testCard, shadow.sm, { backgroundColor: t.surface }]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.techPill, { backgroundColor: techColor + '18' }]}>
        <Text style={[styles.techText, { color: techColor }]}>{test.technology || '–'}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: space.md }}>
        <Text style={[styles.testName, { color: t.text }]} numberOfLines={1}>{test.test_name}</Text>
        <Text style={[styles.testMeta, { color: t.textSub }]}>{test.operator_name}</Text>
        <View style={styles.testFooter}>
          <Ionicons name="location-outline" size={11} color={t.textMuted} />
          <Text style={[styles.testFooterText, { color: t.textMuted }]}>{Number(test.distance_km || 0).toFixed(1)} km</Text>
          <Text style={[styles.testFooterDot, { color: t.textMuted }]}>·</Text>
          <Ionicons name="radio-button-on-outline" size={11} color={t.textMuted} />
          <Text style={[styles.testFooterText, { color: t.textMuted }]}>{test.total_samples} pts</Text>
          <Text style={[styles.testFooterDot, { color: t.textMuted }]}>·</Text>
          <Text style={[styles.testFooterText, { color: t.textMuted }]}>{test.test_date}</Text>
        </View>
      </View>
      <View style={[styles.statusPill, { backgroundColor: sc + '15' }]}>
        <View style={[styles.statusDot, { backgroundColor: sc }]} />
        <Text style={[styles.statusText, { color: sc }]}>{test.status}</Text>
      </View>
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

  const load = async () => {
    try {
      const [s, tests] = await Promise.all([getSummary(), listTests()]);
      setSummary(s);
      setRecent(tests.slice(0, 8));
    } catch {}
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const ov = summary?.overall ?? summary ?? {};
  const avgRsrp = ov.avg_rsrp ?? null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor={palette.primaryDark} />

      {/* Hero header */}
      <View style={[styles.hero, { backgroundColor: palette.primaryDark }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroGreeting}>Good {getTimeOfDay()}, {user?.fullName?.split(' ')[0] || 'Tester'}</Text>
            <Text style={styles.heroRole}>{user?.role?.replace(/_/g, ' ')}</Text>
          </View>
          <TouchableOpacity style={styles.heroFab} onPress={() => router.push('/record/setup')} activeOpacity={0.85}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Signal quality chip */}
        {avgRsrp !== null && (
          <View style={styles.signalChip}>
            <View style={[styles.signalDot, { backgroundColor: rsrpColor(avgRsrp) }]} />
            <Text style={styles.signalText}>Network avg: {rsrpLabel(avgRsrp)} ({avgRsrp} dBm)</Text>
          </View>
        )}
      </View>

      <View style={{ padding: space.lg }}>
        {/* Stats */}
        {summary ? (
          <>
            <View style={styles.statRow}>
              <StatCard icon="layers-outline" label="Total Tests" value={String(ov.total_tests ?? 0)} color={palette.primary} bg={t.surface} />
              <StatCard icon="cellular-outline" label="Avg RSRP" value={avgRsrp ?? 'N/A'} unit="dBm" color={rsrpColor(avgRsrp)} bg={t.surface} />
            </View>
            <View style={[styles.statRow, { marginTop: space.sm }]}>
              <StatCard icon="wifi-outline" label="Avg SINR" value={ov.avg_sinr ?? 'N/A'} unit="dB" color={palette.successLight} bg={t.surface} />
              <StatCard icon="speedometer-outline" label="Avg DL" value={ov.avg_dl ? (ov.avg_dl / 1000).toFixed(1) : 'N/A'} unit="Mbps" color={palette.warning} bg={t.surface} />
            </View>
          </>
        ) : (
          <View style={[styles.loadingBox, { backgroundColor: t.surface }, shadow.sm]}>
            <ActivityIndicator color={palette.primary} />
            <Text style={[styles.loadingText, { color: t.textSub }]}>Loading statistics…</Text>
          </View>
        )}

        {/* Recent tests */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Recent Tests</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/tests')}>
            <Text style={[styles.seeAll, { color: palette.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>

        {recent.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
            <Ionicons name="map-outline" size={40} color={t.textMuted} />
            <Text style={[styles.emptyTitle, { color: t.text }]}>No tests yet</Text>
            <Text style={[styles.emptyHint, { color: t.textSub }]}>Tap + to start your first drive test</Text>
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

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  hero: { paddingTop: 56, paddingHorizontal: space.lg, paddingBottom: space.xl },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroGreeting: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  heroRole: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  heroFab: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  signalChip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.lg, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  signalDot: { width: 8, height: 8, borderRadius: 4 },
  signalText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500' },
  statRow: { flexDirection: 'row', gap: space.sm },
  statCard: { borderRadius: radius.lg, padding: space.md, shadowColor: '#000' },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  statValue: { fontSize: 24, fontWeight: '800' },
  statUnit: { fontSize: 11, marginTop: -2 },
  statLabel: { fontSize: 11, color: '#94A3B8', marginTop: 4, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 },
  loadingBox: { borderRadius: radius.lg, padding: space.xl, alignItems: 'center', gap: space.sm, shadowColor: '#000' },
  loadingText: { fontSize: 13 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.xl, marginBottom: space.md },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 13, fontWeight: '600' },
  testCard: { borderRadius: radius.lg, padding: space.md, flexDirection: 'row', alignItems: 'center', marginBottom: space.sm, shadowColor: '#000' },
  techPill: { borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', minWidth: 42 },
  techText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  testName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  testMeta: { fontSize: 12, marginBottom: 4 },
  testFooter: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  testFooterText: { fontSize: 11 },
  testFooterDot: { fontSize: 11, marginHorizontal: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, marginLeft: space.sm },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  emptyBox: { borderRadius: radius.lg, padding: space.xxl, alignItems: 'center', gap: space.sm, borderWidth: 1, shadowColor: '#000' },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyHint: { fontSize: 13, textAlign: 'center' },
});
