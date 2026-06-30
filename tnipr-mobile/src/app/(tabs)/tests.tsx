import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, TextInput, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listTests, DriveTest } from '@/api/drivetest';
import { useTheme, palette, shadow, radius, space } from '@/theme';

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: palette.success,
  RECORDING: palette.error,
  PENDING: palette.warning,
};

const TECH_COLOR: Record<string, string> = {
  '4G': palette.primary, '5G': palette.purple,
  '3G': palette.warning, '2G': '#546E7A',
};

const FILTERS = ['All', 'COMPLETED', 'RECORDING', 'PENDING'];

export default function TestsScreen() {
  const router = useRouter();
  const t = useTheme();
  const [tests, setTests] = useState<DriveTest[]>([]);
  const [filtered, setFiltered] = useState<DriveTest[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await listTests();
      setTests(data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let result = tests;
    if (filter !== 'All') result = result.filter((t) => t.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        t.test_name.toLowerCase().includes(q) ||
        t.operator_name?.toLowerCase().includes(q) ||
        t.technology?.toLowerCase().includes(q),
      );
    }
    setFiltered(result);
  }, [search, filter, tests]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const renderItem = ({ item }: { item: DriveTest }) => {
    const sc = STATUS_COLOR[item.status] || palette.warning;
    const tc = TECH_COLOR[item.technology] || palette.primary;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: t.surface, shadowColor: t.shadow }, shadow.sm]}
        onPress={() => router.push(`/tests/${item.drive_test_id}` as any)}
        activeOpacity={0.75}
      >
        <View style={styles.cardTop}>
          <View style={[styles.techBadge, { backgroundColor: tc + '18' }]}>
            <Text style={[styles.techText, { color: tc }]}>{item.technology || '–'}</Text>
          </View>
          <Text style={[styles.testName, { color: t.text }]} numberOfLines={1}>{item.test_name}</Text>
          <View style={[styles.statusPill, { backgroundColor: sc + '15' }]}>
            <View style={[styles.dot, { backgroundColor: sc }]} />
            <Text style={[styles.statusText, { color: sc }]}>{item.status}</Text>
          </View>
        </View>

        <Text style={[styles.operatorText, { color: t.textSub }]}>{item.operator_name}</Text>

        <View style={[styles.divider, { backgroundColor: t.border }]} />

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={t.textMuted} />
            <Text style={[styles.metaText, { color: t.textMuted }]}>{item.test_date}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={13} color={t.textMuted} />
            <Text style={[styles.metaText, { color: t.textMuted }]}>{Number(item.distance_km || 0).toFixed(1)} km</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="radio-button-on-outline" size={13} color={t.textMuted} />
            <Text style={[styles.metaText, { color: t.textMuted }]}>{item.total_samples} pts</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={t.textMuted} style={{ marginLeft: 'auto' }} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: t.bg }]}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={[styles.loadingText, { color: t.textSub }]}>Loading tests…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.bg }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: t.text }]}>My Tests</Text>
          <TouchableOpacity
            style={[styles.uploadBtn, { backgroundColor: palette.primary + '15', borderColor: palette.primary + '40' }]}
            onPress={() => router.push('/tests/upload')}
          >
            <Ionicons name="cloud-upload-outline" size={16} color={palette.primary} />
            <Text style={[styles.uploadBtnText, { color: palette.primary }]}>Upload</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
          <Ionicons name="search-outline" size={18} color={t.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: t.text }]}
            placeholder="Search tests, operators…"
            placeholderTextColor={t.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={t.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f;
            const color = f === 'All' ? palette.primary : STATUS_COLOR[f] || palette.primary;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.chip, { backgroundColor: active ? color : t.surface, borderColor: active ? color : t.border }, shadow.sm]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.chipText, { color: active ? '#fff' : t.textSub }]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => String(i.drive_test_id)}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
        contentContainerStyle={{ padding: space.lg, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={[styles.emptyBox, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
            <Ionicons name="map-outline" size={44} color={t.textMuted} />
            <Text style={[styles.emptyTitle, { color: t.text }]}>{search || filter !== 'All' ? 'No matching tests' : 'No tests yet'}</Text>
            <Text style={[styles.emptyHint, { color: t.textSub }]}>
              {search || filter !== 'All' ? 'Try a different search or filter' : 'Upload a file or start a new drive test'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.sm },
  loadingText: { fontSize: 14 },
  header: { paddingTop: 56, paddingHorizontal: space.lg, paddingBottom: space.sm },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  title: { fontSize: 26, fontWeight: '800' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  uploadBtnText: { fontSize: 13, fontWeight: '600' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.md, borderWidth: 1, paddingHorizontal: space.md, paddingVertical: 10, marginBottom: space.sm, shadowColor: '#000' },
  searchInput: { flex: 1, fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: space.sm, paddingBottom: space.sm },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, shadowColor: '#000' },
  chipText: { fontSize: 12, fontWeight: '600' },
  card: { borderRadius: radius.lg, padding: space.md, marginBottom: space.sm, shadowColor: '#000' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: 6 },
  techBadge: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  techText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  testName: { flex: 1, fontSize: 14, fontWeight: '700' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  operatorText: { fontSize: 13, marginBottom: space.sm },
  divider: { height: 1, marginBottom: space.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  emptyBox: { borderRadius: radius.lg, padding: space.xxl, alignItems: 'center', gap: space.sm, borderWidth: 1, shadowColor: '#000', marginTop: space.xl },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyHint: { fontSize: 13, textAlign: 'center' },
});
