import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  useColorScheme, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import client from '@/api/client';
import { getOperators } from '@/api/drivetest';
import { useAuth } from '@/context/AuthContext';

const BLUE = '#1565C0';
const GREEN = '#2E7D32';

const TECHS = ['2G', '3G', '4G', '5G'];
const ROUTE_TYPES = ['urban', 'suburban', 'rural', 'highway'];

export default function UploadScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const bg = dark ? '#121212' : '#F5F7FA';
  const card = dark ? '#1E1E1E' : '#fff';
  const text = dark ? '#fff' : '#212121';
  const sub = dark ? '#9E9E9E' : '#757575';
  const border = dark ? '#333' : '#E0E0E0';
  const inputBg = dark ? '#2A2A2A' : '#FAFAFA';

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

  useEffect(() => {
    getOperators().then((ops) => {
      setOperators(ops);
      if (!operatorId && ops.length) setOperatorId(ops[0].operator_id);
    }).catch(() => {});
  }, []);

  const pickFile = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', '*/*'] });
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

  const Label = ({ children }: { children: string }) => (
    <Text style={[styles.label, { color: sub }]}>{children}</Text>
  );

  if (result) {
    return (
      <View style={[styles.centered, { backgroundColor: bg }]}>
        <Ionicons name="checkmark-circle" size={64} color={GREEN} />
        <Text style={[styles.successTitle, { color: text }]}>Upload Successful!</Text>
        <Text style={[styles.successSub, { color: sub }]}>
          {result.samplesImported} samples imported · {Number(result.distanceKm || 0).toFixed(2)} km
        </Text>
        <TouchableOpacity style={[styles.btn, { backgroundColor: BLUE }]} onPress={() => router.push(`/tests/${result.driveTestId}` as any)}>
          <Text style={styles.btnText}>View Test Results</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnLink} onPress={() => router.replace('/(tabs)/tests')}>
          <Text style={{ color: BLUE, fontSize: 15, fontWeight: '600' }}>Back to My Tests</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
        <Text style={{ color: BLUE, fontSize: 16 }}>← Back</Text>
      </TouchableOpacity>
      <Text style={[styles.title, { color: text }]}>Upload Drive Test</Text>
      <Text style={[styles.sub, { color: sub }]}>Import an Excel (.xlsx) or CSV file</Text>

      {/* File picker */}
      <TouchableOpacity
        style={[styles.filePicker, { backgroundColor: card, borderColor: file ? GREEN : border }]}
        onPress={pickFile}
      >
        <Ionicons name={file ? 'document-text' : 'cloud-upload-outline'} size={28} color={file ? GREEN : BLUE} />
        <Text style={[styles.filePickerText, { color: file ? GREEN : text }]} numberOfLines={1}>
          {file ? file.name : 'Tap to select file'}
        </Text>
      </TouchableOpacity>

      <View style={[styles.card, { backgroundColor: card }]}>
        <Label>Test Name *</Label>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
          value={testName}
          onChangeText={setTestName}
          placeholder="e.g. Freetown Drive Test"
          placeholderTextColor={sub}
        />

        <Label>Operator *</Label>
        {operators.map((o) => (
          <TouchableOpacity
            key={o.operator_id}
            style={[styles.chip, { borderColor: operatorId === o.operator_id ? BLUE : border, backgroundColor: operatorId === o.operator_id ? BLUE + '18' : 'transparent', marginBottom: 6 }]}
            onPress={() => setOperatorId(o.operator_id)}
          >
            <Text style={{ color: operatorId === o.operator_id ? BLUE : sub, fontWeight: '600' }}>{o.operator_name}</Text>
          </TouchableOpacity>
        ))}

        <Label>Test Date</Label>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
          value={testDate}
          onChangeText={setTestDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={sub}
        />

        <Label>Technology</Label>
        <View style={styles.chipRow}>
          {TECHS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, { borderColor: technology === t ? BLUE : border, backgroundColor: technology === t ? BLUE : 'transparent' }]}
              onPress={() => setTechnology(t)}
            >
              <Text style={{ color: technology === t ? '#fff' : sub, fontWeight: '600' }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Label>Route Type</Label>
        <View style={styles.chipRow}>
          {ROUTE_TYPES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.chip, { borderColor: routeType === r ? BLUE : border, backgroundColor: routeType === r ? BLUE : 'transparent' }]}
              onPress={() => setRouteType(r)}
            >
              <Text style={{ color: routeType === r ? '#fff' : sub, fontWeight: '600', textTransform: 'capitalize' }}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Label>Device Model</Label>
        <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]} value={deviceModel} onChangeText={setDeviceModel} placeholder="e.g. Samsung S24" placeholderTextColor={sub} />

        <Label>Tester Name</Label>
        <TextInput style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]} value={testerName} onChangeText={setTesterName} placeholder="Your name" placeholderTextColor={sub} />

        <Label>Notes</Label>
        <TextInput
          style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text, height: 80, textAlignVertical: 'top' }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Optional notes..."
          placeholderTextColor={sub}
          multiline
        />
      </View>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: BLUE, opacity: uploading ? 0.7 : 1 }]}
        onPress={upload}
        disabled={uploading}
      >
        {uploading
          ? <><ActivityIndicator color="#fff" style={{ marginRight: 10 }} /><Text style={styles.btnText}>Uploading…</Text></>
          : <Text style={styles.btnText}>Upload & Import</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
  sub: { fontSize: 14, marginBottom: 24 },
  filePicker: { borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', padding: 24, alignItems: 'center', marginBottom: 20, gap: 10 },
  filePickerText: { fontSize: 14, fontWeight: '600' },
  card: { borderRadius: 14, padding: 18, elevation: 2, shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6, marginTop: 12, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 10, padding: 13, fontSize: 14, marginBottom: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { borderWidth: 1.5, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 },
  btn: { borderRadius: 14, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnLink: { padding: 16, alignItems: 'center' },
  successTitle: { fontSize: 24, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  successSub: { fontSize: 14, marginBottom: 32, textAlign: 'center' },
});
