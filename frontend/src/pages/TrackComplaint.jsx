import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Stack, Chip, Divider,
  CircularProgress, Alert, Stepper, Step, StepLabel, StepConnector,
  useTheme, alpha,
} from '@mui/material';
import CellTowerIcon from '@mui/icons-material/CellTower';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CancelIcon from '@mui/icons-material/Cancel';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const ISSUE_LABELS = {
  NO_COVERAGE: 'No Network Coverage',
  CALL_DROP: 'Call Drop / Disconnection',
  POOR_VOICE_QUALITY: 'Poor Voice Quality',
  SLOW_DATA: 'Slow Internet / Data',
  NO_DATA: 'No Internet / Data',
  SMS_FAILURE: 'SMS Not Delivering',
  BILLING_ISSUE: 'Billing / Charging Problem',
  OTHER: 'Other Issue',
};

const STATUS_CONFIG = {
  NEW:          { label: 'Submitted',     icon: FiberNewIcon,       color: '#1565c0', step: 0 },
  UNDER_REVIEW: { label: 'Under Review',  icon: HourglassTopIcon,  color: '#e65100', step: 1 },
  ESCALATED:    { label: 'Escalated',     icon: ReportProblemIcon,  color: '#c62828', step: 2 },
  RESOLVED:     { label: 'Resolved',      icon: CheckCircleIcon,   color: '#2e7d32', step: 3 },
  DISMISSED:    { label: 'Dismissed',     icon: CancelIcon,        color: '#757575', step: 3 },
};

const SEVERITY_COLORS = {
  LOW: '#757575',
  MEDIUM: '#0277bd',
  HIGH: '#e65100',
  CRITICAL: '#c62828',
};

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function TrackComplaint() {
  const theme = useTheme();
  const [ref, setRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [complaint, setComplaint] = useState(null);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preRef = params.get('ref');
    if (preRef) {
      setRef(preRef);
      lookup(preRef);
    }
  }, []);

  const lookup = async (refOverride) => {
    const searchRef = (refOverride || ref).trim().toUpperCase();
    if (!searchRef) return;
    setLoading(true);
    setError('');
    setComplaint(null);
    setSearched(true);
    try {
      const r = await axios.get(`${BASE}/qoe/track/${encodeURIComponent(searchRef)}`);
      setComplaint(r.data.data);
    } catch (e) {
      setError(
        e.response?.status === 400
          ? 'No complaint found with that reference number. Please double-check and try again.'
          : 'Something went wrong. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  const sc = complaint ? STATUS_CONFIG[complaint.status] || STATUS_CONFIG.NEW : null;
  const StatusIcon = sc?.icon;

  const steps = ['Submitted', 'Under Review', 'Escalated / In Progress', 'Resolved'];
  const activeStep = sc?.step ?? 0;
  const isDismissed = complaint?.status === 'DISMISSED';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg,#0d47a1,#1976d2)', py: 4, px: 2, color: '#fff', textAlign: 'center' }}>
        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 1 }}>
          <CellTowerIcon sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight={700}>Track Your Complaint</Typography>
        </Stack>
        <Typography variant="body2" sx={{ opacity: 0.85, maxWidth: 500, mx: 'auto' }}>
          NatCA — National Telecommunications Authority of Sierra Leone
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          Enter your reference number to check the status of your complaint.
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 640, mx: 'auto', p: 2, pt: 4 }}>
        {/* Search */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Complaint Reference Number
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              placeholder="e.g. QOE-20260715-A1B2"
              value={ref}
              onChange={(e) => setRef(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && lookup()}
              InputProps={{
                sx: { fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: 1 },
              }}
            />
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
              onClick={() => lookup()}
              disabled={loading || !ref.trim()}
              sx={{ minWidth: 140, py: 1.5 }}
            >
              {loading ? 'Searching...' : 'Track'}
            </Button>
          </Stack>
        </Paper>

        {/* Error */}
        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* No result yet */}
        {searched && !loading && !complaint && !error && (
          <Alert severity="info" sx={{ mb: 3 }}>
            No complaint found. Make sure you entered the correct reference number (format: QOE-YYYYMMDD-XXXX).
          </Alert>
        )}

        {/* Result */}
        {complaint && (
          <Paper sx={{ overflow: 'hidden' }}>
            {/* Status banner */}
            <Box sx={{
              p: 3,
              background: `linear-gradient(135deg, ${sc.color}, ${alpha(sc.color, 0.7)})`,
              color: '#fff',
            }}>
              <Stack direction="row" spacing={2} alignItems="center">
                {StatusIcon && <StatusIcon sx={{ fontSize: 40 }} />}
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>Current Status</Typography>
                  <Typography variant="h5" fontWeight={700}>{sc.label}</Typography>
                </Box>
              </Stack>
              <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 1 }}>
                Ref: {complaint.complaint_ref}
              </Typography>
            </Box>

            {/* Progress stepper */}
            {!isDismissed && (
              <Box sx={{ px: 3, pt: 3, pb: 1 }}>
                <Stepper activeStep={activeStep} alternativeLabel>
                  {steps.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Box>
            )}

            {isDismissed && (
              <Alert severity="info" sx={{ m: 2 }}>
                This complaint was reviewed and dismissed by the regulator. If you believe this is
                incorrect, please submit a new report with additional details.
              </Alert>
            )}

            {/* Details */}
            <Box sx={{ p: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                Complaint Details
              </Typography>

              {[
                { label: 'Issue Type',  value: ISSUE_LABELS[complaint.issue_type] || complaint.issue_type },
                { label: 'Operator',    value: complaint.operator_name || '—' },
                { label: 'District',    value: complaint.district || '—' },
                { label: 'Location',    value: complaint.area_detail || '—' },
                { label: 'Severity',    value: complaint.severity, chip: true, chipColor: SEVERITY_COLORS[complaint.severity] },
                { label: 'Submitted',   value: formatDate(complaint.created_at) },
                { label: 'Last Updated', value: formatDate(complaint.updated_at) },
              ].map(({ label, value, chip, chipColor }) => (
                <Box key={label} sx={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  py: 1.25, borderBottom: 1, borderColor: 'divider',
                }}>
                  <Typography variant="body2" color="text.secondary">{label}</Typography>
                  {chip ? (
                    <Chip size="small" label={value}
                      sx={{ bgcolor: alpha(chipColor, 0.12), color: chipColor, fontWeight: 600, fontSize: '0.75rem' }} />
                  ) : (
                    <Typography variant="body2" fontWeight={600}>{value}</Typography>
                  )}
                </Box>
              ))}

              {complaint.description && (
                <>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 3, mb: 1, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                    Your Description
                  </Typography>
                  <Typography variant="body2" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04), p: 2, borderRadius: 1 }}>
                    {complaint.description}
                  </Typography>
                </>
              )}

              {complaint.resolved_at && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                    Resolution
                  </Typography>
                  <Alert severity="success" icon={<CheckCircleIcon />}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                      Resolved on {formatDate(complaint.resolved_at)}
                    </Typography>
                    {complaint.resolution_note && (
                      <Typography variant="body2">{complaint.resolution_note}</Typography>
                    )}
                  </Alert>
                </Box>
              )}
            </Box>
          </Paper>
        )}

        {/* Footer links */}
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4, mb: 2 }}>
          <Button variant="outlined" size="small" href="/report">
            Report a New Issue
          </Button>
        </Stack>

        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 1, mb: 3 }}>
          National Telecommunications Authority (NatCA) · Sierra Leone
          <br />All complaints are processed in accordance with the Telecommunications Act 2006.
        </Typography>
      </Box>
    </Box>
  );
}
