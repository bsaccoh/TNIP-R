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
import LayersIcon from '@mui/icons-material/Layers';
import { api, get } from '../api/client';
import PageHeader from '../components/PageHeader';
import { generateFullReport, buildTechCfg, clusterFromName, geoCluster } from './DriveTestCluster';

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
  const w = window.open('', '_blank');
  w.document.write(buildHtml(template, data, config));
  w.document.close();
}

function fmt(v, decimals = 1) {
  if (v == null || v === '') return '—';
  return typeof v === 'number' ? v.toFixed(decimals) : v;
}

function pctBar(pct, color = '#1565c0') {
  const safe = Math.min(100, Math.max(0, Number(pct) || 0));
  const bg   = safe >= 80 ? '#2e7d32' : safe >= 60 ? '#e65100' : '#c62828';
  return `<div style="display:flex;align-items:center;gap:8px">
    <div style="flex:1;height:8px;background:#e0e0e0;border-radius:4px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,0.1)">
      <div style="width:${safe}%;height:100%;background:${bg};border-radius:4px"></div>
    </div>
    <span style="font-size:12px;font-weight:700;color:${bg};min-width:36px;text-align:right">${safe.toFixed(1)}%</span>
  </div>`;
}

function table(headers, rows, cellStyle = '') {
  return `<div style="overflow-x:auto;margin-bottom:20px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.1);border:1px solid #e0e0e0">
    <table style="width:100%;border-collapse:collapse;font-size:13.5px;background:#fff">
      <thead>
        <tr>${headers.map((h) => `<th style="padding:10px 12px;background:#1565c0;color:#fff;text-align:left;font-weight:600;font-size:15px">${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.map((r, i) => `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8f9fa'}">
          ${r.map((c) => `<td style="padding:8px 12px;border-bottom:1px solid #e0e0e0;color:#333;${cellStyle}">${c ?? '—'}</td>`).join('')}
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function section(title, content) {
  return `<div style="margin-bottom:32px;page-break-inside:avoid;">
    <h3 style="margin:0 0 16px;font-size:17px;color:#1565c0;text-transform:uppercase;letter-spacing:1.5px;border-bottom:2px solid #1565c0;padding-bottom:6px">${title}</h3>
    ${content}
  </div>`;
}

function kv(items) {
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:16px;margin-bottom:24px">
    ${items.map(([l, v, c]) => `<div style="background:#f8f9fa;border-radius:8px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,0.05);border:1px solid #eee">
      <div style="font-size:13.5px;color:#757575;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">${l}</div>
      <div style="font-size:24px;font-weight:700;color:${c || '#1565c0'}">${v ?? '—'}</div>
    </div>`).join('')}
  </div>`;
}

function buildHtml(template, data, config) {
  const now   = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const range = `${config.from} to ${config.to}`;
  let body    = '';
  let scripts = [];

  const chartBlock = (id, type, chartData, options = {}) => {
    scripts.push(`new Chart(document.getElementById('${id}'), { type: '${type}', data: ${JSON.stringify(chartData)}, options: Object.assign({ responsive: true, maintainAspectRatio: false }, ${JSON.stringify(options)}) });`);
    return `<div style="background:#fff;border-radius:8px;padding:16px;border:1px solid #e0e0e0;box-shadow:0 2px 4px rgba(0,0,0,0.05);height:300px;margin-bottom:20px"><canvas id="${id}"></canvas></div>`;
  };

  if (template.id === 'monthly-qos') {
    body += section('Executive Summary', kv([
      ['Overall Compliance', `${data.overallCompliance}%`],
      ['Total Measurements', String(data.totalMeasurements)],
      ['Threshold Violations', String(data.violations?.length ?? 0)],
    ]));

    const opMap = {};
    (data.kpiRows || []).forEach((r) => {
      if (!opMap[r.operator_name]) opMap[r.operator_name] = [];
      opMap[r.operator_name].push(r);
    });

    const opLabels = Object.keys(opMap);
    if (opLabels.length > 0) {
      const avgData = opLabels.map(op => {
        const rows = opMap[op];
        return (rows.reduce((sum, r) => sum + (Number(r.compliance_pct) || 0), 0) / Math.max(1, rows.length)).toFixed(1);
      });
      body += section('Operator Compliance Comparison', chartBlock('qosChart', 'bar', {
        labels: opLabels,
        datasets: [{ label: 'Avg Compliance %', data: avgData, backgroundColor: '#1565c0' }]
      }, { scales: { y: { beginAtZero: true, max: 100 } } }));
    }

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
    const active = data.assignments?.filter((a) => a.status === 'ACTIVE').length ?? 0;
    const expiring = data.expiring?.length ?? 0;
    
    body += section('Spectrum Overview', kv([
      ['Total Assignments', String(data.assignments?.length ?? 0)],
      ['Active',           String(active)],
      ['Interference Cases', String(data.interference?.length ?? 0)],
      ['Expiring (180d)',  String(expiring)],
      ['Bands',            String(data.bands?.length ?? 0)],
    ]));

    body += section('Assignment Status', chartBlock('spectrumChart', 'doughnut', {
      labels: ['Active', 'Expiring (180d)', 'Other'],
      datasets: [{ data: [active, expiring, Math.max(0, (data.assignments?.length||0) - active - expiring)], backgroundColor: ['#2e7d32', '#e65100', '#9e9e9e'] }]
    }, { maintainAspectRatio: false }));

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
      ['Compliant',           String(os.compliant ?? 0), '#2e7d32'],
      ['Breached',            String(os.breached ?? 0), '#c62828'],
      ['At Risk',             String(os.atRisk ?? 0), '#e65100'],
      ['Penalties Issued',    String(ps.total ?? 0)],
      ['Total Fines (SLL)',   Number(ps.totalAmount || 0).toLocaleString(), '#b71c1c'],
    ]));

    body += section('Obligation Status', chartBlock('oblChart', 'pie', {
      labels: ['Compliant', 'Breached', 'At Risk'],
      datasets: [{ data: [os.compliant ?? 0, os.breached ?? 0, os.atRisk ?? 0], backgroundColor: ['#2e7d32', '#c62828', '#e65100'] }]
    }, { maintainAspectRatio: false }));

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
      ['Resolved',         String(data.resolved ?? 0), '#2e7d32'],
      ['Serious',          String(data.serious ?? 0), '#c62828'],
      ['Resolution Rate',  data.total > 0 ? `${((data.resolved / data.total) * 100).toFixed(1)}%` : '—', '#1565c0'],
    ]));

    const issueLabels = (data.byIssueType || []).map(r => r.issue_type?.replace(/_/g, ' '));
    const issueData = (data.byIssueType || []).map(r => r.total);
    if (issueLabels.length > 0) {
      body += section('Complaints by Issue Type', chartBlock('qoeChart', 'bar', {
        labels: issueLabels,
        datasets: [{ label: 'Total Complaints', data: issueData, backgroundColor: '#4a148c' }]
      }));
    }

    body += section('Complaints by Operator', table(
      ['Operator', 'Total', 'Serious', 'Resolved', 'Pending'],
      (data.byOperator || []).map((r) => [
        r.operator_name || 'Unknown', r.total, r.serious, r.resolved, r.new_count,
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

  if (template.id === 'operator-qoe-benchmark') {
    const gl = data.global || {};
    body += section('National Baseline Overview', kv([
      ['Avg DL Throughput', gl.avgDl != null ? `${(gl.avgDl / 1000).toFixed(2)} Mbps` : '—'],
      ['Avg Voice MOS',    gl.avgMos != null ? `${gl.avgMos.toFixed(2)} / 5.0` : '—'],
      ['Avg Call Setup Time (RTT)', gl.avgRtt != null ? `${gl.avgRtt} ms` : '—'],
      ['Total Measured Distance', gl.distance != null ? `${gl.distance.toLocaleString()} km` : '—'],
    ]));

    body += section('Operator Benchmarking Matrix', table(
      ['Operator', 'Samples', 'Measured Distance', 'Avg DL Throughput', 'Avg Voice MOS', 'Avg Call Setup Latency'],
      (data.operators || []).map((o) => [
        o.name, o.samples.toLocaleString(),
        o.distance != null ? `${o.distance.toLocaleString()} km` : '—',
        o.avgDl != null ? `${(o.avgDl / 1000).toFixed(2)} Mbps` : '—',
        o.avgMos != null ? `${o.avgMos.toFixed(2)} / 5.0` : '—',
        o.avgRtt != null ? `${o.avgRtt} ms` : '—',
      ]),
    ));

    body += `<div style="font-size:11px;color:#555;font-style:italic;margin-top:-10px;margin-bottom:20px;padding:8px 12px;background:#f9f9f9;border-left:3px solid #1565c0;border-radius:3px;">
      <strong>Note on Site Infrastructure:</strong> Orange operates 651 active cell sites, with Africell maintaining a smaller footprint below that level. Sierra Tel has no active drive test log data for the reporting period, and is therefore excluded from benchmarking.
    </div>`;

    body += section('Regional QoS Analysis Slices', table(
      ['Region', 'Operator', 'Samples', 'Measured Distance', 'Avg DL Throughput', 'Avg Voice MOS', 'Avg Call Setup Latency'],
      (data.regions || []).map((r) => [
        r.region, r.operator, r.samples.toLocaleString(),
        r.distance != null ? `${r.distance.toLocaleString()} km` : '—',
        r.avgDl != null ? `${(r.avgDl / 1000).toFixed(2)} Mbps` : '—',
        r.avgMos != null ? `${r.avgMos.toFixed(2)} / 5.0` : '—',
        r.avgRtt != null ? `${r.avgRtt} ms` : '—',
      ]),
    ));
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${template.title}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #212121; margin: 0; background: #f0f2f5; }
  @media print {
    body { background: #fff; margin: 0; }
    .no-print { display: none; }
    .page-container { box-shadow: none !important; margin: 0 !important; padding: 10mm !important; }
    @page { margin: 15mm; size: A4; }
  }
  .page-container {
    max-width: 900px;
    margin: 32px auto;
    padding: 40px;
    background: #fff;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    border-radius: 8px;
  }
  .cover-bar { background: #1565c0; color: #fff; padding: 24px 32px; border-radius: 8px 8px 0 0; margin: -40px -40px 32px -40px; display: flex; justify-content: space-between; align-items: center; }
</style>
</head><body>
<div class="page-container">
  <button class="no-print" onclick="window.print()" style="margin-bottom:24px;padding:10px 24px;background:#1565c0;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;font-weight:600;box-shadow:0 2px 4px rgba(0,0,0,0.15)">
    🖨 Print / Export PDF
  </button>
  <!-- Header -->
  <div class="cover-bar">
    <div>
      <div style="font-size:12px;opacity:0.85;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">NatCA Sierra Leone</div>
      <h1 style="margin:0;font-size:26px;">${template.title}</h1>
      <div style="font-size:13px;opacity:0.9;margin-top:8px">Reporting period: <strong>${range}</strong></div>
    </div>
    <div style="text-align:right">
      <div style="font-size:12px;opacity:0.85">Generated</div>
      <div style="font-size:14px;font-weight:700">${now}</div>
      <div style="font-size:11px;opacity:0.7;margin-top:4px">TNIP-R Platform</div>
    </div>
  </div>
  ${body}
  <div style="border-top:1px solid #e0e0e0;padding-top:16px;margin-top:40px;font-size:11px;color:#9e9e9e;display:flex;justify-content:space-between">
    <span>NatCA Sierra Leone — CONFIDENTIAL</span>
    <span>Generated by TNIP-R Platform · ${now}</span>
  </div>
</div>
<script>
  window.onload = function() {
    ${scripts.join('\n    ')}
    setTimeout(function() { window.print(); }, 600);
  };
</script>
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
      <Box sx={{ p: 2.5, flexShrink: 0, borderBottom: 1, borderColor: 'divider',
                 borderLeft: `3px solid ${catColor}` }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="overline" color="text.secondary">{template.category}</Typography>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>{template.title}</Typography>
          </Box>
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
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

  if (t === 'operator-qoe-benchmark') {
    const gl = data.global || {};
    return (
      <Stack spacing={2}>
        <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>National Baselines (Global)</Typography>
          <Stack direction="row" spacing={3}>
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="h5" fontWeight={700} color="primary">
                {gl.avgDl != null ? `${(gl.avgDl / 1000).toFixed(2)} Mbps` : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">Avg DL Speed</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="h5" fontWeight={700} color="success.main">
                {gl.avgMos != null ? `${gl.avgMos.toFixed(2)}` : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">Voice MOS</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="h5" fontWeight={700} color="warning.main">
                {gl.avgRtt != null ? `${gl.avgRtt} ms` : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">Setup Latency</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="h5" fontWeight={700} color="secondary.main">
                {gl.distance != null ? `${gl.distance.toLocaleString()} km` : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">Total Distance</Typography>
            </Box>
          </Stack>
        </Paper>

        <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: '0.78rem' }, py: 0.5 }}>
          <strong>Infrastructure Note:</strong> Orange operates 651 active cell sites, with Africell maintaining a smaller footprint below that level. Sierra Tel has no active drive test log data for this reporting period.
        </Alert>

        {data.operators?.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Operator Benchmarks
            </Typography>
            <Stack spacing={1}>
              {data.operators.map((o, i) => (
                <Paper key={i} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{o.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {o.samples.toLocaleString()} samples · {o.distance != null ? `${o.distance.toLocaleString()} km` : '—'} · Latency: {o.avgRtt != null ? `${o.avgRtt} ms` : '—'}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Chip size="small" label={o.avgDl != null ? `${(o.avgDl / 1000).toFixed(2)} Mbps` : '—'} color="primary" />
                      <Chip size="small" label={o.avgMos != null ? `MOS: ${o.avgMos.toFixed(2)}` : '—'} color={o.avgMos >= 3.5 ? 'success' : 'warning'} />
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}

        {data.regions?.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Regional Performance Averages
            </Typography>
            <Grid container spacing={1}>
              {data.regions.slice(0, 8).map((r, i) => (
                <Grid item xs={6} key={i}>
                  <Paper elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="body2" fontWeight={700}>{r.region}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {r.operator} · {r.samples.toLocaleString()} samples · {r.distance != null ? `${r.distance.toLocaleString()} km` : '—'}
                    </Typography>
                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                      <Typography variant="caption" color="primary.main" fontWeight={600}>
                        {r.avgDl != null ? `${(r.avgDl / 1000).toFixed(1)} Mbps` : '—'}
                      </Typography>
                      <Typography variant="caption" color="success.main" fontWeight={600}>
                        {r.avgMos != null ? `MOS ${r.avgMos.toFixed(1)}` : '—'}
                      </Typography>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Stack>
    );
  }

  return <Alert severity="info">Select a date range and click Refresh to preview data.</Alert>;
}

/* ── Cluster Map Report Panel ────────────────────────────────────────────── */
function ClusterReportPanel({ onClose }) {
  const [allTests, setAllTests]       = useState(null);
  const [thresholdCfg, setThreshold]  = useState(null);
  const [selectedCluster, setCluster] = useState('');
  const [generating, setGenerating]   = useState(null);
  const [error, setError]             = useState('');

  useEffect(() => {
    get('/drive-tests')
      .then((r) => setAllTests(r.data || []))
      .catch(() => setAllTests([]));
    get('/drive-tests/signal-thresholds')
      .then((r) => setThreshold(buildTechCfg(r.data || [])))
      .catch(() => setThreshold(buildTechCfg([])));
  }, []);

  // Derive unique geographic clusters (strip operator prefix)
  const geoClusters = allTests
    ? [...new Set(
        allTests
          .map((t) => geoCluster(clusterFromName(t.test_name)))
          .filter(Boolean)
      )].sort()
    : [];

  const techs = selectedCluster && allTests
    ? [...new Set(
        allTests
          .filter((t) => geoCluster(clusterFromName(t.test_name)) === selectedCluster)
          .map((t) => t.technology)
          .filter(Boolean)
      )].sort()
    : [];

  const totalTests = selectedCluster && allTests
    ? allTests.filter((t) => geoCluster(clusterFromName(t.test_name)) === selectedCluster).length
    : 0;

  const handleGenerate = async (mode = 'view') => {
    if (!selectedCluster) { setError('Please select a cluster first.'); return; }
    setError('');
    setGenerating(mode);
    try {
      // generateFullReport expects a raw cluster name (e.g. "Africell_Bo_CL01") and applies
      // geoCluster() internally. Find any matching full cluster name to avoid double-stripping.
      const fullCluster = allTests
        .map((t) => clusterFromName(t.test_name))
        .find((c) => c && geoCluster(c) === selectedCluster) || selectedCluster;
      await generateFullReport(fullCluster, allTests, thresholdCfg, {
        downloadHtml: mode === 'html'
      });
    } catch (e) {
      setError(`Failed to generate report: ${e.message}`);
    } finally {
      setGenerating(null);
    }
  };

  const loading = allTests === null;

  return (
    <Drawer anchor="right" open onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', md: 520 }, display: 'flex', flexDirection: 'column' } }}>
      {/* Header */}
      <Box sx={{ p: 2.5, flexShrink: 0, borderBottom: 1, borderColor: 'divider', borderLeft: '3px solid #e65100' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="overline" color="text.secondary">Drive Test</Typography>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>Cluster Map Coverage Report</Typography>
          </Box>
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Full signal coverage report with Leaflet maps, distribution tables, problem areas, dead zone analysis and remarks — for all operators in the selected cluster.
        </Typography>
      </Box>

      {/* Cluster selector */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={18} /> <Typography variant="caption">Loading clusters…</Typography>
          </Box>
        ) : (
          <FormControl size="small" fullWidth>
            <InputLabel>Geographic Cluster</InputLabel>
            <Select value={selectedCluster} label="Geographic Cluster" onChange={(e) => setCluster(e.target.value)}>
              <MenuItem value=""><em>— select cluster —</em></MenuItem>
              {geoClusters.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {selectedCluster && (
          <Box sx={{ mt: 1.5 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {techs.map((t) => (
                <Chip key={t} label={t} size="small"
                  sx={{ bgcolor: t === '3G' ? '#1565c0' : t === '4G' ? '#2e7d32' : '#6a1b9a', color: '#fff', fontSize: '0.65rem' }} />
              ))}
              <Chip label={`${totalTests} drive test files`} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
            </Stack>
          </Box>
        )}
      </Box>

      {/* What's included */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
          Report sections
        </Typography>
        <Stack spacing={0.75}>
          {[
            'Cover page with district, region & country details',
            'Signal Classification legend (per technology)',
            'Side-by-side Leaflet maps — primary & secondary metric',
            'Signal distribution tables with compliance %',
            'Top 10 problem areas per operator',
            'Remarks — status, compliance narrative & recommendations',
            'Dead Zone Analysis map (Critical / Severe / Poor)',
            'Dead Zone remarks with tech-specific root-cause notes',
          ].map((s) => (
            <Stack key={s} direction="row" spacing={1} alignItems="flex-start">
              <Box sx={{ mt: '2px', width: 6, height: 6, borderRadius: '50%', bgcolor: '#e65100', flexShrink: 0 }} />
              <Typography variant="caption">{s}</Typography>
            </Stack>
          ))}
        </Stack>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        {!selectedCluster && !loading && geoClusters.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>No drive test clusters found. Upload TRP files to generate clusters.</Alert>
        )}
      </Box>

      {/* Actions */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Stack spacing={1}>
          <Button fullWidth variant="contained"
            startIcon={generating === 'view' ? <CircularProgress size={16} color="inherit" /> : <PrintIcon />}
            disabled={!selectedCluster || !!generating || loading}
            onClick={() => handleGenerate('view')}
            sx={{ bgcolor: '#e65100', '&:hover': { bgcolor: '#bf360c' } }}>
            {generating === 'view' ? 'Generating…' : 'Open in New Tab'}
          </Button>
          <Button fullWidth variant="outlined"
            startIcon={generating === 'html' ? <CircularProgress size={16} /> : <DownloadIcon />}
            disabled={!selectedCluster || !!generating || loading}
            onClick={() => handleGenerate('html')}>
            {generating === 'html' ? 'Generating…' : 'Download as HTML'}
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
          HTML file includes interactive Leaflet maps · open in any browser to print
        </Typography>
      </Box>
    </Drawer>
  );
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
  const [templates, setTemplates]       = useState([]);
  const [operators, setOperators]       = useState([]);
  const [selected, setSelected]         = useState(null);
  const [catFilter, setCatFilter]       = useState('All');
  const [clusterPanel, setClusterPanel] = useState(false);

  useEffect(() => {
    api.get('/reports/templates').then((r) => setTemplates(r.data.data || [])).catch(() => {});
    api.get('/operators').then((r) => setOperators((r.data.data || []).filter((o) => o.status === 'ACTIVE'))).catch(() => {});
  }, []);

  const categories = ['All', ...new Set(templates.map((t) => t.category))];
  const visible    = catFilter === 'All' ? templates : templates.filter((t) => t.category === catFilter);

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <PageHeader
        icon={<ArticleIcon />}
        title="Regulatory Report Templates"
        subtitle="Pre-built ITU / ECOWAS / NatCA report formats · configure date range · print or export to PDF"
      />

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
        {/* Cluster Map Coverage Report — always shown first in Drive Test category */}
        {(catFilter === 'All' || catFilter === 'Drive Test') && (
          <Grid item xs={12} sm={6} md={4}>
            <Paper elevation={2} onClick={() => setClusterPanel(true)} sx={{
              p: 2.5, cursor: 'pointer', height: '100%',
              borderTop: '4px solid #e65100',
              transition: 'transform 0.15s, box-shadow 0.15s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 },
            }}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1.5 }}>
                <Box sx={{ color: '#e65100', flexShrink: 0 }}><LayersIcon sx={{ fontSize: 32 }} /></Box>
                <Box>
                  <Chip label="Drive Test" size="small"
                    sx={{ bgcolor: '#e65100', color: '#fff', fontSize: '0.62rem', height: 18, mb: 0.5 }} />
                  <Typography variant="body1" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                    Cluster Map Coverage Report
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 1.5 }}>
                Full drive test signal coverage report with Leaflet maps, distribution tables, problem areas,
                dead zone analysis and auto-generated remarks — all operators in one report.
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                {['Coverage Maps', 'Signal Distribution', 'Problem Areas', 'Dead Zones', 'Remarks', 'All Operators'].map((s) => (
                  <Chip key={s} label={s} size="small" variant="outlined"
                    sx={{ fontSize: '0.6rem', height: 18, mb: 0.25 }} />
                ))}
              </Stack>
              <Button size="small" variant="contained" fullWidth sx={{ mt: 2, bgcolor: '#e65100', '&:hover': { bgcolor: '#bf360c' } }}
                startIcon={<PrintIcon />} onClick={() => setClusterPanel(true)}>
                Configure & Generate
              </Button>
            </Paper>
          </Grid>
        )}

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

      {clusterPanel && <ClusterReportPanel onClose={() => setClusterPanel(false)} />}
    </Box>
  );
}
