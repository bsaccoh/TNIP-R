import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Stack, Divider,
  Button, IconButton, Drawer, Select, MenuItem,
  FormControl, InputLabel, TextField, CircularProgress,
  Alert, Tab, Tabs, LinearProgress, Tooltip,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import GavelIcon from '@mui/icons-material/Gavel';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import RouteIcon from '@mui/icons-material/Route';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import ArticleIcon from '@mui/icons-material/Article';
import { api } from '../api/client';

/* ── Icon map ────────────────────────────────────────────────────────────── */
const ICONS = {
  BarChart:                  <BarChartIcon sx={{ fontSize: 32 }} />,
  SignalCellularAlt:         <SignalCellularAltIcon sx={{ fontSize: 32 }} />,
  Gavel:                     <GavelIcon sx={{ fontSize: 32 }} />,
  SentimentVeryDissatisfied: <SentimentVeryDissatisfiedIcon sx={{ fontSize: 32 }} />,
  Route:                     <RouteIcon sx={{ fontSize: 32 }} />,
};

const CATEGORY_COLOR = {
  QoS:        '#1565c0',
  Spectrum:   '#4a148c',
  Compliance: '#b71c1c',
  Consumer:   '#1b5e20',
  'Drive Test': '#e65100',
};

/* ── Print engine ────────────────────────────────────────────────────────── */
function printReport(template, data, config) {
  const w = window.open('', '_blank', 'width=1000,height=800');
  w.document.write(buildHtml(template, data, config));
  w.document.close();
  w.onload = () => w.print();
}

function fmt(v, decimals = 1) {
  if (v == null || v === '') return '—';
  return typeof v === 'number' ? v.toFixed(decimals) : v;
}

function pctBar(pct, color = '#1565c0') {
  const safe = Math.min(100, Math.max(0, Number(pct) || 0));
  const bg   = safe >= 80 ? '#2e7d32' : safe >= 60 ? '#e65100' : '#c62828';
  return `<div style="display:flex;align-items:center;gap:6px">
    <div style="flex:1;height:7px;background:#e0e0e0;border-radius:4px;overflow:hidden">
      <div style="width:${safe}%;height:100%;background:${bg};border-radius:4px"></div>
    </div>
    <span style="font-size:11px;font-weight:700;color:${bg};min-width:36px;text-align:right">${safe.toFixed(1)}%</span>
  </div>`;
}

