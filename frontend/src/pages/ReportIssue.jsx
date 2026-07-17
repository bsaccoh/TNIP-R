import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, TextField, MenuItem,
  Select, InputLabel, FormControl, Grid, Stack, Chip,
  CircularProgress, Alert, AlertTitle, Stepper, Step, StepLabel,
  useTheme,
} from '@mui/material';
import CellTowerIcon from '@mui/icons-material/CellTower';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const ISSUE_TYPES = [
  { value: 'NO_COVERAGE',        label: 'No Network Coverage' },
  { value: 'CALL_DROP',          label: 'Call Drop / Disconnection' },
  { value: 'POOR_VOICE_QUALITY', label: 'Poor Voice Quality' },
  { value: 'SLOW_DATA',          label: 'Slow Internet / Data' },
  { value: 'NO_DATA',            label: 'No Internet / Data' },
  { value: 'SMS_FAILURE',        label: 'SMS Not Delivering' },
  { value: 'BILLING_ISSUE',      label: 'Billing / Charging Problem' },
  { value: 'OTHER',              label: 'Other Issue' },
];

const DISTRICTS = [
  'Western Area Urban', 'Western Area Rural', 'Bo', 'Kenema', 'Makeni',
  'Kono', 'Bombali', 'Tonkolili', 'Port Loko', 'Kailahun',
  'Pujehun', 'Bonthe', 'Moyamba', 'Kambia',
];

const SEVERITIES = [
  { value: 'LOW',      label: 'Low — Minor inconvenience' },
  { value: 'MEDIUM',   label: 'Medium — Affects daily use' },
  { value: 'HIGH',     label: 'High — Service completely unusable' },
  { value: 'CRITICAL', label: 'Critical — Emergency / Safety impact' },
];

