import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export interface ReportData {
  meta: {
    test_name?: string;
    operator_name?: string;
    technology?: string;
    test_date?: string;
    route_type?: string;
    tester_name?: string;
    device_model?: string;
    duration_seconds?: number;
    distance_km?: number;
    sample_count?: number;
  };
  stats: {
    avg_rsrp?: number;
    min_rsrp?: number;
    max_rsrp?: number;
    avg_sinr?: number;
    avg_dl_throughput?: number;
    rsrp_excellent?: number;
    rsrp_good?: number;
    rsrp_fair?: number;
    rsrp_poor?: number;
  };
  compliance: {
    status?: string;
    checks_passed?: number;
    checks_total?: number;
    threshold_rsrp?: number;
    threshold_sinr?: number;
    threshold_dl?: number;
    checks?: Array<{
      label: string;
      actual: number | string;
      required: number | string;
      passed: boolean;
    }>;
  };
}

function rsrpLabel(v: number | null | undefined) {
  if (v == null) return 'N/A';
  if (v >= -80) return 'Excellent';
  if (v >= -90) return 'Good';
  if (v >= -100) return 'Fair';
  return 'Poor';
}

function rsrpColor(v: number | null | undefined) {
  if (v == null) return '#90A4AE';
  if (v >= -80) return '#2E7D32';
  if (v >= -90) return '#558B2F';
  if (v >= -100) return '#F9A825';
  return '#C62828';
}

function complianceColor(status?: string) {
  if (status === 'PASS') return '#2E7D32';
  if (status === 'FAIL') return '#C62828';
  return '#F9A825';
}

function fmt(seconds?: number) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}h ${m}m ${s}s`
    : `${m}m ${s}s`;
}

function buildHtml(data: ReportData): string {
  const { meta, stats, compliance } = data;
  const status = compliance?.status ?? 'N/A';
  const statusColor = complianceColor(status);
  const checks = compliance?.checks ?? [];
  const totalPct = stats ? (() => {
    const total = (stats.rsrp_excellent ?? 0) + (stats.rsrp_good ?? 0) + (stats.rsrp_fair ?? 0) + (stats.rsrp_poor ?? 0);
    return total;
  })() : 0;

  const barPct = (n?: number) =>
    totalPct > 0 && n != null ? Math.round((n / totalPct) * 100) : 0;

  const generatedAt = new Date().toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Drive Test Report — ${meta?.test_name ?? 'Untitled'}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Arial, sans-serif; color: #1a1a2e; background: #fff; font-size: 13px; }

  .header { background: #0D47A1; color: #fff; padding: 28px 32px 24px; }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .logo-line { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.7; margin-bottom: 6px; }
  .report-title { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .report-sub { font-size: 13px; opacity: 0.75; }
  .status-badge {
    padding: 8px 20px; border-radius: 20px; font-size: 16px; font-weight: 800;
    background: ${statusColor}; color: #fff; text-align: center; min-width: 90px;
  }
  .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; margin-top: 20px; }
  .meta-cell { padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.15); }
  .meta-lbl { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; opacity: 0.6; margin-bottom: 2px; }
  .meta-val { font-size: 13px; font-weight: 600; }

  .section { padding: 22px 32px; border-bottom: 1px solid #eef0f5; }
  .section-title { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #0D47A1; margin-bottom: 14px; }

  .kpi-row { display: flex; gap: 12px; }
  .kpi-card { flex: 1; border: 1px solid #eef0f5; border-radius: 8px; padding: 14px 12px; text-align: center; background: #f8faff; }
  .kpi-val { font-size: 24px; font-weight: 800; }
  .kpi-unit { font-size: 10px; color: #757575; margin-top: 1px; }
  .kpi-lbl { font-size: 11px; color: #757575; margin-top: 6px; font-weight: 600; }

  .dist-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .dist-lbl { width: 70px; font-size: 12px; font-weight: 600; }
  .dist-track { flex: 1; height: 10px; background: #eef0f5; border-radius: 5px; overflow: hidden; }
  .dist-pct { font-size: 12px; color: #555; width: 36px; text-align: right; }

  .check-row { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; gap: 10px; }
  .check-icon { width: 22px; height: 22px; border-radius: 11px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
  .check-pass { background: #E8F5E9; color: #2E7D32; }
  .check-fail { background: #FFEBEE; color: #C62828; }
  .check-label { flex: 1; font-size: 13px; }
  .check-actual { font-size: 12px; color: #555; }
  .check-req { font-size: 11px; color: #9E9E9E; }
  .check-result { font-size: 12px; font-weight: 700; }

  .footer { padding: 16px 32px; font-size: 10px; color: #9E9E9E; display: flex; justify-content: space-between; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<!-- ── HEADER ── -->
<div class="header">
  <div class="header-top">
    <div>
      <div class="logo-line">National Telecommunication Infrastructure Programme — TNIP-R</div>
      <div class="report-title">${meta?.test_name ?? 'Drive Test Report'}</div>
      <div class="report-sub">${meta?.operator_name ?? ''} · ${meta?.technology ?? ''} · ${meta?.test_date ?? ''}</div>
    </div>
    <div class="status-badge">${status}</div>
  </div>
  <div class="meta-grid">
    <div class="meta-cell"><div class="meta-lbl">Route Type</div><div class="meta-val">${meta?.route_type ?? '—'}</div></div>
    <div class="meta-cell"><div class="meta-lbl">Duration</div><div class="meta-val">${fmt(meta?.duration_seconds)}</div></div>
    <div class="meta-cell"><div class="meta-lbl">Distance</div><div class="meta-val">${meta?.distance_km != null ? meta.distance_km.toFixed(2) + ' km' : '—'}</div></div>
    <div class="meta-cell"><div class="meta-lbl">Samples</div><div class="meta-val">${meta?.sample_count ?? '—'}</div></div>
    <div class="meta-cell"><div class="meta-lbl">Tester</div><div class="meta-val">${meta?.tester_name ?? '—'}</div></div>
    <div class="meta-cell"><div class="meta-lbl">Device</div><div class="meta-val">${meta?.device_model ?? '—'}</div></div>
  </div>
</div>

<!-- ── SIGNAL KPIs ── -->
<div class="section">
  <div class="section-title">Signal Quality</div>
  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-val" style="color:${rsrpColor(stats?.avg_rsrp)}">${stats?.avg_rsrp != null ? stats.avg_rsrp.toFixed(1) : '—'}</div>
      <div class="kpi-unit">dBm</div>
      <div class="kpi-lbl">Avg RSRP · ${rsrpLabel(stats?.avg_rsrp)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val" style="color:#0D47A1">${stats?.avg_sinr != null ? stats.avg_sinr.toFixed(1) : '—'}</div>
      <div class="kpi-unit">dB</div>
      <div class="kpi-lbl">Avg SINR</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val" style="color:#00838F">${stats?.avg_dl_throughput != null ? (stats.avg_dl_throughput / 1000).toFixed(1) : '—'}</div>
      <div class="kpi-unit">Mbps</div>
      <div class="kpi-lbl">Avg DL</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-val" style="color:#555">${stats?.min_rsrp != null ? stats.min_rsrp.toFixed(0) : '—'} / ${stats?.max_rsrp != null ? stats.max_rsrp.toFixed(0) : '—'}</div>
      <div class="kpi-unit">dBm</div>
      <div class="kpi-lbl">Min / Max RSRP</div>
    </div>
  </div>
</div>

<!-- ── RSRP DISTRIBUTION ── -->
${totalPct > 0 ? `
<div class="section">
  <div class="section-title">RSRP Distribution</div>
  ${[
    { label: 'Excellent', count: stats?.rsrp_excellent, color: '#2E7D32' },
    { label: 'Good',      count: stats?.rsrp_good,      color: '#558B2F' },
    { label: 'Fair',      count: stats?.rsrp_fair,      color: '#F9A825' },
    { label: 'Poor',      count: stats?.rsrp_poor,      color: '#C62828' },
  ].map(({ label, count, color }) => `
    <div class="dist-row">
      <div class="dist-lbl" style="color:${color}">${label}</div>
      <div class="dist-track">
        <div style="width:${barPct(count)}%;height:100%;background:${color};border-radius:5px"></div>
      </div>
      <div class="dist-pct">${barPct(count)}%</div>
    </div>
  `).join('')}
