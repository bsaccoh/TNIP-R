import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, ScrollView, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useTheme, palette, shadow, radius, space } from '@/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const t = useTheme();

  const [serverUrl, setServerUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('server_url').then((v) => { if (v) setServerUrl(v); });
  }, []);

  const handleLogin = async () => {
    if (!serverUrl.trim()) { setError('Please enter the server URL.'); return; }
    if (!email.trim() || !password) { setError('Email and password are required.'); return; }
    setLoading(true); setError('');
    try {
      await AsyncStorage.setItem('server_url', serverUrl.trim().replace(/\/$/, ''));
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Login failed. Check your credentials and server URL.');
    } finally { setLoading(false); }
  };

  const inputStyle = (name: string) => [
    styles.input,
    {
      backgroundColor: t.inputBg,
      borderColor: focused === name ? palette.primary : t.border,
      color: t.text,
      borderWidth: focused === name ? 1.5 : 1,
    },
  ];

  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: t.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle={t.isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Logo / Brand */}
        <View style={styles.brandSection}>
          <View style={[styles.logoCircle, { backgroundColor: palette.primary }]}>
            <Ionicons name="cellular" size={32} color="#fff" />
          </View>
          <Text style={[styles.brandName, { color: t.text }]}>TNIP-R</Text>
          <Text style={[styles.brandTagline, { color: t.textSub }]}>Drive Tester Portal</Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: t.surface, shadowColor: t.shadow }, shadow.md]}>
          <Text style={[styles.cardTitle, { color: t.text }]}>Sign in</Text>
          <Text style={[styles.cardSub, { color: t.textSub }]}>Enter your credentials to continue</Text>

          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: palette.error + '15', borderColor: palette.error + '40' }]}>
              <Ionicons name="alert-circle-outline" size={16} color={palette.error} />
              <Text style={[styles.errorText, { color: palette.error }]}>{error}</Text>
            </View>
          )}

          <Text style={[styles.label, { color: t.textSub }]}>Server URL</Text>
          <TextInput
            style={inputStyle('url')}
            placeholder="http://192.168.x.x:4000/api/v1"
            placeholderTextColor={t.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={serverUrl}
            onChangeText={setServerUrl}
            onFocus={() => setFocused('url')}
            onBlur={() => setFocused(null)}
            editable={!loading}
          />

          <Text style={[styles.label, { color: t.textSub }]}>Email address</Text>
          <TextInput
            style={inputStyle('email')}
            placeholder="you@tnipr.gov"
            placeholderTextColor={t.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            editable={!loading}
          />

          <Text style={[styles.label, { color: t.textSub }]}>Password</Text>
          <View style={styles.passWrap}>
            <TextInput
              style={[inputStyle('pass'), { flex: 1, marginBottom: 0 }]}
              placeholder="••••••••"
              placeholderTextColor={t.textMuted}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocused('pass')}
              onBlur={() => setFocused(null)}
              editable={!loading}
              onSubmitEditing={handleLogin}
              returnKeyType="go"
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={t.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: loading ? palette.primaryLight : palette.primary }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.btnText}>Sign In</Text>}
          </TouchableOpacity>
        </View>

        <Text style={[styles.footer, { color: t.textMuted }]}>
          National Telecom &amp; Internet Regulatory Platform
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space.lg, paddingVertical: space.xxl },
  brandSection: { alignItems: 'center', marginBottom: space.xl },
  logoCircle: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  brandName: { fontSize: 32, fontWeight: '800', letterSpacing: 0.5 },
  brandTagline: { fontSize: 14, marginTop: 4, letterSpacing: 0.3 },
  card: { borderRadius: radius.xl, padding: space.xl },
  cardTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  cardSub: { fontSize: 14, marginBottom: space.xl },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, borderWidth: 1, padding: space.md, marginBottom: space.md },
  errorText: { fontSize: 13, flex: 1 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, marginBottom: 6, textTransform: 'uppercase' },
  input: { borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, marginBottom: space.md },
  passWrap: { flexDirection: 'row', alignItems: 'center', gap: 0, marginBottom: space.md },
  eyeBtn: { position: 'absolute', right: 14, top: 13 },
  btn: { borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  footer: { textAlign: 'center', fontSize: 12, marginTop: space.xl },
});