export default function ReportIssue() {
  const theme = useTheme();
  const [operators, setOperators] = useState([]);
  const [step, setStep]           = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(null);
  const [err, setErr]               = useState('');
  const [gpsStatus, setGpsStatus]   = useState('idle'); // idle | loading | success | error
  const [gpsError, setGpsError]     = useState('');

  const [form, setForm] = useState({
    operatorId: '', issueType: '', severity: 'MEDIUM',
    district: '', areaDetail: '', technology: '',
    description: '',
    reporterName: '', reporterPhone: '', reporterEmail: '',
    latitude: null, longitude: null,
  });

  useEffect(() => {
    axios.get(`${BASE}/qoe/operators`)
      .then((r) => setOperators(r.data.data || []))
      .catch(() => {});
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsStatus('loading');
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        setGpsStatus('success');
      },
      (err) => {
        setGpsStatus('error');
        const msgs = {
          1: 'Location permission denied. Please allow location access and try again.',
          2: 'Unable to determine your location. Please try again.',
          3: 'Location request timed out. Please try again.',
        };
        setGpsError(msgs[err.code] || 'Failed to get location.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const canStep1 = form.issueType && form.operatorId && form.district;

  const submit = async () => {
    setErr('');
    setSubmitting(true);
    try {
      const r = await axios.post(`${BASE}/qoe/submit`, form);
      setSubmitted(r.data.data);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex',
                 alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Paper sx={{ p: 4, maxWidth: 500, width: '100%', textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 72, color: '#2e7d32', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Thank You for Your Report
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Your complaint has been submitted to NATCOM (National Telecommunications Commission).
            Our team will review it and take appropriate action.
          </Typography>
          <Chip label={`Ref: ${submitted.complaint_ref}`}
                sx={{ fontFamily: 'monospace', fontSize: '1rem', px: 2, py: 1, mb: 3 }} />
          <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 2 }}>
            Save your reference number to track your complaint status.
          </Typography>
          <Button variant="outlined" href={`/track?ref=${submitted.complaint_ref}`}
            sx={{ mb: 2 }} fullWidth>
            Track My Complaint
          </Button>
          <Button variant="contained" onClick={() => { setSubmitted(null); setStep(0);
            setGpsStatus('idle'); setGpsError('');
            setForm({ operatorId:'', issueType:'', severity:'MEDIUM', district:'',
                      areaDetail:'', technology:'', description:'',
                      reporterName:'', reporterPhone:'', reporterEmail:'',
                      latitude: null, longitude: null }); }}>
            Submit Another Report
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg,#0d47a1,#1976d2)', py: 4, px: 2, color: '#fff', textAlign: 'center' }}>
        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 1 }}>
          <CellTowerIcon sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight={700}>Report a Network Issue</Typography>
        </Stack>
        <Typography variant="body2" sx={{ opacity: 0.85, maxWidth: 500, mx: 'auto' }}>
          NATCOM — National Telecommunications Commission of Sierra Leone
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Your report helps us monitor and improve network quality across the country.
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 680, mx: 'auto', p: 2, pt: 4 }}>
        <Stepper activeStep={step} sx={{ mb: 4 }}>
          <Step><StepLabel>Issue Details</StepLabel></Step>
          <Step><StepLabel>Your Information</StepLabel></Step>
          <Step><StepLabel>Review & Submit</StepLabel></Step>
        </Stepper>

        <Paper sx={{ p: 3 }}>
          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

          {/* Step 1 — Issue */}
          {step === 0 && (
            <Stack spacing={3}>
              <Typography variant="h6" fontWeight={700}>What happened?</Typography>

              <FormControl fullWidth required>
                <InputLabel>Network Operator</InputLabel>
                <Select value={form.operatorId} label="Network Operator *" onChange={set('operatorId')}>
                  {operators.map((o) => (
                    <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>Issue Type</InputLabel>
                <Select value={form.issueType} label="Issue Type *" onChange={set('issueType')}>
                  {ISSUE_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth required>
                <InputLabel>District / Area</InputLabel>
                <Select value={form.district} label="District / Area *" onChange={set('district')}>
                  {DISTRICTS.map((d) => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField fullWidth label="Specific Location (optional)"
                placeholder="e.g. Lumley Beach Road, near Total petrol station"
                value={form.areaDetail} onChange={set('areaDetail')} />

              <Box>
                <Button
                  variant={gpsStatus === 'success' ? 'contained' : 'outlined'}
                  color={gpsStatus === 'success' ? 'success' : 'primary'}
                  startIcon={gpsStatus === 'loading' ? <CircularProgress size={18} /> : <MyLocationIcon />}
                  onClick={detectLocation}
                  disabled={gpsStatus === 'loading'}
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  {gpsStatus === 'idle' && 'Use My Current Location'}
                  {gpsStatus === 'loading' && 'Detecting Location...'}
                  {gpsStatus === 'success' && `Location Detected (${form.latitude.toFixed(4)}, ${form.longitude.toFixed(4)})`}
                  {gpsStatus === 'error' && 'Retry Location Detection'}
                </Button>
                {gpsStatus === 'success' && (
                  <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                    GPS coordinates will be attached to your report for precise network mapping.
                  </Typography>
                )}
                {gpsStatus === 'error' && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    {gpsError}
                  </Typography>
                )}
              </Box>

              <FormControl fullWidth>
                <InputLabel>How severe is the problem?</InputLabel>
                <Select value={form.severity} label="How severe is the problem?"
                  onChange={set('severity')}>
                  {SEVERITIES.map((s) => (
                    <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField fullWidth multiline rows={3}
                label="Describe the problem (optional)"
                placeholder="Tell us more — when it started, how often it happens, what you were trying to do..."
                value={form.description} onChange={set('description')} />

              <Button variant="contained" size="large" fullWidth
                disabled={!canStep1} onClick={() => setStep(1)}>
                Continue
              </Button>
            </Stack>
          )}

          {/* Step 2 — Reporter info */}
          {step === 1 && (
            <Stack spacing={3}>
              <Typography variant="h6" fontWeight={700}>Your Contact Information</Typography>
              <Alert severity="info">
                This information is optional. Providing it helps NATCOM follow up with you about
                your complaint. Your details are kept confidential.
              </Alert>

              <TextField fullWidth label="Your Name (optional)"
                value={form.reporterName} onChange={set('reporterName')} />

              <TextField fullWidth label="Phone Number (optional)"
                placeholder="+232 XX XXX XXXX"
                value={form.reporterPhone} onChange={set('reporterPhone')} />

              <TextField fullWidth label="Email Address (optional)"
                type="email"
                value={form.reporterEmail} onChange={set('reporterEmail')} />

              <Stack direction="row" spacing={2}>
                <Button variant="outlined" fullWidth onClick={() => setStep(0)}>Back</Button>
                <Button variant="contained" fullWidth onClick={() => setStep(2)}>Continue</Button>
              </Stack>
            </Stack>
          )}

          {/* Step 3 — Review */}
          {step === 2 && (
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={700}>Review Your Report</Typography>

              {[
                { label: 'Operator',    value: operators.find((o) => o.operator_id == form.operatorId)?.operator_name },
                { label: 'Issue',       value: ISSUE_TYPES.find((t) => t.value === form.issueType)?.label },
                { label: 'District',    value: form.district },
                { label: 'Location',    value: form.areaDetail || '—' },
                { label: 'GPS',         value: form.latitude ? `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}` : 'Not provided' },
                { label: 'Severity',    value: SEVERITIES.find((s) => s.value === form.severity)?.label },
                { label: 'Description', value: form.description || '—' },
              ].map(({ label, value }) => (
                <Box key={label} sx={{ display: 'flex', gap: 2, py: 1,
                                       borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ width: 110, flexShrink: 0 }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>{value}</Typography>
                </Box>
              ))}

              {form.reporterName && (
                <Box sx={{ py: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ width: 110, flexShrink: 0 }}>Reporter</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {form.reporterName}{form.reporterPhone ? ` · ${form.reporterPhone}` : ''}
                  </Typography>
                </Box>
              )}

              <Alert severity="warning" sx={{ mt: 1 }}>
                By submitting this report, you confirm that the information provided is accurate.
                False reports may be subject to regulatory action.
              </Alert>

              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                <Button variant="outlined" fullWidth onClick={() => setStep(1)} disabled={submitting}>
                  Back
                </Button>
                <Button variant="contained" color="primary" fullWidth
                  onClick={submit} disabled={submitting}>
                  {submitting ? <CircularProgress size={20} /> : 'Submit Report'}
                </Button>
              </Stack>
            </Stack>
          )}
        </Paper>

        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
          National Telecommunications Commission (NATCOM) · Sierra Leone
          <br />All complaints are processed in accordance with the Telecommunications Act 2006.
        </Typography>
      </Box>
    </Box>
  );
}