</div>
` : ''}

<!-- ── COMPLIANCE CHECKS ── -->
${checks.length > 0 ? `
<div class="section">
  <div class="section-title">Compliance Checks (${compliance?.checks_passed ?? 0} / ${compliance?.checks_total ?? checks.length} passed)</div>
  ${checks.map((c) => `
    <div class="check-row">
      <div class="check-icon ${c.passed ? 'check-pass' : 'check-fail'}">${c.passed ? '✓' : '✗'}</div>
      <div style="flex:1">
        <div class="check-label">${c.label}</div>
        <div class="check-req">Requirement: ${c.required}</div>
      </div>
      <div style="text-align:right">
        <div class="check-actual">${c.actual}</div>
        <div class="check-result" style="color:${c.passed ? '#2E7D32' : '#C62828'}">${c.passed ? 'PASS' : 'FAIL'}</div>
      </div>
    </div>
  `).join('')}
</div>
` : ''}

<!-- ── FOOTER ── -->
<div class="footer">
  <span>TNIP-R Drive Tester · Exported ${generatedAt}</span>
  <span>Sierra Leone Telecom Regulatory Authority</span>
</div>

</body>
</html>`;
}

export async function exportReportAsPdf(data: ReportData): Promise<void> {
  const html = buildHtml(data);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const testName = (data.meta?.test_name ?? 'report').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const date = (data.meta?.test_date ?? new Date().toISOString().slice(0, 10)).replace(/[^0-9]/g, '');
  const fileName = `tnip_report_${testName}_${date}.pdf`;

  // Share via the OS share sheet (saves to Files / Drive / WhatsApp etc.)
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Share ${fileName}`,
      UTI: 'com.adobe.pdf',
    });
  } else {
    throw new Error('Sharing is not available on this device');
  }
}
