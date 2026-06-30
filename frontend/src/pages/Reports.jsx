import { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, Box, Button, FormControl, InputLabel,
  Select, MenuItem, TextField, Stack, Grid, Chip, Alert, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BarChartIcon from '@mui/icons-material/BarChart';
import SecurityIcon from '@mui/icons-material/Security';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import { get } from '../api/client';
import { Loading } from '../components/ui';

const BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const REPORT_TYPES = [
  { key: 'kpi', label: 'KPI Performance', icon: <BarChartIcon />, description: 'Aggregated daily KPIs per cell — average, min, max values for all operators.' },
  { key: 'compliance', label: 'Compliance Status', icon: <SecurityIcon />, description: 'Threshold compliance results — PASS/WARNING/FAIL per KPI per operator.' },
  { key: 'trend', label: 'KPI Trend Analysis', icon: <TrendingUpIcon />, description: 'Daily KPI trends over time for trend analysis and forecasting.' },
  { key: 'anomaly', label: 'Anomaly Detection', icon: <WarningIcon />, description: 'Anomalous KPI values detected via z-score analysis across cells.' },
];

export default function Reports() {
  const [operators, setOperators] = useState(null);
  const [selectedOp, setSelectedOp] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reportType, setReportType] = useState('kpi');
  const [exportFormat, setExportFormat] = useState('excel');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    get('/operators').then((r) => setOperators(r.data?.rows || r.data || [])).catch(() => setOperators([]));
  }, []);

  const handleDownload = async () => {
    setDownloading(true); setError('');
    const params = new URLSearchParams();
    if (selectedOp) params.append('operatorId', selectedOp);
    if (fromDate) params.append('from', fromDate);
    if (toDate) params.append('to', toDate);
    params.append('type', reportType);

    const token = localStorage.getItem('tnipr_access');
    const opName = selectedOp ? operators.find((o) => String(o.operator_id) === String(selectedOp))?.operator_name || '' : 'All';
    const dateStr = new Date().toISOString().slice(0, 10);

    if (exportFormat === 'pdf') {
      try {
        params.append('format', 'json');
        const res = await fetch(`${BASE}/reports/export/excel?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Download failed (${res.status})`);
        const blob = await res.blob();
        const text = await blob.text();
        let rows;
        try { const json = JSON.parse(text); rows = json.data || json; } catch { rows = []; }
        if (!Array.isArray(rows) || !rows.length) {
          await generatePdfFromExcel(blob, reportType, opName, dateStr);
        } else {
          await generatePdf(rows, reportType, opName, dateStr);
        }
      } catch (err) {
        try {
          const url = `${BASE}/reports/export/excel?${params.toString().replace('format=json', '')}`;
          const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) throw new Error(`Download failed (${res.status})`);
          const blob = await res.blob();
          await generatePdfFromExcel(blob, reportType, opName, dateStr);
        } catch (e2) { setError(e2.message); }
      }
    } else {
      const url = `${BASE}/reports/export/excel?${params.toString()}`;
      try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Download failed (${res.status})`);
        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `TNIP_${reportType}_${opName}_${dateStr}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(link.href);
      } catch (err) { setError(err.message); }
    }
    setDownloading(false);
  };

  if (!operators) return <Loading />;

  const activeReport = REPORT_TYPES.find((r) => r.key === reportType);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h5">Reports & Exports</Typography>

      {/* Report type selector */}
      <Grid container spacing={2}>
        {REPORT_TYPES.map((rt) => (
          <Grid item xs={12} sm={6} md={3} key={rt.key}>
            <Card
              sx={{
                cursor: 'pointer',
                borderLeft: 4,
                borderColor: reportType === rt.key ? 'primary.main' : 'transparent',
                bgcolor: reportType === rt.key ? 'action.selected' : undefined,
                transition: 'all 0.2s',
              }}
              onClick={() => setReportType(rt.key)}
            >
              <CardContent sx={{ pb: '12px !important' }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                  <Box sx={{ color: reportType === rt.key ? 'primary.main' : 'text.secondary' }}>{rt.icon}</Box>
                  <Typography variant="subtitle2" fontWeight={reportType === rt.key ? 700 : 400}>{rt.label}</Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">{rt.description}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Card>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" mb={2}>
            <AssessmentIcon color="primary" />
            <Typography variant="h6">Generate {activeReport?.label} Report</Typography>
          </Stack>

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Operator</InputLabel>
              <Select label="Operator" value={selectedOp} onChange={(e) => setSelectedOp(e.target.value)}>
                <MenuItem value="">All Operators</MenuItem>
                {operators.map((o) => (
                  <MenuItem key={o.operator_id} value={o.operator_id}>{o.operator_name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField size="small" label="From Date" type="date" InputLabelProps={{ shrink: true }}
              value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <TextField size="small" label="To Date" type="date" InputLabelProps={{ shrink: true }}
              value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </Stack>

          {/* Export format */}
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <Typography variant="body2" color="text.secondary">Format:</Typography>
            <ToggleButtonGroup size="small" exclusive value={exportFormat}
              onChange={(_, v) => v && setExportFormat(v)}>
              <ToggleButton value="excel">
                <TableChartIcon sx={{ fontSize: 16, mr: 0.5 }} /> Excel
              </ToggleButton>
              <ToggleButton value="pdf">
                <PictureAsPdfIcon sx={{ fontSize: 16, mr: 0.5 }} /> PDF
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleDownload}
              disabled={downloading}>
              {downloading ? 'Generating...' : `Download ${activeReport?.label} Report`}
            </Button>
            {selectedOp && (
              <Chip label={operators.find((o) => String(o.operator_id) === String(selectedOp))?.operator_name}
                onDelete={() => setSelectedOp('')} color="primary" variant="outlined" />
            )}
          </Stack>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </CardContent>
      </Card>
    </Box>
  );
}

async function generatePdf(rows, type, opName, dateStr) {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(16);
  doc.text('TNIP-R Report', 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Type: ${type.toUpperCase()} | Operator: ${opName} | Generated: ${dateStr}`, 14, 22);

  if (rows.length) {
    const cols = Object.keys(rows[0]);
    doc.autoTable({
      startY: 28,
      head: [cols.map((c) => c.replace(/_/g, ' ').toUpperCase())],
      body: rows.map((r) => cols.map((c) => r[c] ?? '')),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 80, 160], textColor: 255, fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      margin: { left: 14, right: 14 },
    });
  } else {
    doc.text('No data available for the selected filters.', 14, 35);
  }

  doc.save(`TNIP_${type}_${opName}_${dateStr}.pdf`);
}

async function generatePdfFromExcel(blob, type, opName, dateStr) {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(16);
  doc.text('TNIP-R Report', 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Type: ${type.toUpperCase()} | Operator: ${opName} | Generated: ${dateStr}`, 14, 22);
  doc.text('Report exported from Excel data. Open the .xlsx file for detailed data.', 14, 30);

  doc.save(`TNIP_${type}_${opName}_${dateStr}.pdf`);
}
