import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import client from '@/api/client';
import { getOperators } from '@/api/drivetest';
import { useAuth } from '@/context/AuthContext';
import { useTheme, palette, shadow, radius, space } from '@/theme';

const TECHS = [
  { label: '2G', color: '#546E7A' },
  { label: '3G', color: palette.warning },
  { label: '4G', color: palette.primary },
  { label: '5G', color: palette.purple },
];
const ROUTE_TYPES = ['Urban', 'Suburban', 'Rural', 'Highway'];

function SectionLabel({ children }: { children: string }) {
  const t = useTheme();
  return <Text style={[s.sectionLabel, { color: t.textMuted }]}>{children}</Text>;
}

export default function UploadScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const t = useTheme();

  const [operators, setOperators] = useState<{ operator_id: number; operator_name: string }[]>([]);
  const [operatorId, setOperatorId] = useState<number | null>(user?.operatorId ?? null);
  const [file, setFile] = useState<{ name: string; uri: string; mimeType?: string } | null>(null);
  const [testName, setTestName] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [technology, setTechnology] = useState('4G');
  const [routeType, setRouteType] = useState('urban');
  const [deviceModel, setDeviceModel] = useState('');
  const [testerName, setTesterName] = useState(user?.fullName || '');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    getOperators().then((ops) => {
      setOperators(ops);
      if (!operatorId && ops.length) setOperatorId(ops[0].operator_id);
    }).catch(() => {});
  }, []);

  const pickFile = async () => {
    const r = await DocumentPicker.getDocumentAsync({
      type: ['application/vnd.ms-excel',
             'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
             'text/csv', '*/*'],
    });
    if (!r.canceled && r.assets?.[0]) {
      setFile({ name: r.assets[0].name, uri: r.assets[0].uri, mimeType: r.assets[0].mimeType });
    }
  };

  const upload = async () => {
    if (!file) { Alert.alert('Required', 'Please select a file.'); return; }
    if (!testName.trim()) { Alert.alert('Required', 'Enter a test name.'); return; }
    if (!operatorId) { Alert.alert('Required', 'Select an operator.'); return; }
    setUploading(true);
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as any);
    form.append('operator_id', String(operatorId));
    form.append('test_name', testName.trim());
    form.append('test_date', testDate);
    form.append('technology', technology);
    form.append('route_type', routeType);
    form.append('device_model', deviceModel.trim());
    form.append('tester_name', testerName.trim());
    form.append('notes', notes.trim());
    try {
      const { data } = await client.post('/drive-tests/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });
      setResult(data.data);
    } catch (e: any) {
      Alert.alert('Upload Failed', e?.response?.data?.error?.message || 'Upload failed. Check file format and connection.');
    } finally {
      setUploading(false);
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

  // ── Success screen ──
  if (result) {
    return (
      <View style={[s.successScreen, { backgroundColor: t.bg }]}>
        <StatusBar barStyle={t.isDark ? 'light-content' : 'dark-content'} />
        <View style={[s.successIconWrap, { backgroundColor: palette.success + '14' }]}>
          <Ionicons name="checkmark-circle" size={56} color={palette.success} />
        </View>
        <Text style={[s.successTitle, { color: t.text }]}>Import Successful</Text>
        <Text style={[s.successSub, { color: t.textSub }]}>
          {result.samplesImported} samples · {Number(result.distanceKm || 0).toFixed(2)} km recorded
        </Text>

        <View style={[s.resultCard, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
          {[
            { icon: 'pulse-outline', label: 'Samples imported', value: result.samplesImported },
            { icon: 'location-outline', label: 'Distance', value: `${Number(result.distanceKm || 0).toFixed(2)} km` },
          ].map(({ icon, label, value }) => (
            <View key={label} style={[s.resultRow, { borderBottomColor: t.border }]}>
              <Ionicons name={icon as any} size={16} color={palette.primary} />
              <Text style={[s.resultLabel, { color: t.textSub }]}>{label}</Text>
              <Text style={[s.resultValue, { color: t.text }]}>{value}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[s.primaryBtn, { backgroundColor: palette.primary }]}
          onPress={() => router.push(`/tests/${result.driveTestId}` as any)}
        >
          <Ionicons name="bar-chart-outline" size={18} color="#fff" />
          <Text style={s.primaryBtnText}>View Results</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.linkBtn} onPress={() => router.replace('/(tabs)/tests')}>
          <Text style={[s.linkBtnText, { color: palette.primary }]}>Back to My Tests</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={palette.primaryDark} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: palette.primaryDark }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Upload Drive Test</Text>
          <Text style={s.headerSub}>Import Excel (.xlsx) or CSV</Text>
        </View>
        <View style={s.headerIcon}>
          <Ionicons name="cloud-upload-outline" size={22} color="rgba(255,255,255,0.7)" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* File drop zone */}
        <TouchableOpacity
          style={[s.dropZone, {
            backgroundColor: file ? palette.success + '0A' : t.surface,
            borderColor: file ? palette.success : palette.primary + '60',
          }, shadow.sm]}
          onPress={pickFile}
          activeOpacity={0.8}
        >
          <View style={[s.dropIcon, { backgroundColor: file ? palette.success + '18' : palette.primary + '14' }]}>
            <Ionicons name={file ? 'document-text' : 'cloud-upload-outline'} size={28} color={file ? palette.success : palette.primary} />
          </View>
          {file ? (
            <>
              <Text style={[s.dropFileName, { color: palette.success }]} numberOfLines={1}>{file.name}</Text>
              <Text style={[s.dropHint, { color: t.textMuted }]}>Tap to change file</Text>
            </>
          ) : (
            <>
              <Text style={[s.dropTitle, { color: t.text }]}>Select a file</Text>
              <Text style={[s.dropHint, { color: t.textMuted }]}>Excel (.xlsx) or CSV format</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Test identity */}
        <SectionLabel>TEST IDENTITY</SectionLabel>
        <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
          <Text style={[s.fieldLabel, { color: t.textSub }]}>Test Name *</Text>
          <TextInput
            style={inputStyle('name')}
            value={testName}
            onChangeText={setTestName}
            placeholder="e.g. Freetown Drive Test"
            placeholderTextColor={t.textMuted}
            onFocus={() => setFocused('name')}
            onBlur={() => setFocused(null)}
          />
          <Text style={[s.fieldLabel, { color: t.textSub }]}>Test Date</Text>
          <TextInput
            style={inputStyle('date')}
            value={testDate}
            onChangeText={setTestDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={t.textMuted}
            onFocus={() => setFocused('date')}
            onBlur={() => setFocused(null)}
          />
        </View>

        {/* Operator */}
        <SectionLabel>OPERATOR *</SectionLabel>
        <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
          {operators.map((o, i) => {
            const active = operatorId === o.operator_id;
            return (
              <TouchableOpacity
                key={o.operator_id}
                style={[s.opRow, i < operators.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.border }]}
                onPress={() => setOperatorId(o.operator_id)}
                activeOpacity={0.7}
              >
                <View style={[s.radioOuter, { borderColor: active ? palette.primary : t.border }]}>
                  {active && <View style={[s.radioInner, { backgroundColor: palette.primary }]} />}
                </View>
                <Text style={[s.opName, { color: active ? palette.primary : t.text }]}>{o.operator_name}</Text>
              </TouchableOpacity>
            );
          })}
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

        {/* Route type */}
        <SectionLabel>ROUTE TYPE</SectionLabel>
        <View style={s.routeRow}>
          {ROUTE_TYPES.map((r) => {
            const active = routeType === r.toLowerCase();
            return (
              <TouchableOpacity
                key={r}
                style={[s.routeChip, { borderColor: active ? palette.primary : t.border, backgroundColor: active ? palette.primary + '10' : t.surface }, shadow.sm]}
                onPress={() => setRouteType(r.toLowerCase())}
                activeOpacity={0.8}
              >
                <Text style={[s.routeChipText, { color: active ? palette.primary : t.textSub }]}>{r}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Additional */}
        <SectionLabel>ADDITIONAL INFO</SectionLabel>
        <View style={[s.card, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
          <Text style={[s.fieldLabel, { color: t.textSub }]}>Tester Name</Text>
          <TextInput style={inputStyle('tester')} value={testerName} onChangeText={setTesterName}
            placeholder="Your name" placeholderTextColor={t.textMuted}
            onFocus={() => setFocused('tester')} onBlur={() => setFocused(null)} />
          <Text style={[s.fieldLabel, { color: t.textSub }]}>Device Model</Text>
          <TextInput style={inputStyle('device')} value={deviceModel} onChangeText={setDeviceModel}
            placeholder="e.g. Samsung Galaxy S24" placeholderTextColor={t.textMuted}
            onFocus={() => setFocused('device')} onBlur={() => setFocused(null)} />
          <Text style={[s.fieldLabel, { color: t.textSub }]}>Notes</Text>
          <TextInput style={[inputStyle('notes'), { height: 80, textAlignVertical: 'top' }]}
            value={notes} onChangeText={setNotes} placeholder="Optional notes…"
            placeholderTextColor={t.textMuted} multiline
            onFocus={() => setFocused('notes')} onBlur={() => setFocused(null)} />
        </View>

        <TouchableOpacity
          style={[s.primaryBtn, { backgroundColor: palette.primary, opacity: uploading ? 0.75 : 1 }]}
          onPress={upload}
          disabled={uploading}
          activeOpacity={0.85}
        >
          {uploading ? (
            <><ActivityIndicator color="#fff" /><Text style={s.primaryBtnText}>Uploading…</Text></>
          ) : (
            <><Ionicons name="cloud-upload" size={18} color="#fff" /><Text style={s.primaryBtnText}>Upload & Import</Text></>
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
  headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

  dropZone: { borderRadius: radius.xl, borderWidth: 1.5, borderStyle: 'dashed', padding: space.xl, alignItems: 'center', gap: 8, marginBottom: 4, shadowColor: '#000' },
  dropIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dropTitle: { fontSize: 16, fontWeight: '700' },
  dropFileName: { fontSize: 14, fontWeight: '700', maxWidth: '90%', textAlign: 'center' },
  dropHint: { fontSize: 12 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: space.sm, marginTop: space.lg },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space.md, shadowColor: '#000' },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: { borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, marginBottom: 4 },

  opRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  opName: { fontSize: 14, fontWeight: '600' },

  techRow: { flexDirection: 'row', gap: space.sm },
  techChip: { flex: 1, borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', shadowColor: '#000' },
  techChipText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },

  routeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  routeChip: { paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1.5, borderRadius: 20, shadowColor: '#000' },
  routeChipText: { fontSize: 13, fontWeight: '600' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
    borderRadius: radius.lg, padding: 17, marginTop: space.xl,
    shadowColor: palette.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  linkBtn: { alignItems: 'center', padding: space.md },
  linkBtnText: { fontSize: 14, fontWeight: '600' },

  successScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  successIconWrap: { width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  successTitle: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  successSub: { fontSize: 14, textAlign: 'center', marginBottom: space.xl },
  resultCard: { width: '100%', borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden', marginBottom: space.xl, shadowColor: '#000' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: space.md, borderBottomWidth: 1 },
  resultLabel: { flex: 1, fontSize: 13 },
  resultValue: { fontSize: 14, fontWeight: '700' },
});
