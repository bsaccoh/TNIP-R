import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAnalysis, getCompliance } from '@/api/drivetest';
import { rsrpLabel, rsrpColor } from '@/utils/signalColor';
import { useTheme, palette, shadow, radius, space } from '@/theme';

const DIST_BANDS = [
  { label: 'Excellent', range: '≥ −80 dBm',   key: 'rsrp_excellent', color: palette.success },
  { label: 'Good',      range: '−90 to −80',   key: 'rsrp_good',      color: palette.successLight },
  { label: 'Fair',      range: '−100 to −90',  key: 'rsrp_fair',      color: palette.warning },
  { label: 'Poor',      range: '−110 to −100', key: 'rsrp_poor',      color: palette.error },
  { label: 'No Signal', range: '< −110 dBm',   key: 'rsrp_no_signal', color: '#78909C' },
];

function StatRow({ label, value, color, t }: {
  label: string; value: string; color?: string; t: ReturnType<typeof useTheme>;
}) {
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

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();

  const [analysis, setAnalysis] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (!id) return;
    Promise.all([getAnalysis(Number(id)), getCompliance(Number(id))])
      .then(([a, c]) => { setAnalysis(a); setCompliance(c); })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        Animated.parallel([
          Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
        ]).start();
      });
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: t.bg }]}>
        <StatusBar barStyle={t.isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={[styles.loadingText, { color: t.textSub }]}>Computing results…</Text>
      </View>
    );
  }

  const s = analysis?.stats;
  const m = analysis?.meta;
  const overallResult: string = compliance?.overall_result || 'UNKNOWN';
  const resultColor =
    overallResult === 'PASS'     ? palette.success :
    overallResult === 'MARGINAL' ? palette.warning : palette.error;
  const resultIcon =
    overallResult === 'PASS'     ? 'checkmark-circle' :
    overallResult === 'MARGINAL' ? 'warning'          : 'close-circle';
  const passedChecks = compliance?.checks?.filter((c: any) => c.pass).length ?? 0;
  const totalChecks  = compliance?.checks?.length ?? 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor={resultColor} />

      {/* ── Hero ── */}
      <View style={[styles.hero, { backgroundColor: resultColor }]}>
        {/* Decorative glow */}
        <View style={styles.heroGlow} />

        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <View style={[styles.heroIconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name={resultIcon} size={52} color="#fff" />
          </View>
        </Animated.View>

        <Text style={styles.heroLabel}>Test Complete</Text>
        <Text style={styles.heroTestName} numberOfLines={2}>{m?.test_name || 'Drive Test'}</Text>

        <View style={styles.heroMeta}>
          {m?.operator_name && (
            <View style={styles.heroPill}>
              <Ionicons name="business-outline" size={11} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroPillText}>{m.operator_name}</Text>
            </View>
          )}
          {m?.technology && (
            <View style={styles.heroPill}>
              <Ionicons name="cellular-outline" size={11} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroPillText}>{m.technology}</Text>
            </View>
          )}
          {m?.test_date && (
            <View style={styles.heroPill}>
              <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroPillText}>{m.test_date}</Text>
            </View>
          )}
        </View>
      </View>

      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* ── Compliance result badge ── */}
        {compliance && (
          <View style={[styles.complianceBadge, { backgroundColor: resultColor + '10', borderColor: resultColor + '40' }, shadow.sm]}>
            <View style={[styles.complianceLeft, { borderRightColor: resultColor + '30' }]}>
              <Text style={[styles.complianceResult, { color: resultColor }]}>{overallResult}</Text>
              <Text style={[styles.complianceSub, { color: t.textMuted }]}>Overall result</Text>
            </View>
            <View style={styles.complianceRight}>
              <Text style={[styles.complianceCount, { color: resultColor }]}>{passedChecks}/{totalChecks}</Text>
              <Text style={[styles.complianceSub, { color: t.textMuted }]}>Thresholds passed</Text>
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: space.lg }}>

          {/* ── Quick stats row ── */}
          <View style={styles.quickRow}>
            {[
              { icon: 'location-outline', label: 'Distance', value: `${Number(m?.distance_km || 0).toFixed(2)} km` },
              { icon: 'time-outline',     label: 'Duration', value: `${m?.duration_min || 0} min` },
              { icon: 'pulse-outline',    label: 'Samples',  value: String(s?.total_samples || 0) },
            ].map(({ icon, label, value }) => (
              <View key={label} style={[styles.quickCard, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
                <Ionicons name={icon as any} size={18} color={palette.primary} />
                <Text style={[styles.quickValue, { color: t.text }]}>{value}</Text>
                <Text style={[styles.quickLabel, { color: t.textMuted }]}>{label}</Text>
              </View>
            ))}
          </View>

          {/* ── Signal quality ── */}
          <Text style={[styles.sectionTitle, { color: t.text }]}>Signal Quality</Text>
          <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
            <StatRow label="Avg RSRP" value={s?.avg_rsrp != null ? `${s.avg_rsrp} dBm` : '—'} color={rsrpColor(s?.avg_rsrp)} t={t} />
            <StatRow label="Coverage Quality" value={rsrpLabel(s?.avg_rsrp)} color={rsrpColor(s?.avg_rsrp)} t={t} />
            <StatRow label="Min RSRP" value={s?.min_rsrp != null ? `${s.min_rsrp} dBm` : '—'} color={rsrpColor(s?.min_rsrp)} t={t} />
            <StatRow label="Avg RSRQ" value={s?.avg_rsrq != null ? `${s.avg_rsrq} dB` : '—'} t={t} />
            <StatRow label="Avg SINR" value={s?.avg_sinr != null ? `${s.avg_sinr} dB` : '—'} t={t} />
            <StatRow label="Avg DL" value={s?.avg_dl != null ? `${(s.avg_dl / 1000).toFixed(1)} Mbps` : '—'} t={t} />
            <StatRow label="Max DL" value={s?.max_dl != null ? `${(s.max_dl / 1000).toFixed(1)} Mbps` : '—'} t={t} />
          </View>

          {/* ── RSRP distribution ── */}
          {s && (
            <>
              <Text style={[styles.sectionTitle, { color: t.text }]}>Coverage Breakdown</Text>
              <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
                {DIST_BANDS.map(({ label, range, key, color }) => {
                  const count = s[key] || 0;
                  const pct = s.total_samples > 0 ? (count / s.total_samples) * 100 : 0;
                  return (
                    <View key={key} style={styles.distRow}>
                      <View style={styles.distTop}>
                        <View style={styles.distLabelRow}>
                          <View style={[styles.distDot, { backgroundColor: color }]} />
                          <View>
                            <Text style={[styles.distLabel, { color: t.text }]}>{label}</Text>
                            <Text style={[styles.distRange, { color: t.textMuted }]}>{range}</Text>
                          </View>
                        </View>
                        <Text style={[styles.distPct, { color }]}>{pct.toFixed(1)}%</Text>
                      </View>
                      <View style={[styles.distTrack, { backgroundColor: t.border }]}>
                        <View style={[styles.distFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: color }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* ── Compliance checks ── */}
          {compliance?.checks?.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: t.text }]}>Compliance Checks</Text>
              <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
                {compliance.checks.map((chk: any, i: number) => (
                  <View key={i} style={[styles.checkRow, i < compliance.checks.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.border }]}>
                    <View style={[styles.checkIcon, { backgroundColor: (chk.pass ? palette.success : palette.error) + '14' }]}>
                      <Ionicons name={chk.pass ? 'checkmark' : 'close'} size={14} color={chk.pass ? palette.success : palette.error} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.checkLabel, { color: t.text }]}>{chk.label || chk.metric}</Text>
                      <Text style={[styles.checkMeta, { color: t.textMuted }]}>
                        {chk.actual ?? '—'} · Required: {chk.threshold}
                      </Text>
                    </View>
                    <Text style={[styles.checkResult, { color: chk.pass ? palette.success : palette.error }]}>
                      {chk.pass ? 'PASS' : 'FAIL'}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ── Actions ── */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: palette.primary }]}
            onPress={() => router.push(`/tests/${id}` as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="bar-chart-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>View Full Report & Map</Text>
          </TouchableOpacity>

          <View style={styles.secondaryRow}>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}
              onPress={() => router.replace('/record/setup')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={16} color={palette.primary} />
              <Text style={[styles.secondaryBtnText, { color: palette.primary }]}>New Test</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}
              onPress={() => router.replace('/(tabs)')}
              activeOpacity={0.8}
            >
              <Ionicons name="home-outline" size={16} color={t.textSub} />
              <Text style={[styles.secondaryBtnText, { color: t.textSub }]}>Dashboard</Text>
            </TouchableOpacity>
          </View>

        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.sm },
  loadingText: { fontSize: 14, marginTop: 8 },

  hero: {
    paddingTop: 64, paddingBottom: 36, paddingHorizontal: space.xl,
    alignItems: 'center', overflow: 'hidden', position: 'relative',
  },
  heroGlow: {
    position: 'absolute', top: -80, right: -80,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroIconWrap: {
    width: 96, height: 96, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: space.lg,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
  heroTestName: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: space.lg },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  heroPillText: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '500' },

  complianceBadge: {
    flexDirection: 'row', marginHorizontal: space.lg, marginTop: space.lg,
    borderRadius: radius.xl, borderWidth: 1.5, overflow: 'hidden', shadowColor: '#000',
  },
  complianceLeft: { flex: 1, alignItems: 'center', padding: space.lg, borderRightWidth: 1 },
  complianceRight: { flex: 1, alignItems: 'center', padding: space.lg },
  complianceResult: { fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  complianceCount: { fontSize: 22, fontWeight: '800' },
  complianceSub: { fontSize: 11, marginTop: 3 },

  quickRow: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  quickCard: { flex: 1, borderRadius: radius.md, borderWidth: 1, padding: 12, alignItems: 'center', gap: 4, shadowColor: '#000' },
  quickValue: { fontSize: 15, fontWeight: '800' },
  quickLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },

  sectionTitle: { fontSize: 15, fontWeight: '800', marginTop: space.xl, marginBottom: space.sm },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space.md, marginBottom: 4, shadowColor: '#000' },

  distRow: { paddingVertical: 8 },
  distTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  distLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  distDot: { width: 8, height: 8, borderRadius: 4 },
  distLabel: { fontSize: 13, fontWeight: '600' },
  distRange: { fontSize: 10, marginTop: 1 },
  distPct: { fontSize: 13, fontWeight: '800' },
  distTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  distFill: { height: 6, borderRadius: 3 },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 12 },
  checkIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { fontSize: 13, fontWeight: '600' },
  checkMeta: { fontSize: 11, marginTop: 2 },
  checkResult: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
    borderRadius: radius.lg, padding: 17, marginTop: space.xl,
    shadowColor: palette.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  secondaryRow: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: radius.md, padding: 14, borderWidth: 1, shadowColor: '#000',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },
});
