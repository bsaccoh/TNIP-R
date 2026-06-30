import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useThemeContext, ColorMode } from '@/context/ThemeContext';
import { useTheme, palette, shadow, radius, space } from '@/theme';

function Section({ title }: { title: string }) {
  const t = useTheme();
  return <Text style={[styles.sectionLabel, { color: t.textMuted }]}>{title}</Text>;
}

function SettingRow({ icon, label, value, color }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; color?: string;
}) {
  const t = useTheme();
  return (
    <View style={[styles.settingRow, { borderBottomColor: t.border }]}>
      <View style={[styles.settingIcon, { backgroundColor: (color || palette.primary) + '15' }]}>
        <Ionicons name={icon} size={17} color={color || palette.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingLabel, { color: t.textSub }]}>{label}</Text>
        {value && <Text style={[styles.settingValue, { color: t.text }]}>{value}</Text>}
      </View>
    </View>
  );
}

const THEME_OPTIONS: { mode: ColorMode; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { mode: 'light',  icon: 'sunny-outline',          label: 'Light'  },
  { mode: 'system', icon: 'phone-portrait-outline',  label: 'System' },
  { mode: 'dark',   icon: 'moon-outline',            label: 'Dark'   },
];

export default function SettingsScreen() {
  const { user, logout, updateProfile } = useAuth();
  const { colorMode, setColorMode } = useThemeContext();
  const t = useTheme();

  // Server / thresholds
  const [serverUrl, setServerUrl] = useState('');
  const [rsrpThr, setRsrpThr] = useState('-95');
  const [sinrThr, setSinrThr] = useState('0');
  const [dlThr, setDlThr] = useState('1000');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  // Profile editing
  const [editName, setEditName] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    setEditName(user?.fullName || '');
    (async () => {
      setServerUrl((await AsyncStorage.getItem('server_url')) || '');
      setRsrpThr((await AsyncStorage.getItem('thr_rsrp')) || '-95');
      setSinrThr((await AsyncStorage.getItem('thr_sinr')) || '0');
      setDlThr((await AsyncStorage.getItem('thr_dl')) || '1000');
    })();
  }, [user]);

  const saveSettings = async () => {
    if (serverUrl.trim()) await AsyncStorage.setItem('server_url', serverUrl.trim().replace(/\/$/, ''));
    else await AsyncStorage.removeItem('server_url');
    await AsyncStorage.setItem('thr_rsrp', rsrpThr);
    await AsyncStorage.setItem('thr_sinr', sinrThr);
    await AsyncStorage.setItem('thr_dl', dlThr);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const saveProfile = async () => {
    const nameChanged = editName.trim() && editName.trim() !== user?.fullName;
    const pwChange = newPw.trim().length > 0;

    if (!nameChanged && !pwChange) {
      Alert.alert('No changes', 'Edit your name or enter a new password to save.');
      return;
    }
    if (pwChange) {
      if (!currentPw) { Alert.alert('Required', 'Enter your current password to set a new one.'); return; }
      if (newPw !== confirmPw) { Alert.alert('Mismatch', 'New passwords do not match.'); return; }
      if (newPw.length < 6) { Alert.alert('Too short', 'Password must be at least 6 characters.'); return; }
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        fullName: nameChanged ? editName.trim() : undefined,
        currentPassword: pwChange ? currentPw : undefined,
        newPassword: pwChange ? newPw : undefined,
      });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
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
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      <View style={[styles.profileHeader, { backgroundColor: palette.primaryDark }]}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {(user?.fullName || user?.email || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{user?.fullName || user?.email}</Text>
          <Text style={styles.profileRole}>{user?.role?.replace(/_/g, ' ')}</Text>
        </View>
      </View>

      <View style={{ padding: space.lg }}>

        {/* ── ACCOUNT (read-only) ── */}
        <Section title="ACCOUNT" />
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
          <SettingRow icon="mail-outline"             label="Email"    value={user?.email} />
          <SettingRow icon="shield-checkmark-outline" label="Role"     value={user?.role?.replace(/_/g, ' ')} color={palette.success} />
          <SettingRow icon="business-outline"         label="Operator" value={user?.operatorId ? `ID ${user.operatorId}` : 'All operators'} color={palette.warning} />
        </View>

        {/* ── EDIT PROFILE ── */}
        <Section title="EDIT PROFILE" />
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
          <View style={styles.profileFieldWrap}>
            <Text style={[styles.inputLabel, { color: t.textSub }]}>Full Name</Text>
            <TextInput
              style={inputStyle('name')}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your full name"
              placeholderTextColor={t.textMuted}
              onFocus={() => setFocused('name')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <View style={[styles.pwDivider, { borderTopColor: t.border }]}>
            <Text style={[styles.pwDividerLabel, { color: t.textMuted }]}>Change Password</Text>
          </View>

          {([
            { key: 'cpw',  label: 'Current Password', val: currentPw, set: setCurrentPw },
            { key: 'npw',  label: 'New Password',     val: newPw,     set: setNewPw     },
            { key: 'cpw2', label: 'Confirm New',      val: confirmPw, set: setConfirmPw },
          ] as const).map(({ key, label, val, set }) => (
            <View key={key} style={styles.profileFieldWrap}>
              <Text style={[styles.inputLabel, { color: t.textSub }]}>{label}</Text>
              <TextInput
                style={inputStyle(key)}
                value={val}
                onChangeText={set as (v: string) => void}
                placeholder="••••••••"
                placeholderTextColor={t.textMuted}
                secureTextEntry
                autoCorrect={false}
                onFocus={() => setFocused(key)}
                onBlur={() => setFocused(null)}
              />
            </View>
          ))}

          <TouchableOpacity
            style={[styles.profileSaveBtn, { backgroundColor: profileSaved ? palette.success : palette.primary, opacity: savingProfile ? 0.7 : 1 }]}
            onPress={saveProfile}
            disabled={savingProfile}
            activeOpacity={0.85}
          >
            <Ionicons name={profileSaved ? 'checkmark-circle-outline' : 'person-outline'} size={16} color="#fff" />
            <Text style={styles.profileSaveBtnText}>
              {savingProfile ? 'Saving…' : profileSaved ? 'Profile Saved!' : 'Save Profile'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── APPEARANCE ── */}
        <Section title="APPEARANCE" />
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
          <View style={styles.themeRow}>
            <View style={[styles.settingIcon, { backgroundColor: palette.primary + '15' }]}>
              <Ionicons name="contrast-outline" size={17} color={palette.primary} />
            </View>
            <Text style={[styles.themeLabel, { color: t.text }]}>Theme</Text>
            <View style={[styles.themeToggle, { backgroundColor: t.border }]}>
              {THEME_OPTIONS.map(({ mode, icon, label }) => {
                const active = colorMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.themeOption, active && { backgroundColor: t.surface }, active && shadow.sm]}
                    onPress={() => setColorMode(mode)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={icon} size={14} color={active ? palette.primary : t.textMuted} />
                    <Text style={[styles.themeOptionText, { color: active ? palette.primary : t.textMuted, fontWeight: active ? '700' : '500' }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── SERVER CONNECTION ── */}
        <Section title="SERVER CONNECTION" />
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
          <Text style={[styles.inputLabel, { color: t.textSub }]}>API Base URL</Text>
          <TextInput
            style={inputStyle('url')}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://192.168.x.x:4000/api/v1"
            placeholderTextColor={t.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setFocused('url')}
            onBlur={() => setFocused(null)}
          />
          <Text style={[styles.inputHint, { color: t.textMuted }]}>Leave blank to use the compiled default.</Text>
        </View>

        {/* ── COMPLIANCE THRESHOLDS ── */}
        <Section title="COMPLIANCE THRESHOLDS" />
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, shadow.sm]}>
          {[
            { key: 'rsrp', label: 'Min RSRP',         unit: 'dBm',  value: rsrpThr, set: setRsrpThr, icon: 'cellular-outline',   color: palette.error },
            { key: 'sinr', label: 'Min SINR',          unit: 'dB',   value: sinrThr, set: setSinrThr, icon: 'wifi-outline',        color: palette.successLight },
            { key: 'dl',   label: 'Min DL Throughput', unit: 'kbps', value: dlThr,   set: setDlThr,   icon: 'speedometer-outline', color: palette.warning },
          ].map(({ key, label, unit, value, set, icon, color }, i, arr) => (
            <View key={key} style={[styles.threshRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.border }]}>
              <View style={[styles.threshIcon, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon as any} size={16} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.threshLabel, { color: t.textSub }]}>{label}</Text>
                <TextInput
                  style={[inputStyle(key), { marginBottom: 0, paddingVertical: 8, marginTop: 4 }]}
                  value={value}
                  onChangeText={set}
                  keyboardType="numeric"
                  placeholder="—"
                  placeholderTextColor={t.textMuted}
                  onFocus={() => setFocused(key)}
                  onBlur={() => setFocused(null)}
                />
              </View>
              <Text style={[styles.unit, { color: t.textMuted }]}>{unit}</Text>
            </View>
          ))}
        </View>

        {/* Save settings */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: settingsSaved ? palette.success : palette.primary }]}
          onPress={saveSettings}
          activeOpacity={0.85}
        >
          <Ionicons name={settingsSaved ? 'checkmark-circle-outline' : 'save-outline'} size={18} color="#fff" />
          <Text style={styles.saveBtnText}>{settingsSaved ? 'Saved!' : 'Save Settings'}</Text>
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: palette.error + '50', backgroundColor: palette.error + '08' }]}
          onPress={confirmLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color={palette.error} />
          <Text style={[styles.logoutText, { color: palette.error }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: t.textMuted }]}>TNIP-R Drive Tester v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: 56, paddingHorizontal: space.lg, paddingBottom: space.xl },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  profileName: { color: '#fff', fontSize: 17, fontWeight: '700' },
  profileRole: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: space.sm, marginTop: space.lg },
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', marginBottom: 4 },

  settingRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderBottomWidth: 1 },
  settingIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 11, marginBottom: 2 },
  settingValue: { fontSize: 14, fontWeight: '600' },

  profileFieldWrap: { padding: space.md, paddingBottom: 4 },
  pwDivider: { borderTopWidth: 1, paddingTop: space.sm, paddingHorizontal: space.md, marginTop: 4 },
  pwDividerLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  profileSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: space.md, marginTop: 8, borderRadius: radius.md, padding: 13 },
  profileSaveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  themeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  themeLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  themeToggle: { flexDirection: 'row', borderRadius: radius.md, padding: 3, gap: 2 },
  themeOption: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  themeOptionText: { fontSize: 11 },

  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, marginBottom: 8 },
  inputHint: { fontSize: 11 },

  threshRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  threshIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  threshLabel: { fontSize: 12, fontWeight: '600' },
  unit: { fontSize: 12, fontWeight: '600', minWidth: 36, textAlign: 'right' },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, borderRadius: radius.md, padding: 15, marginTop: space.lg },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, borderRadius: radius.md, padding: 15, marginTop: space.sm, borderWidth: 1.5 },
  logoutText: { fontSize: 16, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 12, marginTop: space.xl },
});
