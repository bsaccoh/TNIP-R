import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/hooks/useRole';
import { useRecording } from '@/context/RecordingContext';
import { createLiveTest, getOperators } from '@/api/drivetest';
import { useTheme, palette, shadow, radius, space } from '@/theme';
import { useServerStatus } from '@/hooks/useServerStatus';

const TECHS = [
  { label: '2G', color: '#546E7A' },
  { label: '3G', color: palette.warning },
  { label: '4G', color: palette.primary },
  { label: '5G', color: palette.purple },
];

const ROUTE_TYPES = [
  { label: 'Urban',    icon: 'business-outline'   as const },
  { label: 'Suburban', icon: 'home-outline'        as const },
  { label: 'Rural',    icon: 'leaf-outline'        as const },
  { label: 'Highway',  icon: 'speedometer-outline' as const },
];

function SectionLabel({ children }: { children: string }) {
  const t = useTheme();
  return <Text style={[s.sectionLabel, { color: t.textMuted }]}>{children}</Text>;
}

export default function SetupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const { startSession } = useRecording();
  const t = useTheme();

  const [operators, setOperators] = useState<{ operator_id: number; operator_name: string }[]>([]);
  const [operatorId, setOperatorId] = useState<number | null>(user?.operatorId ?? null);
  const [testName, setTestName] = useState('');
  const [technology, setTechnology] = useState('4G');
  const [routeType, setRouteType] = useState('urban');
  const [deviceModel, setDeviceModel] = useState('');
  const [testerName, setTesterName] = useState(user?.fullName || '');
  const [notes, setNotes] = useState('');
  const [starting, setStarting] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const { status: serverStatus, latency, recheck } = useServerStatus(30_000);

  useEffect(() => {
    getOperators().then((ops) => {
      if (Array.isArray(ops)) {
        setOperators(ops);
        if (!operatorId && ops.length) setOperatorId(ops[0].operator_id);
      }
    }).catch(() => {});
  }, []);

  const start = async () => {
    if (!testName.trim()) { Alert.alert('Required', 'Please enter a test name.'); return; }
    if (!operatorId) { Alert.alert('Required', 'Please select an operator.'); return; }
    setStarting(true);
    try {
      const result = await createLiveTest({
        operator_id: operatorId,
        test_name: testName.trim(),
        test_date: new Date().toISOString().slice(0, 10),
        route_type: routeType.toLowerCase(),
        technology,
        device_model: deviceModel.trim() || undefined,
        tester_name: testerName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      startSession(result.drive_test_id);
      router.replace('/record/active');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message || 'Failed to start test. Check connection.');
      setStarting(false);
    }
  };

  const inputStyle = (name: string) => [
    s.input,
    {
      backgroundColor: t.inputBg,
      borderColor: focused === name ? palette.primary : t.border,
      borderWidth: focused === name ? 1.5 : 1,
      color: t.text,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={palette.primaryDark} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: palette.primaryDark }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>New Drive Test</Text>
          <Text style={s.headerSub}>Configure before recording</Text>
        </View>
        <TouchableOpacity style={s.serverPill} onPress={recheck} activeOpacity={0.7}>
          <View style={[s.serverDot, {
            backgroundColor:
              serverStatus === 'online'   ? '#69F0AE' :
              serverStatus === 'offline'  ? '#FF5252' :
              serverStatus === 'checking' ? '#FFD740' : '#78909C',
          }]} />
          <Text style={s.serverPillText}>
            {serverStatus === 'online'   ? (latency != null ? `${latency}ms` : 'Online') :
             serverStatus === 'offline'  ? 'Offline' :
             serverStatus === 'checking' ? '…' : 'No URL'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* Test Identity */}
        <SectionLabel>TEST IDENTITY</SectionLabel>
        <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
          <Text style={[s.fieldLabel, { color: t.textSub }]}>Test Name *</Text>
          <TextInput
            style={inputStyle('name')}
            value={testName}
            onChangeText={setTestName}
            placeholder="e.g. Freetown Urban 4G – Morning"
            placeholderTextColor={t.textMuted}
            onFocus={() => setFocused('name')}
            onBlur={() => setFocused(null)}
          />

          <Text style={[s.fieldLabel, { color: t.textSub }]}>
            Operator *{!isAdmin && <Text style={{ color: t.textMuted, fontWeight: '400' }}> (locked to your account)</Text>}
          </Text>
          {isAdmin ? (
            <View style={s.operatorGrid}>
              {operators.length > 0 ? (
                operators.map((o) => {
                  const active = operatorId === o.operator_id;
                  return (
                    <TouchableOpacity
                      key={o.operator_id}
                      style={[
                        s.operatorChip,
                        {
                          borderColor: active ? palette.primary : t.border,
                          backgroundColor: active ? palette.primary + '10' : t.surface,
                        },
                        shadow.sm,
                      ]}
                      onPress={() => setOperatorId(o.operator_id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.operatorChipText, { color: active ? palette.primary : t.textSub, fontWeight: active ? '800' : '600' }]}>
                        {o.operator_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={{ color: t.textMuted, fontSize: 13, paddingVertical: 8 }}>
                  No operators loaded. Check server connection.
                </Text>
              )}
            </View>
          ) : (
            <View style={[s.lockedField, { borderColor: t.border, backgroundColor: t.inputBg }]}>
              <Ionicons name="lock-closed-outline" size={14} color={t.textMuted} />
              <Text style={[s.lockedText, { color: t.text }]}>
                {operators.find((o) => o.operator_id === operatorId)?.operator_name ?? 'Your operator'}
              </Text>
            </View>
          )}
        </View>

        {/* Technology */}
        <SectionLabel>TECHNOLOGY</SectionLabel>
        <View style={s.techRow}>
          {TECHS.map(({ label, color }) => {
            const active = technology === label;
            return (
              <TouchableOpacity
                key={label}
                style={[s.techChip, { borderColor: active ? color : t.border, backgroundColor: active ? color : t.surface }, shadow.sm]}
                onPress={() => setTechnology(label)}
                activeOpacity={0.8}
              >
                <Text style={[s.techChipText, { color: active ? '#fff' : t.textSub }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Route Type */}
        <SectionLabel>ROUTE TYPE</SectionLabel>
        <View style={s.routeGrid}>
          {ROUTE_TYPES.map(({ label, icon }) => {
            const active = routeType === label.toLowerCase();
            return (
              <TouchableOpacity
                key={label}
                style={[s.routeChip, { borderColor: active ? palette.primary : t.border, backgroundColor: active ? palette.primary + '10' : t.surface }, shadow.sm]}
                onPress={() => setRouteType(label.toLowerCase())}
                activeOpacity={0.8}
              >
                <Ionicons name={icon} size={18} color={active ? palette.primary : t.textMuted} />
                <Text style={[s.routeChipText, { color: active ? palette.primary : t.textSub }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Additional Info */}
        <SectionLabel>ADDITIONAL INFO</SectionLabel>
        <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
          <Text style={[s.fieldLabel, { color: t.textSub }]}>Tester Name</Text>
          <TextInput
            style={inputStyle('tester')}
            value={testerName}
            onChangeText={setTesterName}
            placeholder="Your name"
            placeholderTextColor={t.textMuted}
            onFocus={() => setFocused('tester')}
            onBlur={() => setFocused(null)}
          />

          <Text style={[s.fieldLabel, { color: t.textSub }]}>Device Model</Text>
          <TextInput
            style={inputStyle('device')}
            value={deviceModel}
            onChangeText={setDeviceModel}
            placeholder="e.g. Samsung Galaxy S24"
            placeholderTextColor={t.textMuted}
            onFocus={() => setFocused('device')}
            onBlur={() => setFocused(null)}
          />

          <Text style={[s.fieldLabel, { color: t.textSub }]}>Notes</Text>
          <TextInput
            style={[inputStyle('notes'), { height: 80, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes about this test…"
            placeholderTextColor={t.textMuted}
            multiline
            onFocus={() => setFocused('notes')}
            onBlur={() => setFocused(null)}
          />
        </View>

        {/* Offline warning */}
        {serverStatus === 'offline' && (
          <TouchableOpacity style={s.offlineWarning} onPress={recheck} activeOpacity={0.8}>
            <Ionicons name="cloud-offline-outline" size={16} color="#C62828" />
            <Text style={s.offlineWarningText}>Server unreachable — samples will queue offline. Tap to retry.</Text>
          </TouchableOpacity>
        )}
        {serverStatus === 'unknown' && (
          <View style={s.offlineWarning}>
            <Ionicons name="warning-outline" size={16} color="#F57C00" />
            <Text style={s.offlineWarningText}>No server URL configured. Go to Settings to set one.</Text>
          </View>
        )}

        {/* Start button */}
        <TouchableOpacity
          style={[s.startBtn, { backgroundColor: serverStatus === 'offline' ? '#B71C1C' : palette.primary, opacity: starting ? 0.75 : 1 }]}
          onPress={start}
          disabled={starting}
          activeOpacity={0.85}
        >
          {starting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={serverStatus === 'offline' ? 'cloud-offline-outline' : 'radio-button-on'} size={20} color="#fff" />
              <Text style={s.startBtnText}>{serverStatus === 'offline' ? 'Start Offline' : 'Start Recording'}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingTop: 52, paddingBottom: space.lg, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 1 },
  lockedField: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: radius.sm, padding: 12, opacity: 0.7 },
  lockedText: { fontSize: 14 },
  serverPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  serverDot: { width: 8, height: 8, borderRadius: 4 },
  serverPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  offlineWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFEBEE', borderRadius: radius.md, padding: 12, marginTop: space.md, borderWidth: 1, borderColor: '#FFCDD2' },
  offlineWarningText: { flex: 1, fontSize: 12, color: '#C62828', lineHeight: 17 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: space.sm, marginTop: space.lg },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space.md, shadowColor: '#000' },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: { borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, marginBottom: 4 },
  operatorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: 4 },
  operatorChip: { width: '47%', borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', shadowColor: '#000' },
  operatorChipText: { fontSize: 13 },

  techRow: { flexDirection: 'row', gap: space.sm },
  techChip: { flex: 1, borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000' },
  techChipText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },

  routeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  routeChip: { width: '47%', borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', gap: 6, shadowColor: '#000' },
  routeChipText: { fontSize: 13, fontWeight: '600' },

  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
    borderRadius: radius.lg, padding: 17, marginTop: space.xl,
    shadowColor: palette.primary, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
