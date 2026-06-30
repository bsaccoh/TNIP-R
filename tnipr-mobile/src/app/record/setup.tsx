import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  useColorScheme, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '@/context/AuthContext';
import { useRecording } from '@/context/RecordingContext';
import { createLiveTest, getOperators } from '@/api/drivetest';

const BLUE = '#1565C0';

const ROUTE_TYPES = ['urban', 'suburban', 'rural', 'highway'];
const TECHS = ['2G', '3G', '4G', '5G'];

export default function SetupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { startSession } = useRecording();
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
  const [testName, setTestName] = useState('');
  const [technology, setTechnology] = useState('4G');
  const [routeType, setRouteType] = useState('urban');
  const [deviceModel, setDeviceModel] = useState('');
  const [testerName, setTesterName] = useState(user?.fullName || '');
  const [notes, setNotes] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    getOperators().then((ops) => {
      setOperators(ops);
      if (!operatorId && ops.length) setOperatorId(ops[0].operator_id);
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
        route_type: routeType,
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

  const Label = ({ children }: { children: string }) => (
    <Text style={[styles.label, { color: sub }]}>{children}</Text>
  );

  const Field = ({ value, onChange, placeholder, multiline = false, keyboardType = 'default' }: any) => (
    <TextInput
      style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text, height: multiline ? 80 : undefined, textAlignVertical: multiline ? 'top' : 'center' }]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={sub}
      multiline={multiline}
      keyboardType={keyboardType}
    />
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
        <Text style={{ color: BLUE, fontSize: 16 }}>← Back</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: text }]}>New Drive Test</Text>
      <Text style={[styles.sub, { color: sub }]}>Fill in the test details before recording starts</Text>

      <View style={[styles.card, { backgroundColor: card }]}>
        <Label>Test Name *</Label>
        <Field value={testName} onChange={setTestName} placeholder="e.g. Freetown Urban 4G – AM" />

        <Label>Operator *</Label>
        <View style={[styles.pickerWrapper, { borderColor: border, backgroundColor: inputBg }]}>
          <Picker selectedValue={operatorId} onValueChange={setOperatorId} style={{ color: text }}>
            {operators.map((o) => (
              <Picker.Item key={o.operator_id} label={o.operator_name} value={o.operator_id} />
            ))}
          </Picker>
        </View>

        <Label>Technology</Label>
        <View style={[styles.chipRow]}>
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
        <Field value={deviceModel} onChange={setDeviceModel} placeholder="e.g. Samsung Galaxy S24" />

        <Label>Tester Name</Label>
        <Field value={testerName} onChange={setTesterName} placeholder="Your name" />

        <Label>Notes</Label>
        <Field value={notes} onChange={setNotes} placeholder="Optional notes about this test..." multiline />
      </View>

      <TouchableOpacity
        style={[styles.startBtn, { backgroundColor: BLUE, opacity: starting ? 0.7 : 1 }]}
        onPress={start}
        disabled={starting}
      >
        {starting
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.startBtnText}>Start Recording</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
  sub: { fontSize: 14, marginBottom: 24 },
  card: { borderRadius: 14, padding: 18, elevation: 2, shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, padding: 13, fontSize: 14, marginBottom: 2 },
  pickerWrapper: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginBottom: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 2 },
  chip: { borderWidth: 1.5, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 },
  startBtn: { borderRadius: 14, padding: 18, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