function table(headers, rows, cellStyle = '') {
  return `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px">
    <thead><tr>${headers.map((h) => `<th style="padding:6px 10px;background:#1565c0;color:#fff;text-align:left;font-weight:600">${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r, i) => `<tr style="background:${i % 2 === 0 ? '#fff' : '#f5f5f5'}">${r.map((c) => `<td style="padding:6px 10px;border-bottom:1px solid #e0e0e0;${cellStyle}">${c ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
}

function section(title, content) {
  return `<div style="margin-bottom:28px">
    <h3 style="margin:0 0 10px;font-size:14px;color:#1565c0;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #1565c0;padding-bottom:4px">${title}</h3>
    ${content}
  </div>`;
}

function kv(items) {
  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
    ${items.map(([l, v]) => `<div style="background:#f5f5f5;border-radius:6px;padding:10px">
      <div style="font-size:11px;color:#757575;margin-bottom:2px">${l}</div>
      <div style="font-size:18px;font-weight:700;color:#1565c0">${v ?? '—'}</div>
    </div>`).join('')}
  </div>`;
}

function buildHtml(template, data, config) {
  const now   = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const range = `${config.from} to ${config.to}`;
  let body    = '';

  if (template.id === 'monthly-qos') {
    body += section('Executive Summary', kv([
      ['Overall Compliance', `${data.overallCompliance}%`],
      ['Total Measurements', String(data.totalMeasurements)],
      ['Threshold Violations', String(data.violations?.length ?? 0)],
    ]));

    if (data.violations?.length) {
      body += section('Threshold Violations', table(
        ['Operator', 'KPI', 'Technology', 'Compliance %', 'Threshold'],
        data.violations.map((v) => [
          v.operator, v.kpi, v.technology || '—',
          pctBar(v.compliance_pct),
          `${v.threshold} ${v.unit || ''}`,
        ]),
      ));
    }

    // Group by operator
    const opMap = {};
    (data.kpiRows || []).forEach((r) => {
      if (!opMap[r.operator_name]) opMap[r.operator_name] = [];
      opMap[r.operator_name].push(r);
    });
    for (const [op, rows] of Object.entries(opMap)) {
      body += section(`Operator Scorecard — ${op}`, table(
        ['KPI', 'Tech', 'Avg', 'Min', 'Max', 'Compliance'],
        rows.map((r) => [
          r.kpi_name, r.technology || '—',
          `${r.avg_val} ${r.unit || ''}`,
          `${r.min_val} ${r.unit || ''}`,
          `${r.max_val} ${r.unit || ''}`,
          pctBar(r.compliance_pct),
        ]),
      ));
    }
  }

  if (template.id === 'quarterly-spectrum') {
    body += section('Spectrum Overview', kv([
      ['Total Assignments', String(data.assignments?.length ?? 0)],
      ['Active',           String(data.assignments?.filter((a) => a.status === 'ACTIVE').length ?? 0)],
      ['Interference Cases', String(data.interference?.length ?? 0)],
      ['Expiring (180d)',  String(data.expiring?.length ?? 0)],
      ['Bands',            String(data.bands?.length ?? 0)],
    ]));

    body += section('Band Summary', table(
      ['Band', 'Freq Range (MHz)', 'Operators', 'Total BW (MHz)', 'Technologies'],
      (data.bands || []).map((b) => [
        b.band_name,
        `${b.freq_min}–${b.freq_max}`,
        b.operators,
        Number(b.total_bw).toFixed(1),
        b.technologies || '—',
      ]),
    ));

    body += section('Operator Assignments', table(
      ['Ref', 'Operator', 'Band', 'Frequency (MHz)', 'BW (MHz)', 'Tech', 'Status', 'Expiry'],
      (data.assignments || []).map((a) => [
        a.assignment_ref, a.operator_name, a.band_name,
        `${a.frequency_low}–${a.frequency_high}`,
        a.bandwidth_mhz, a.technology, a.status,
        a.expiry_date ? new Date(a.expiry_date).toLocaleDateString() : '—',
      ]),
    ));

    if (data.interference?.length) {
      body += section('Interference Incidents', table(
        ['Ref', 'Reporter', 'Band', 'Severity', 'Status', 'Reported'],
        data.interference.map((r) => [
          r.report_ref, r.reporter_name || '—', r.band_name || '—',
          r.severity, r.status, new Date(r.reported_at).toLocaleDateString(),
        ]),
      ));
    }

    if (data.expiring?.length) {
      body += section('Expiry Watchlist (Next 180 days)', table(
        ['Assignment', 'Operator', 'Band', 'Expiry Date', 'Days Left'],
        data.expiring.map((a) => [
          a.assignment_ref, a.operator_name, a.band_name,
          new Date(a.expiry_date).toLocaleDateString(), a.days_to_expiry,
        ]),
      ));
    }
  }

  if (template.id === 'annual-compliance') {
    const os = data.oblSummary || {};
    const ps = data.penSummary || {};
    body += section('Overview', kv([
      ['Total Obligations',   String(os.total ?? 0)],
      ['Compliant',           String(os.compliant ?? 0)],
      ['Breached',            String(os.breached ?? 0)],
      ['At Risk',             String(os.atRisk ?? 0)],
      ['Penalties Issued',    String(ps.total ?? 0)],
      ['Total Fines (SLL)',   Number(ps.totalAmount || 0).toLocaleString()],
    ]));

    body += section('License Obligations', table(
      ['Operator', 'Title', 'Type', 'Status', 'Due Date', 'Progress'],
      (data.obligations || []).map((o) => [
        o.operator_name, o.title, o.obligation_type, o.status,
        o.due_date ? new Date(o.due_date).toLocaleDateString() : '—',
        o.target_value ? `${o.current_value ?? 0} / ${o.target_value} ${o.target_unit || ''}` : '—',
      ]),
    ));

    if (data.penalties?.length) {
      body += section('Penalty Assessments', table(
        ['Ref', 'Operator', 'Violation', 'Amount (SLL)', 'Status', 'Issued'],
        data.penalties.map((p) => [
          p.assessment_ref || '—', p.operator_name, p.violation_type || '—',
          Number(p.final_fine || 0).toLocaleString(),
          p.status, p.issued_at ? new Date(p.issued_at).toLocaleDateString() : '—',
        ]),
      ));
    }

    if (data.disputes?.length) {
      body += section('Dispute Resolution', table(
        ['Ref', 'Operator', 'Title', 'Status', 'Filed'],
        data.disputes.map((d) => [
          d.dispute_ref || '—', d.operator_name, d.title || '—',
          d.status, d.created_at ? new Date(d.created_at).toLocaleDateString() : '—',
        ]),
      ));
    }
  }

  if (template.id === 'consumer-qoe') {
    body += section('QoE Summary', kv([
      ['Total Complaints', String(data.total ?? 0)],
      ['Resolved',         String(data.resolved ?? 0)],
      ['Serious (High/Critical)', String(data.serious ?? 0)],
      ['Resolution Rate',  data.total > 0 ? `${((data.resolved / data.total) * 100).toFixed(1)}%` : '—'],
    ]));

    body += section('Complaints by Operator', table(
      ['Operator', 'Total', 'Serious', 'Resolved', 'Pending'],
      (data.byOperator || []).map((r) => [
        r.operator_name || 'Unknown', r.total, r.serious, r.resolved, r.new_count,
      ]),
    ));

    body += section('Complaints by Issue Type', table(
      ['Issue Type', 'Total', 'Serious'],
      (data.byIssueType || []).map((r) => [
        r.issue_type?.replace(/_/g, ' '), r.total, r.serious,
      ]),
    ));

    if (data.byDistrict?.length) {
      body += section('Top Districts by Complaints', table(
        ['District', 'Complaints'],
        (data.byDistrict || []).map((r) => [r.district, r.total]),
      ));
    }
  }

  if (template.id === 'drive-test-summary') {
    const ov = data.overall || {};
    body += section('Overall Statistics', kv([
      ['Total Tests',      String(ov.totalTests ?? 0)],
      ['Total Samples',    String(ov.totalSamples ?? 0)],
      ['Avg RSRP',         ov.avgRsrp != null ? `${ov.avgRsrp} dBm` : '—'],
      ['Avg SINR',         ov.avgSinr != null ? `${ov.avgSinr} dB`  : '—'],
      ['Avg DL Throughput',ov.avgDl   != null ? `${ov.avgDl} Mbps`  : '—'],
      ['RSRP Compliance',  ov.rsrpCompliance != null ? `${ov.rsrpCompliance}%` : '—'],
    ]));

    body += section('Campaign Results', table(
      ['Campaign', 'Operator', 'Tests', 'Samples', 'Avg RSRP', 'Avg SINR', 'RSRP Compliance', 'DL Compliance'],
      (data.campaigns || []).map((c) => [
        c.campaign_name, c.operator_name, c.test_count, c.sample_count,
        fmt(c.avg_rsrp) + ' dBm', fmt(c.avg_sinr) + ' dB',
        c.rsrp_compliance != null ? pctBar(c.rsrp_compliance) : '—',
        c.dl_compliance   != null ? pctBar(c.dl_compliance)   : '—',
      ]),
    ));
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${template.title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #212121; margin: 0; background: #fff; }
  @media print {
    body { margin: 0; }
    .no-print { display: none; }
    @page { margin: 20mm; size: A4; }
  }
</style>
</head><body>
<div style="max-width:900px;margin:0 auto;padding:32px 24px">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1565c0;padding-bottom:16px;margin-bottom:28px">
    <div>
      <div style="font-size:11px;color:#757575;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">National Telecommunications Commission — Sierra Leone</div>
      <h1 style="margin:0;font-size:22px;color:#1565c0">${template.title}</h1>
      <div style="font-size:12px;color:#757575;margin-top:6px">Reporting period: <strong>${range}</strong></div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#757575">Generated</div>
      <div style="font-size:12px;font-weight:600">${now}</div>
      <div style="font-size:11px;color:#9e9e9e;margin-top:4px">TNIP-R Regulatory Platform</div>
    </div>
  </div>
  ${body}
  <div style="border-top:1px solid #e0e0e0;padding-top:12px;margin-top:32px;font-size:10px;color:#9e9e9e;display:flex;justify-content:space-between">
    <span>NATCOM Sierra Leone — CONFIDENTIAL</span>
    <span>Generated by TNIP-R · ${now}</span>
  </div>
</div>
</body></html>`;
}

/* ── Preview panel ───────────────────────────────────────────────────────── */
function PreviewPanel({ template, onClose, operators }) {
  const today    = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [config, setConfig]   = useState({ from: monthAgo, to: today, operatorId: '' });
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState(0);

  const set = (k) => (e) => setConfig((c) => ({ ...c, [k]: e.target.value }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { from: config.from, to: config.to };
      if (config.operatorId) params.operatorId = config.operatorId;
      const res = await api.get(`/reports/templates/${template.id}/data`, { params });
      setData(res.data.data);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [template.id, config.from, config.to, config.operatorId]);

  useEffect(() => { load(); }, [load]);

  const catColor = CATEGORY_COLOR[template.category] || '#1565c0';

  return (
    <Drawer anchor="right" open onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', md: 560 }, display: 'flex', flexDirection: 'column' } }}>
      {/* Header */}
      <Box sx={{ background: `linear-gradient(135deg,${catColor},${catColor}cc)`, p: 2.5, color: '#fff', flexShrink: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.8, letterSpacing: 1 }}>{template.category.toUpperCase()}</Typography>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>{template.title}</Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
        </Stack>
        <Typography variant="caption" sx={{ opacity: 0.85, mt: 1, display: 'block' }}>
          {template.description}
        </Typography>
      </Box>

      {/* Config */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={5}>
            <TextField size="small" fullWidth type="date" label="From"
              InputLabelProps={{ shrink: true }} value={config.from} onChange={set('from')} />
          </Grid>
          <Grid item xs={5}>
            <TextField size="small" fullWidth type="date" label="To"
              InputLabelProps={{ shrink: true }} value={config.to} onChange={set('to')} />
          </Grid>
          <Grid item xs={12}>
            <FormControl size="small" fullWidth>
              <InputLabel>Operator</InputLabel>
              <Select value={config.operatorId} label="Operator" onChange={set('operatorId')}>
                <MenuItem value="">All operators</MenuItem>
                {operators.map((o) => (
                  <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Sections list */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Typography variant="caption" color="text.secondary">Sections included</Typography>
        <Stack direction="row" flexWrap="wrap" spacing={0.5} sx={{ mt: 0.5 }}>
          {template.sections.map((s) => (
            <Chip key={s} label={s} size="small" variant="outlined"
              sx={{ fontSize: '0.65rem', height: 20, mb: 0.5 }} />
          ))}
        </Stack>
      </Box>

      {/* Data preview */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {loading && <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress /></Box>}

        {!loading && !data && (
          <Alert severity="warning">Could not load report data. Ensure the backend is running.</Alert>
        )}

        {!loading && data && <DataPreview template={template} data={data} />}
      </Box>

      {/* Actions */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Stack direction="row" spacing={1.5}>
          <Button fullWidth variant="contained" startIcon={<PrintIcon />}
            disabled={!data}
            onClick={() => printReport(template, data, config)}>
            Print / Export PDF
          </Button>
          <Tooltip title="Re-fetch data">
            <Button variant="outlined" onClick={load} disabled={loading}>
              {loading ? <CircularProgress size={18} /> : 'Refresh'}
            </Button>
          </Tooltip>
        </Stack>
      </Box>
    </Drawer>
  );
}

/* ── Data preview component ──────────────────────────────────────────────── */
function DataPreview({ template, data }) {
  const t = template.id;

  if (t === 'monthly-qos') {
    return (
      <Stack spacing={2}>
        <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
          <Stack direction="row" spacing={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} color="primary">{data.overallCompliance}%</Typography>
              <Typography variant="caption" color="text.secondary">Overall Compliance</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700}>{data.totalMeasurements}</Typography>
              <Typography variant="caption" color="text.secondary">Measurements</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} color={data.violations?.length ? 'error' : 'success.main'}>
                {data.violations?.length ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">Violations</Typography>
            </Box>
          </Stack>
        </Paper>

        {data.violations?.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Threshold Violations
            </Typography>
            <Stack spacing={1}>
              {data.violations.map((v, i) => (
                <Paper key={i} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'error.light', borderRadius: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{v.kpi}</Typography>
                      <Typography variant="caption" color="text.secondary">{v.operator} · {v.technology || 'All'}</Typography>
                    </Box>
                    <Chip size="small" label={`${v.compliance_pct}%`}
                      color={v.compliance_pct >= 80 ? 'success' : v.compliance_pct >= 60 ? 'warning' : 'error'}
                      sx={{ fontSize: '0.68rem' }} />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}

        {data.kpiRows?.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              KPI Compliance by Operator ({data.kpiRows.length} metrics)
            </Typography>
            <Stack spacing={0.75}>
              {data.kpiRows.slice(0, 10).map((r, i) => (
                <Box key={i}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                    <Typography variant="caption">{r.operator_name} · {r.kpi_name}</Typography>
                    <Typography variant="caption" fontWeight={700}>{r.compliance_pct}%</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={r.compliance_pct}
                    sx={{ height: 5, borderRadius: 3,
                          '& .MuiLinearProgress-bar': {
                            bgcolor: r.compliance_pct >= 80 ? '#2e7d32' : r.compliance_pct >= 60 ? '#ed6c02' : '#c62828' } }} />
                </Box>
              ))}
              {data.kpiRows.length > 10 && (
                <Typography variant="caption" color="text.disabled">+{data.kpiRows.length - 10} more in full report</Typography>
              )}
            </Stack>
          </Box>
        )}

        {data.kpiRows?.length === 0 && data.totalMeasurements === 0 && (
          <Alert severity="info">No KPI measurements found for the selected period. Push KPI data via the API gateway to populate this report.</Alert>
        )}
      </Stack>
    );
  }

  if (t === 'quarterly-spectrum') {
    return (
      <Stack spacing={2}>
        <Grid container spacing={1.5}>
          {[
            { l: 'Total Assignments', v: data.assignments?.length },
            { l: 'Active', v: data.assignments?.filter((a) => a.status === 'ACTIVE').length },
            { l: 'Interference', v: data.interference?.length },
            { l: 'Expiring 180d', v: data.expiring?.length },
          ].map(({ l, v }) => (
            <Grid item xs={6} key={l}>
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700}>{v ?? 0}</Typography>
                <Typography variant="caption" color="text.secondary">{l}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
        {data.bands?.map((b) => (
          <Box key={b.band_name}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
              <Typography variant="caption" fontWeight={600}>{b.band_name}</Typography>
              <Typography variant="caption" color="text.secondary">{b.operators} operators · {Number(b.total_bw).toFixed(0)} MHz</Typography>
            </Stack>
            <LinearProgress variant="determinate"
              value={Math.min(100, (Number(b.active) / Math.max(1, Number(b.total_assignments))) * 100)}
              sx={{ height: 6, borderRadius: 3 }} />
          </Box>
        ))}
        {(!data.assignments?.length) && (
          <Alert severity="info">No spectrum assignments found. Add assignments in Spectrum Management.</Alert>
        )}
      </Stack>
    );
  }

  if (t === 'annual-compliance') {
    const os = data.oblSummary || {};
    const ps = data.penSummary || {};
    return (
      <Stack spacing={2}>
        <Grid container spacing={1.5}>
          {[
            { l: 'Obligations',  v: os.total,    color: '#1565c0' },
            { l: 'Compliant',    v: os.compliant, color: '#2e7d32' },
            { l: 'Breached',     v: os.breached,  color: '#c62828' },
            { l: 'At Risk',      v: os.atRisk,    color: '#e65100' },
            { l: 'Penalties',    v: ps.total,     color: '#6a1b9a' },
            { l: 'Fines (USD)',  v: `$${Number(ps.totalAmount||0).toLocaleString()}`, color: '#b71c1c' },
          ].map(({ l, v, color }) => (
            <Grid item xs={4} key={l}>
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700} sx={{ color }}>{v ?? 0}</Typography>
                <Typography variant="caption" color="text.secondary">{l}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
        {data.obligations?.length > 0 && (
          <Stack spacing={0.75}>
            <Typography variant="caption" color="text.secondary">Recent Obligations</Typography>
            {data.obligations.slice(0, 6).map((o, i) => (
              <Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" noWrap sx={{ maxWidth: 260 }}>{o.operator_name} — {o.title}</Typography>
                <Chip size="small" label={o.status}
                  color={o.status === 'COMPLIANT' ? 'success' : o.status === 'BREACHED' ? 'error' : 'warning'}
                  sx={{ fontSize: '0.62rem', height: 18 }} />
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    );
  }

  if (t === 'consumer-qoe') {
    const resRate = data.total > 0 ? ((data.resolved / data.total) * 100).toFixed(1) : 0;
    return (
      <Stack spacing={2}>
        <Grid container spacing={1.5}>
          {[
            { l: 'Total Complaints', v: data.total,    color: '#1565c0' },
            { l: 'Resolved',         v: data.resolved,  color: '#2e7d32' },
            { l: 'Serious',          v: data.serious,   color: '#c62828' },
            { l: 'Resolution Rate',  v: `${resRate}%`,  color: '#4a148c' },
          ].map(({ l, v, color }) => (
            <Grid item xs={6} key={l}>
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700} sx={{ color }}>{v ?? 0}</Typography>
                <Typography variant="caption" color="text.secondary">{l}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
        {data.byIssueType?.slice(0, 6).map((r, i) => (
          <Box key={i}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
              <Typography variant="caption">{r.issue_type?.replace(/_/g, ' ')}</Typography>
              <Typography variant="caption" fontWeight={700}>{r.total}</Typography>
            </Stack>
            <LinearProgress variant="determinate"
              value={data.total > 0 ? (r.total / data.total) * 100 : 0}
              sx={{ height: 5, borderRadius: 3 }} />
          </Box>
        ))}
        {data.total === 0 && (
          <Alert severity="info">No consumer complaints in the selected period.</Alert>
        )}
      </Stack>
    );
  }

  if (t === 'drive-test-summary') {
    const ov = data.overall || {};
    return (
      <Stack spacing={2}>
        <Grid container spacing={1.5}>
          {[
            { l: 'Tests', v: ov.totalTests },
            { l: 'Samples', v: ov.totalSamples },
            { l: 'Avg RSRP', v: ov.avgRsrp != null ? `${ov.avgRsrp} dBm` : '—' },
            { l: 'RSRP Compliance', v: ov.rsrpCompliance != null ? `${ov.rsrpCompliance}%` : '—' },
          ].map(({ l, v }) => (
            <Grid item xs={6} key={l}>
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700}>{v ?? '—'}</Typography>
                <Typography variant="caption" color="text.secondary">{l}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
        {data.campaigns?.length > 0 ? (
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">Campaigns</Typography>
            {data.campaigns.map((c, i) => (
              <Paper key={i} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{c.campaign_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{c.operator_name} · {c.test_count} tests · {c.sample_count} samples</Typography>
                  </Box>
                  {c.rsrp_compliance != null && (
                    <Chip size="small" label={`${c.rsrp_compliance}% RSRP`}
                      color={c.rsrp_compliance >= 80 ? 'success' : 'warning'}
                      sx={{ fontSize: '0.65rem' }} />
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Alert severity="info">No drive test campaigns found for the selected period.</Alert>
        )}
      </Stack>
    );
  }

  return <Alert severity="info">Select a date range and click Refresh to preview data.</Alert>;
}

/* ── Template card ───────────────────────────────────────────────────────── */
function TemplateCard({ template, onSelect }) {
  const color = CATEGORY_COLOR[template.category] || '#1565c0';
  return (
    <Paper elevation={2} onClick={onSelect} sx={{
      p: 2.5, cursor: 'pointer', height: '100%',
      borderTop: `4px solid ${color}`,
      transition: 'transform 0.15s, box-shadow 0.15s',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 },
    }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1.5 }}>
        <Box sx={{ color, flexShrink: 0 }}>{ICONS[template.icon] || <ArticleIcon sx={{ fontSize: 32 }} />}</Box>
        <Box>
          <Chip label={template.category} size="small"
            sx={{ bgcolor: color, color: '#fff', fontSize: '0.62rem', height: 18, mb: 0.5 }} />
          <Typography variant="body1" fontWeight={700} sx={{ lineHeight: 1.2 }}>{template.title}</Typography>
        </Box>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 1.5 }}>
        {template.description}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      <Stack direction="row" spacing={0.5} flexWrap="wrap">
        {template.sections.map((s) => (
          <Chip key={s} label={s} size="small" variant="outlined"
            sx={{ fontSize: '0.6rem', height: 18, mb: 0.25 }} />
        ))}
      </Stack>
      <Button size="small" variant="contained" fullWidth sx={{ mt: 2 }}
        startIcon={<PrintIcon />} onClick={onSelect}>
        Configure & Preview
      </Button>
    </Paper>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function ReportTemplates() {
  const [templates, setTemplates] = useState([]);
  const [operators, setOperators] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [catFilter, setCatFilter] = useState('All');

  useEffect(() => {
    api.get('/reports/templates').then((r) => setTemplates(r.data.data || [])).catch(() => {});
    api.get('/operators').then((r) => setOperators((r.data.data || []).filter((o) => o.status === 'ACTIVE'))).catch(() => {});
  }, []);

  const categories = ['All', ...new Set(templates.map((t) => t.category))];
  const visible    = catFilter === 'All' ? templates : templates.filter((t) => t.category === catFilter);

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg,#212121,#424242)', borderRadius: 2, p: 3, mb: 3, color: '#fff' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
          <ArticleIcon />
          <Typography variant="h5" fontWeight={700}>Regulatory Report Templates</Typography>
        </Stack>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          Pre-built ITU / ECOWAS / NATCOM report formats · configure date range · print or export to PDF
        </Typography>
      </Box>

      {/* Category filter */}
      <Stack direction="row" spacing={1} sx={{ mb: 3 }} flexWrap="wrap">
        {categories.map((c) => (
          <Chip key={c} label={c} onClick={() => setCatFilter(c)}
            variant={catFilter === c ? 'filled' : 'outlined'}
            color={catFilter === c ? 'primary' : 'default'}
            sx={{ fontSize: '0.78rem' }} />
        ))}
      </Stack>

      <Grid container spacing={2.5}>
        {visible.map((t) => (
          <Grid item xs={12} sm={6} md={4} key={t.id}>
            <TemplateCard template={t} onSelect={() => setSelected(t)} />
          </Grid>
        ))}
      </Grid>

      {selected && (
        <PreviewPanel
          template={selected}
          onClose={() => setSelected(null)}
          operators={operators}
        />
      )}
    </Box>
  );
}
