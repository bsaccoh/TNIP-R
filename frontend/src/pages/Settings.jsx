import { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, TextField, Button, Alert, Switch,
  FormControlLabel, Divider, Tabs, Tab, Chip, MenuItem, Select, FormControl,
  InputLabel, CircularProgress,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import LockIcon from '@mui/icons-material/Lock';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EmailIcon from '@mui/icons-material/Email';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import { get, put } from '../api/client';
import { Loading } from '../components/ui';
import Sftp from './Sftp';

const TIMEZONES = [
  'UTC','Africa/Freetown','Africa/Lagos','Africa/Nairobi','Africa/Johannesburg',
  'Europe/London','Europe/Paris','America/New_York','America/Chicago','America/Los_Angeles',
  'Asia/Dubai','Asia/Singapore','Asia/Tokyo',
];

function Section({ title, icon, children }) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" mb={2.5}>
          <Box sx={{ color: 'primary.main' }}>{icon}</Box>
          <Typography variant="h6">{title}</Typography>
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

function SaveBar({ dirty, saving, onSave, msg }) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" mt={2}>
      <Button variant="contained" onClick={onSave} disabled={saving || !dirty}>
        {saving ? <><CircularProgress size={16} sx={{ mr: 1 }} />Saving…</> : 'Save Changes'}
      </Button>
      {msg && <Alert severity={msg.type} sx={{ py: 0 }}>{msg.text}</Alert>}
    </Stack>
  );
}

