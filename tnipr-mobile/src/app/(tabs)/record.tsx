import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRecording } from '@/context/RecordingContext';
import { useTheme, palette, shadow, radius, space } from '@/theme';

export default function RecordTab() {
  const router = useRouter();
  const { session } = useRecording();
  const t = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

      {/* Page title */}
      <View style={styles.pageHeader}>
        <Text style={[styles.title, { color: t.text }]}>Drive Test</Text>
        <Text style={[styles.subtitle, { color: t.textSub }]}>Record or upload signal measurements</Text>
      </View>

      {/* Active session banner */}
      {session && (
        <TouchableOpacity
          style={[styles.activeBanner, { backgroundColor: palette.error + '12', borderColor: palette.error + '50' }]}
          onPress={() => router.push('/record/active')}
          activeOpacity={0.8}
        >
          <View style={[styles.pulseDot, { backgroundColor: palette.error }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.activeTitle, { color: palette.error }]}>Recording in progress</Text>
            <Text style={[styles.activeSub, { color: palette.error + 'AA' }]}>Test #{session.testId} · {session.samples.length} samples collected</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.error} />
        </TouchableOpacity>
      )}

      {/* Main action */}
      <TouchableOpacity
        style={[styles.primaryCard, { backgroundColor: palette.primaryDark }]}
        onPress={() => router.push('/record/setup')}
        activeOpacity={0.85}
      >
        <View style={styles.primaryCardIcon}>
          <Ionicons name="radio-button-on" size={36} color="#fff" />
        </View>
        <Text style={styles.primaryCardTitle}>Start New Drive Test</Text>
        <Text style={styles.primaryCardSub}>Record live GPS + signal measurements</Text>
        <View style={styles.primaryCardArrow}>
          <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.7)" />
        </View>
      </TouchableOpacity>

      {/* Upload card */}
      <TouchableOpacity
        style={[styles.secondaryCard, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}
        onPress={() => router.push('/tests/upload')}
        activeOpacity={0.8}
      >
        <View style={[styles.secIcon, { backgroundColor: palette.primary + '15' }]}>
          <Ionicons name="cloud-upload-outline" size={24} color={palette.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.secTitle, { color: t.text }]}>Upload from File</Text>
          <Text style={[styles.secSub, { color: t.textSub }]}>Import Excel or CSV drive test data</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
      </TouchableOpacity>

      {/* Info cards */}
      <View style={styles.infoRow}>
        {[
          { icon: 'locate-outline', label: 'GPS Tracking', desc: 'Auto-captures route' },
          { icon: 'cellular-outline', label: 'Signal KPIs', desc: 'RSRP, SINR, DL' },
          { icon: 'cloud-done-outline', label: 'Auto Sync', desc: 'Batch upload every 10s' },
        ].map(({ icon, label, desc }) => (
          <View key={label} style={[styles.infoCard, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
            <Ionicons name={icon as any} size={20} color={palette.primary} />
            <Text style={[styles.infoLabel, { color: t.text }]}>{label}</Text>
            <Text style={[styles.infoDesc, { color: t.textSub }]}>{desc}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.lg, paddingTop: 56 },
  pageHeader: { marginBottom: space.xl },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: 0.2 },
  subtitle: { fontSize: 14, marginTop: 4 },
  activeBanner: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.lg, borderWidth: 1.5, padding: space.md, marginBottom: space.md },
  pulseDot: { width: 10, height: 10, borderRadius: 5 },
  activeTitle: { fontSize: 14, fontWeight: '700' },
  activeSub: { fontSize: 12, marginTop: 2 },
  primaryCard: { borderRadius: radius.xl, padding: space.xl, marginBottom: space.md, overflow: 'hidden' },
  primaryCardIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  primaryCardTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6 },
  primaryCardSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  primaryCardArrow: { position: 'absolute', right: space.lg, top: space.lg, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 8 },
  secondaryCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.lg, borderWidth: 1, padding: space.md, marginBottom: space.xl, shadowColor: '#000' },
  secIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  secTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  secSub: { fontSize: 13 },
  infoRow: { flexDirection: 'row', gap: space.sm },
  infoCard: { flex: 1, borderRadius: radius.md, borderWidth: 1, padding: space.md, alignItems: 'center', gap: 6, shadowColor: '#000' },
  infoLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  infoDesc: { fontSize: 11, textAlign: 'center' },
});
