import { useEffect, useState } from 'react';
import {
  Card, CardContent, Typography, Button, Stack, MenuItem, TextField, Box, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, Chip, Grid, LinearProgress, TablePagination,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import DownloadIcon from '@mui/icons-material/Download';
import { get, post } from '../api/client';
import { Loading, EmptyState } from '../components/ui';
import { exportCsv } from '../utils/csv';

function parsePreview(file, maxRows = 10) {
  return new Promise((resolve) => {
    if (!file || !file.name.endsWith('.csv')) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split('\n').filter((l) => l.trim());
      if (!lines.length) { resolve(null); return; }
      const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());
      const rows = lines.slice(1, maxRows + 1).map((line) => {
        const vals = line.split(',').map((v) => v.replace(/^"|"$/g, '').trim());
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
        return obj;
      });
      resolve({ headers, rows, total: lines.length - 1 });
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file.slice(0, 64 * 1024));
  });
}

export default function Ingestion() {
  const [ops, setOps] = useState([]);
  const [operatorId, setOperatorId] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [files, setFiles] = useState(null);
  const [filePage, setFilePage] = useState(0);

  const loadFiles = () =>
    get('/ingestion/files', { limit: 20 }).then((r) => setFiles(r.data)).catch(() => setFiles([]));

  const loadOps = () =>
    get('/operators')
      .then((r) => {
        const list = r.data || [];
        setOps(list);
        if (list[0]) setOperatorId(String(list[0].operator_id));
        if (!list.length) setError('No operators found — seed data may not be loaded or you may need to log in again.');
      })
      .catch(() => setError('Could not load operators — check that the backend is running and you are logged in.'));

  useEffect(() => { loadOps(); loadFiles(); }, []);

  const upload = async (endpoint) => {
    if (!operatorId) { setError('Select an operator first. If the list is empty, ensure the backend is running and refresh the page.'); return; }
    if (!file) { setError('Choose a file to upload.'); return; }
    setBusy(true); setError(''); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('operator_id', operatorId);
      const r = await post(endpoint, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(r.data);
      loadFiles();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Upload failed');
    } finally { setBusy(false); }
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={5}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Upload PM Data</Typography>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField select label="Operator" value={operatorId} onChange={(e) => setOperatorId(e.target.value)} fullWidth>
                  {ops.map((o) => <MenuItem key={o.operator_id} value={String(o.operator_id)}>{o.operator_name}</MenuItem>)}
                </TextField>
                {!ops.length && (
                  <Button size="small" onClick={() => { setError(''); loadOps(); }}>Retry</Button>
                )}
              </Stack>
              <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                {file ? file.name : 'Choose file (.csv / .csv.gz / .tar.gz)'}
                <input hidden type="file" accept=".csv,.gz,.tgz,.tar" onChange={(e) => {
                  const f = e.target.files[0];
                  setFile(f);
                  if (f) parsePreview(f).then(setPreview); else setPreview(null);
                }} />
              </Button>
              {busy && <LinearProgress />}
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={() => upload('/ingestion/upload')} disabled={busy} startIcon={<UploadFileIcon />}>
                  Ingest CSV
                </Button>
                <Button variant="outlined" onClick={() => upload('/ingestion/batch')} disabled={busy} startIcon={<Inventory2Icon />}>
                  Ingest Archive
                </Button>
              </Stack>
              {error && <Alert severity="error">{error}</Alert>}
              {result && (
                <Alert severity="success">
                  {result.ingestion ? (
                    <>Parsed {result.ingestion.rows} rows, {result.ingestion.counters} counters
                      {result.kpi ? ` · ${result.kpi.kpisCalculated ?? 0} KPIs` : ''}
                      {result.compliance ? ` · compliance: ${result.compliance.PASS||0}P/${result.compliance.WARNING||0}W/${result.compliance.FAIL||0}F` : ''}</>
                  ) : (
                    <>Archive: {result.ok}/{result.total} files ingested ({result.duplicates} dup, {result.failed} failed)</>
                  )}
                </Alert>
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" mt={2}>
              Real Huawei <code>pmresult</code> exports and the Geo-Dimension workbook are both supported.
              For production volumes, configure an SFTP feed (POST /sftp).
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {preview && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6">File Preview — First {preview.rows.length} of {preview.total} rows</Typography>
                <Chip size="small" label={file?.name} />
              </Stack>
              <Box sx={{ overflowX: 'auto', maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, minWidth: 32 }}>#</TableCell>
                      {preview.headers.map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.rows.map((row, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ color: 'text.secondary' }}>{i + 1}</TableCell>
                        {preview.headers.map((h) => (
                          <TableCell key={h} sx={{ whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row[h]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      <Grid item xs={12} md={7}>
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6">Recent Files</Typography>
              <Button size="small" startIcon={<DownloadIcon />} disabled={!files?.length}
                onClick={() => exportCsv('ingested_files.csv', [
                  { key: 'operator_name', label: 'Operator' }, { key: 'file_name', label: 'File' },
                  { key: 'format', label: 'Format' }, { key: 'row_count', label: 'Rows' },
                  { key: 'status', label: 'Status' },
                ], files)}>Export</Button>
            </Stack>
            {!files ? <Loading /> : !files.length ? <EmptyState message="No files ingested yet." /> : (
              <>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow><TableCell>Operator</TableCell><TableCell>File</TableCell><TableCell>Type</TableCell><TableCell>Rows</TableCell><TableCell>Status</TableCell></TableRow>
                    </TableHead>
                    <TableBody>
                      {files.slice(filePage * 10, filePage * 10 + 10).map((f) => (
                        <TableRow key={f.pm_file_id} hover>
                          <TableCell>{f.operator_name}</TableCell>
                          <TableCell sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name}</TableCell>
                          <TableCell><Chip size="small" label={f.format || '—'} /></TableCell>
                          <TableCell>{f.row_count}</TableCell>
                          <TableCell><Chip size="small" label={f.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
                <TablePagination component="div" count={files.length} page={filePage} rowsPerPage={10}
                  rowsPerPageOptions={[10]} onPageChange={(_, p) => setFilePage(p)} />
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