/* ── General Tab ── */
function GeneralTab({ cfg, setCfg, save, saving, msg }) {
  const set = (k) => (e) => { setCfg((c) => ({ ...c, [k]: e.target.value })); };
  const toggle = (k) => (e) => { setCfg((c) => ({ ...c, [k]: String(e.target.checked) })); };
  const [dirty, setDirty] = useState(false);
  const change = (k) => (e) => { set(k)(e); setDirty(true); };
  const changeToggle = (k) => (e) => { toggle(k)(e); setDirty(true); };

  return (
    <Stack spacing={3}>
      <Section title="General" icon={<TuneIcon />}>
        <Stack spacing={2}>
          <TextField label="Platform Name" size="small" value={cfg.platform_name || ''} onChange={change('platform_name')} />
          <TextField label="Regulator Name" size="small" value={cfg.regulator_name || ''} onChange={change('regulator_name')} />
          <FormControl size="small">
            <InputLabel>Timezone</InputLabel>
            <Select label="Timezone" value={cfg.timezone || 'UTC'} onChange={change('timezone')}>
              {TIMEZONES.map((tz) => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Session Timeout (minutes)" size="small" type="number"
            value={cfg.session_timeout_min || '60'} onChange={change('session_timeout_min')} />
          <FormControlLabel
            control={<Switch checked={cfg.maintenance_mode === 'true'} onChange={changeToggle('maintenance_mode')} color="warning" />}
            label={<Stack direction="row" spacing={1} alignItems="center">
              <span>Maintenance Mode</span>
              {cfg.maintenance_mode === 'true' && <Chip size="small" label="ACTIVE" color="warning" />}
            </Stack>}
          />
        </Stack>
        <SaveBar dirty={dirty} saving={saving} onSave={() => { save(); setDirty(false); }} msg={msg} />
      </Section>
    </Stack>
  );
}

/* ── Password Policy Tab ── */
function PasswordTab({ cfg, setCfg, save, saving, msg }) {
  const [dirty, setDirty] = useState(false);
  const change = (k) => (e) => { setCfg((c) => ({ ...c, [k]: e.target.value })); setDirty(true); };
  const changeToggle = (k) => (e) => { setCfg((c) => ({ ...c, [k]: String(e.target.checked) })); setDirty(true); };

  return (
    <Section title="Password Policy" icon={<LockIcon />}>
      <Stack spacing={2}>
        <TextField label="Minimum Length" size="small" type="number" inputProps={{ min: 6, max: 32 }}
          value={cfg.pwd_min_length || '8'} onChange={change('pwd_min_length')} />
        <Divider />
        <Typography variant="body2" color="text.secondary" fontWeight={600}>Complexity Requirements</Typography>
        <FormControlLabel control={<Switch checked={cfg.pwd_require_uppercase === 'true'} onChange={changeToggle('pwd_require_uppercase')} />}
          label="Require uppercase letter (A–Z)" />
        <FormControlLabel control={<Switch checked={cfg.pwd_require_numbers === 'true'} onChange={changeToggle('pwd_require_numbers')} />}
          label="Require number (0–9)" />
        <FormControlLabel control={<Switch checked={cfg.pwd_require_symbols === 'true'} onChange={changeToggle('pwd_require_symbols')} />}
          label="Require symbol (!@#$…)" />
        <Divider />
        <Typography variant="body2" color="text.secondary" fontWeight={600}>Expiry & Lockout</Typography>
        <TextField label="Password Expiry (days, 0 = never)" size="small" type="number" inputProps={{ min: 0 }}
          value={cfg.pwd_expiry_days || '90'} onChange={change('pwd_expiry_days')} />
        <TextField label="Max Failed Login Attempts" size="small" type="number" inputProps={{ min: 1, max: 20 }}
          value={cfg.pwd_max_attempts || '5'} onChange={change('pwd_max_attempts')} />
        <TextField label="Lockout Duration (minutes)" size="small" type="number" inputProps={{ min: 1 }}
          value={cfg.pwd_lockout_min || '15'} onChange={change('pwd_lockout_min')} />
      </Stack>
      <SaveBar dirty={dirty} saving={saving} onSave={() => { save(); setDirty(false); }} msg={msg} />
    </Section>
  );
}

/* ── NTP Tab ── */
function NtpTab({ cfg, setCfg, save, saving, msg }) {
  const [dirty, setDirty] = useState(false);
  const change = (k) => (e) => { setCfg((c) => ({ ...c, [k]: e.target.value })); setDirty(true); };

  return (
    <Section title="NTP Configuration" icon={<AccessTimeIcon />}>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Configure NTP servers used for system time synchronisation across the platform.
        </Typography>
        <TextField label="Primary NTP Server" size="small" placeholder="pool.ntp.org"
          value={cfg.ntp_server_1 || ''} onChange={change('ntp_server_1')} />
        <TextField label="Secondary NTP Server" size="small" placeholder="time.google.com"
          value={cfg.ntp_server_2 || ''} onChange={change('ntp_server_2')} />
        <TextField label="Sync Interval (seconds)" size="small" type="number" inputProps={{ min: 60 }}
          value={cfg.ntp_sync_interval_sec || '3600'} onChange={change('ntp_sync_interval_sec')}
          helperText="Minimum 60 seconds. Default: 3600 (1 hour)" />
        <Alert severity="info" sx={{ mt: 1 }}>
          NTP settings are stored here for reference. Apply them to your OS/server NTP daemon (ntpd / chronyd) separately.
        </Alert>
      </Stack>
      <SaveBar dirty={dirty} saving={saving} onSave={() => { save(); setDirty(false); }} msg={msg} />
    </Section>
  );
}

/* ── Email / SMTP Tab ── */
function EmailTab({ cfg, setCfg, save, saving, msg }) {
  const [dirty, setDirty] = useState(false);
  const change = (k) => (e) => { setCfg((c) => ({ ...c, [k]: e.target.value })); setDirty(true); };
  const changeToggle = (k) => (e) => { setCfg((c) => ({ ...c, [k]: String(e.target.checked) })); setDirty(true); };

  return (
    <Stack spacing={3}>
      <Section title="SMTP / Email" icon={<EmailIcon />}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            <TextField label="SMTP Host" size="small" sx={{ flex: 1 }}
              value={cfg.smtp_host || ''} onChange={change('smtp_host')} />
            <TextField label="Port" size="small" type="number" sx={{ width: 120 }}
              value={cfg.smtp_port || '587'} onChange={change('smtp_port')} />
          </Stack>
          <TextField label="SMTP Username" size="small"
            value={cfg.smtp_user || ''} onChange={change('smtp_user')} />
          <TextField label="From Address" size="small" placeholder="noreply@tnipr.gov"
            value={cfg.smtp_from || ''} onChange={change('smtp_from')} />
          <FormControlLabel control={<Switch checked={cfg.smtp_tls === 'true'} onChange={changeToggle('smtp_tls')} />}
            label="Use TLS/STARTTLS" />
        </Stack>
        <SaveBar dirty={dirty} saving={saving} onSave={() => { save(); setDirty(false); }} msg={msg} />
      </Section>

      <Section title="Alert Email Notifications" icon={<EmailIcon />}>
        <Stack spacing={2}>
          <FormControlLabel
            control={<Switch checked={cfg.alert_email_enabled === 'true'} onChange={(e) => { changeToggle('alert_email_enabled')(e); }} />}
            label="Send email alerts for compliance violations" />
          <TextField label="Recipient Addresses (comma-separated)" size="small" multiline rows={2}
            disabled={cfg.alert_email_enabled !== 'true'}
            value={cfg.alert_email_recipients || ''} onChange={change('alert_email_recipients')}
            placeholder="compliance@tnipr.gov, admin@tnipr.gov" />
        </Stack>
        <SaveBar dirty={dirty} saving={saving} onSave={() => { save(); setDirty(false); }} msg={msg} />
      </Section>
    </Stack>
  );
}

/* ── Audit Tab ── */
function AuditTab({ cfg, setCfg, save, saving, msg }) {
  const [dirty, setDirty] = useState(false);
  const change = (k) => (e) => { setCfg((c) => ({ ...c, [k]: e.target.value })); setDirty(true); };

  return (
    <Section title="Audit Log Retention" icon={<HistoryIcon />}>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Control how long audit log entries are retained in the database before automatic purging.
        </Typography>
        <TextField label="Audit Log Retention (days)" size="small" type="number" inputProps={{ min: 30, max: 3650 }}
          value={cfg.audit_retention_days || '365'} onChange={change('audit_retention_days')}
          helperText="Recommended: 365 days (1 year). Minimum: 30 days." />
        <Alert severity="warning">
          Reducing retention will permanently delete older audit records. This action cannot be undone.
        </Alert>
      </Stack>
      <SaveBar dirty={dirty} saving={saving} onSave={() => { save(); setDirty(false); }} msg={msg} />
    </Section>
  );
}

/* ── Main Settings Page ── */
const TABS = [
  { key: 'general',  label: 'General',          icon: <SettingsIcon fontSize="small" /> },
  { key: 'password', label: 'Password Policy',  icon: <LockIcon fontSize="small" /> },
  { key: 'ntp',      label: 'NTP',              icon: <AccessTimeIcon fontSize="small" /> },
  { key: 'email',    label: 'Email / SMTP',     icon: <EmailIcon fontSize="small" /> },
  { key: 'sftp',     label: 'SFTP Connections', icon: <CloudSyncIcon fontSize="small" /> },
  { key: 'audit',    label: 'Audit Log',        icon: <HistoryIcon fontSize="small" /> },
];

export default function Settings() {
  const [tab, setTab] = useState(0);
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    get('/settings').then((r) => setCfg(r.data)).catch(() => setCfg({}));
  }, []);

  const save = async () => {
    setSaving(true); setMsg(null);
    try {
      const r = await put('/settings', cfg);
      setCfg(r.data);
      setMsg({ type: 'success', text: 'Settings saved.' });
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error?.message || 'Save failed.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  if (!cfg) return <Loading />;

  const activeKey = TABS[tab]?.key;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" mb={3}>
        <SettingsIcon color="primary" />
        <Typography variant="h5" fontWeight={700}>Settings</Typography>
      </Stack>

      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* Vertical tab list */}
        <Card sx={{ minWidth: 200, flexShrink: 0 }}>
          <Tabs
            orientation="vertical"
            value={tab}
            onChange={(_, v) => { setTab(v); setMsg(null); }}
            sx={{ '& .MuiTab-root': { alignItems: 'flex-start', textAlign: 'left', minHeight: 48 } }}
          >
            {TABS.map((t, i) => (
              <Tab key={t.key} label={
                <Stack direction="row" spacing={1} alignItems="center">
                  {t.icon}<span>{t.label}</span>
                </Stack>
              } sx={{ justifyContent: 'flex-start', px: 2 }} />
            ))}
          </Tabs>
        </Card>

        {/* Tab content */}
        <Box sx={{ flex: 1 }}>
          {activeKey === 'general'  && <GeneralTab  cfg={cfg} setCfg={setCfg} save={save} saving={saving} msg={msg} />}
          {activeKey === 'password' && <PasswordTab cfg={cfg} setCfg={setCfg} save={save} saving={saving} msg={msg} />}
          {activeKey === 'ntp'      && <NtpTab      cfg={cfg} setCfg={setCfg} save={save} saving={saving} msg={msg} />}
          {activeKey === 'email'    && <EmailTab    cfg={cfg} setCfg={setCfg} save={save} saving={saving} msg={msg} />}
          {activeKey === 'sftp'     && <Sftp />}
          {activeKey === 'audit'    && <AuditTab    cfg={cfg} setCfg={setCfg} save={save} saving={saving} msg={msg} />}
        </Box>
      </Box>
    </Box>
  );
}
