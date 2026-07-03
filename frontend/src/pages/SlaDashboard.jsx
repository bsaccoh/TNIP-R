import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Stack, Divider,
  CircularProgress, Alert, Drawer, IconButton, Select,
  MenuItem, FormControl, InputLabel, LinearProgress, Tooltip,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import CloseIcon from '@mui/icons-material/Close';
import GavelIcon from '@mui/icons-material/Gavel';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { api } from '../api/client';

/* ── RAG palette ─────────────────────────────────────────────────────────── */
const RAG = {
  GREEN: { color: '#2e7d32', bg: 'rgba(46,125,50,0.10)',  label: 'On Track',   chip: 'success' },
  AMBER: { color: '#ed6c02', bg: 'rgba(237,108,2,0.10)',  label: 'At Risk',    chip: 'warning' },
  RED:   { color: '#c62828', bg: 'rgba(198,40,40,0.10)',  label: 'Breaching',  chip: 'error'   },
};

const OBL_STATUS = {
  FULFILLED: 'success', ON_TRACK: 'info', AT_RISK: 'warning',
  BREACHED: 'error', PENDING: 'default', WAIVED: 'default',
};

const OP_COLORS = { Orange: '#ff7900', Africell: '#8e24aa', Qcell: '#5b2d8e', SierraTel: '#00a3e0' };
function opColor(name) {
  for (const [k, v] of Object.entries(OP_COLORS)) {
    if (name?.toLowerCase().includes(k.toLowerCase())) return v;
  }
  return '#1565c0';
}

/* ── Score gauge ─────────────────────────────────────────────────────────── */
function ScoreRing({ score, rag, size = 72 }) {
  const meta   = RAG[rag] || RAG.AMBER;
  const radius = size / 2 - 7;
  const circ   = 2 * Math.PI * radius;
  const dash   = (score / 100) * circ;
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth={7} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={meta.color} strokeWidth={7}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                 alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" fontWeight={800} sx={{ color: meta.color, lineHeight: 1 }}>{score}</Typography>
        <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.secondary' }}>/ 100</Typography>
      </Box>
    </Box>
  );
}

/* ── Compliance mini-bar ─────────────────────────────────────────────────── */
function MiniBar({ label, pct }) {
  const color = pct == null ? '#9e9e9e' : pct >= 80 ? '#2e7d32' : pct >= 55 ? '#ed6c02' : '#c62828';
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="caption" fontWeight={700} sx={{ color: pct != null ? color : 'text.disabled' }}>
          {pct != null ? `${pct}%` : 'N/A'}
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" value={pct ?? 0}
        sx={{ height: 5, borderRadius: 3, bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': { bgcolor: color } }} />
    </Box>
  );
}

/* ── Obligation status distribution bar ──────────────────────────────────── */
function StatusStrip({ obl }) {
  const segs = [
    { k: 'fulfilled', label: 'Fulfilled', color: '#2e7d32', v: obl.fulfilled },
    { k: 'onTrack',   label: 'On Track',  color: '#0288d1', v: obl.onTrack },
    { k: 'atRisk',    label: 'At Risk',   color: '#ed6c02', v: obl.atRisk },
    { k: 'breached',  label: 'Breached',  color: '#c62828', v: obl.breached },
    { k: 'pending',   label: 'Pending',   color: '#9e9e9e', v: obl.pending },
  ].filter((s) => s.v > 0);
  const total = segs.reduce((s, x) => s + x.v, 0) || 1;
  if (!segs.length) return <Typography variant="caption" color="text.disabled">No obligations</Typography>;
  return (
    <Box>
      <Box sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
        {segs.map((s) => (
          <Tooltip key={s.k} title={`${s.label}: ${s.v}`}>
            <Box sx={{ width: `${(s.v / total) * 100}%`, bgcolor: s.color }} />
          </Tooltip>
        ))}
      </Box>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
        {segs.map((s) => (
          <Stack key={s.k} direction="row" spacing={0.4} alignItems="center">
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
            <Typography variant="caption" color="text.secondary">{s.label} {s.v}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

/* ── Stat card ───────────────────────────────────────────────────────────── */
function StatCard({ label, value, color, sub }) {
  return (
    <Paper elevation={2} sx={{ p: 2, borderTop: `4px solid ${color}`, height: '100%' }}>
      <Typography variant="h4" fontWeight={700} color={color}>{value ?? '—'}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      {sub && <Typography variant="caption" color="text.disabled">{sub}</Typography>}
    </Paper>
  );
}

/* ── Scorecard tile ──────────────────────────────────────────────────────── */
function Scorecard({ card, onClick }) {
  const meta = RAG[card.rag] || RAG.AMBER;
  return (
    <Paper elevation={2} onClick={onClick}
      sx={{ p: 2.5, cursor: 'pointer', height: '100%',
            borderLeft: `5px solid ${meta.color}`,
            transition: 'transform 0.15s, box-shadow 0.15s',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: 6 } }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <ScoreRing score={card.score} rag={card.rag} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: opColor(card.operatorName), flexShrink: 0 }} />
            <Typography variant="h6" fontWeight={700} noWrap>{card.operatorName}</Typography>
          </Stack>
          <Chip size="small" label={meta.label} color={meta.chip}
            sx={{ mt: 0.5, fontSize: '0.68rem' }} />
        </Box>
      </Stack>

      <Stack spacing={1.25}>
        <MiniBar label="Obligation Compliance" pct={card.obligations.compliance} />
        <MiniBar label="KPI Compliance" pct={card.kpi.compliance} />
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Stack direction="row" justifyContent="space-between">
        <Stack direction="row" spacing={0.5} alignItems="center">
          <GavelIcon sx={{ fontSize: 15, color: card.penalties.openCount > 0 ? '#c62828' : 'text.disabled' }} />
          <Typography variant="caption" color={card.penalties.openCount > 0 ? 'error' : 'text.secondary'}>
            {card.penalties.openCount} open fine{card.penalties.openCount !== 1 ? 's' : ''}
          </Typography>
        </Stack>
        {card.obligations.breached > 0 && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <ReportProblemIcon sx={{ fontSize: 15, color: '#c62828' }} />
            <Typography variant="caption" color="error">
              {card.obligations.breached} breached
            </Typography>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

/* ── Operator detail drawer ──────────────────────────────────────────────── */
function DetailDrawer({ operatorId, days, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/sla/operator/${operatorId}`, { params: { days } })
      .then((r) => setDetail(r.data.data))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [operatorId, days]);

  const meta = detail ? (RAG[detail.rag] || RAG.AMBER) : RAG.AMBER;

  return (
    <Drawer anchor="right" open onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', md: 620 } } }}>
      {loading && <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress /></Box>}

      {!loading && !detail && (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">Could not load operator detail.</Alert>
        </Box>
      )}

      {!loading && detail && (
        <>
          {/* Header */}
          <Box sx={{ background: `linear-gradient(135deg,${meta.color},${meta.color}bb)`, p: 3, color: '#fff' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Stack direction="row" spacing={2} alignItems="center">
                <ScoreRing score={detail.score} rag={detail.rag} size={64} />
                <Box>
                  <Typography variant="h6" fontWeight={700}>{detail.operatorName}</Typography>
                  <Chip size="small" label={meta.label}
                    sx={{ bgcolor: 'rgba(255,255,255,0.22)', color: '#fff', fontSize: '0.68rem', mt: 0.5 }} />
                </Box>
              </Stack>
              <IconButton size="small" onClick={onClose} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
            </Stack>
          </Box>

          <Box sx={{ p: 2.5 }}>
            {/* Component scores */}
            <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
              <Grid item xs={4}>
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'action.hover', textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="h6" fontWeight={700}>
                    {detail.obligations.compliance != null ? `${detail.obligations.compliance}%` : '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Obligation</Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'action.hover', textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="h6" fontWeight={700}>
                    {detail.kpi.compliance != null ? `${detail.kpi.compliance}%` : '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">KPI</Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'action.hover', textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="h6" fontWeight={700}
                    color={detail.penalties.outstanding > 0 ? 'error' : 'text.primary'}>
                    {detail.penalties.currency} {detail.penalties.outstanding.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Outstanding</Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Obligation distribution */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Obligation Status</Typography>
            <Box sx={{ mb: 2.5 }}><StatusStrip obl={detail.obligations} /></Box>

            {/* Obligation list */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              License Obligations ({detail.obligationList.length})
            </Typography>
            {detail.obligationList.length === 0
              ? <Alert severity="info" sx={{ mb: 2.5 }}>No obligations recorded for this operator.</Alert>
              : (
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2.5 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell>Obligation</TableCell>
                        <TableCell>Progress</TableCell>
                        <TableCell>Due</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detail.obligationList.map((o) => (
                        <TableRow key={o.obligation_id} hover
                          sx={{ bgcolor: o.status === 'BREACHED' ? 'rgba(198,40,40,0.05)' : 'inherit' }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{o.title}</Typography>
                            <Typography variant="caption" color="text.disabled">
                              {o.obligation_type}{o.category ? ` · ${o.category}` : ''}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ minWidth: 110 }}>
                            {o.progress != null ? (
                              <Box>
                                <Typography variant="caption">
                                  {o.current_value ?? 0} / {o.target_value} {o.target_unit || ''}
                                </Typography>
                                <LinearProgress variant="determinate" value={o.progress}
                                  sx={{ height: 4, borderRadius: 2, mt: 0.25,
                                        '& .MuiLinearProgress-bar': {
                                          bgcolor: o.progress >= 80 ? '#2e7d32' : o.progress >= 50 ? '#ed6c02' : '#c62828' } }} />
                              </Box>
                            ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                          </TableCell>
                          <TableCell>
                            {o.due_date ? (
                              <Typography variant="caption"
                                color={o.days_to_due != null && o.days_to_due < 0 ? 'error'
                                     : o.days_to_due != null && o.days_to_due <= 30 ? 'warning.main' : 'text.primary'}>
                                {new Date(o.due_date).toLocaleDateString()}
                                {o.days_to_due != null && (
                                  <><br />{o.days_to_due < 0 ? `${Math.abs(o.days_to_due)}d overdue` : `${o.days_to_due}d left`}</>
                                )}
                              </Typography>
                            ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={o.status.replace('_',' ')}
                              color={OBL_STATUS[o.status] || 'default'} sx={{ fontSize: '0.62rem', height: 20 }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

            {/* Breach timeline */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>SLA Event Timeline</Typography>
            {detail.timeline.length === 0
              ? <Alert severity="success" icon={<CheckCircleIcon />}>No breach or penalty events on record.</Alert>
              : (
                <Box sx={{ position: 'relative', pl: 3 }}>
                  <Box sx={{ position: 'absolute', left: 7, top: 4, bottom: 4, width: 2, bgcolor: 'divider' }} />
                  <Stack spacing={2}>
                    {detail.timeline.map((e, i) => {
                      const isPenalty = e.event_type === 'PENALTY_ISSUED';
                      const color = isPenalty ? '#6a1b9a' : '#c62828';
                      return (
                        <Box key={i} sx={{ position: 'relative' }}>
                          <Box sx={{ position: 'absolute', left: -20, top: 3, width: 12, height: 12,
                                     borderRadius: '50%', bgcolor: color, border: '2px solid', borderColor: 'background.paper' }} />
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Stack direction="row" spacing={0.75} alignItems="center">
                                {isPenalty
                                  ? <GavelIcon sx={{ fontSize: 15, color }} />
                                  : <ReportProblemIcon sx={{ fontSize: 15, color }} />}
                                <Typography variant="body2" fontWeight={600}>
                                  {isPenalty ? 'Penalty Issued' : 'Obligation Breached'}
                                </Typography>
                                <Chip size="small" label={e.severity} sx={{ fontSize: '0.58rem', height: 16 }} />
                              </Stack>
                              <Typography variant="caption" color="text.secondary">
                                {e.ref} — {e.title}
                              </Typography>
                              {isPenalty && e.amount != null && (
                                <Typography variant="caption" display="block" color="error">
                                  {e.currency || 'SLL'} {Number(e.amount).toLocaleString()}
                                </Typography>
                              )}
                            </Box>
                            <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap', ml: 1 }}>
                              {new Date(e.event_date).toLocaleDateString()}
                            </Typography>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              )}
          </Box>
        </>
      )}
    </Drawer>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function SlaDashboard() {
  const [data, setData]       = useState({ summary: {}, scorecards: [] });
  const [loading, setLoading] = useState(true);
  const [days, setDays]       = useState(30);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/sla/overview', { params: { days } });
      setData(res.data.data || { summary: {}, scorecards: [] });
    } catch { setData({ summary: {}, scorecards: [] }); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const { summary, scorecards } = data;

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      {/* Header */}
      <Box sx={{ background: 'linear-gradient(135deg,#004d40,#00695c)', borderRadius: 2, p: 3, mb: 3, color: '#fff' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <FactCheckIcon />
              <Typography variant="h5" fontWeight={700}>SLA Dashboard</Typography>
            </Stack>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Per-operator accountability · license obligations · KPI compliance · penalty exposure
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: 140, bgcolor: 'rgba(255,255,255,0.12)', borderRadius: 1,
                                          '& .MuiInputLabel-root, & .MuiSelect-select, & .MuiSvgIcon-root': { color: '#fff' },
                                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' } }}>
            <InputLabel>KPI Window</InputLabel>
            <Select value={days} label="KPI Window" onChange={(e) => setDays(e.target.value)}>
              {[30, 60, 90].map((d) => <MenuItem key={d} value={d}>Last {d} days</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard label="Avg SLA Score" value={summary.avgScore} color="#00695c"
            sub={`${summary.operators || 0} active operators`} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Breaching (Red)" value={summary.red}
            color={summary.red > 0 ? '#c62828' : '#2e7d32'} sub="operators below threshold" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Breached Obligations" value={summary.totalBreached}
            color={summary.totalBreached > 0 ? '#e65100' : '#2e7d32'} sub="across all operators" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard label="Open Penalties" value={summary.totalOpenPenalties}
            color={summary.totalOpenPenalties > 0 ? '#6a1b9a' : '#757575'} sub="unresolved fines" />
        </Grid>
      </Grid>

      {/* RAG legend */}
      {!loading && scorecards.length > 0 && (
        <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
          {Object.entries(RAG).map(([k, v]) => (
            <Stack key={k} direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: v.color }} />
              <Typography variant="caption" color="text.secondary">
                {v.label} ({k === 'GREEN' ? '80+' : k === 'AMBER' ? '55–79' : '<55'})
                {' · '}{scorecards.filter((s) => s.rag === k).length}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}

      {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>}

      {!loading && scorecards.length === 0 && (
        <Alert severity="info">
          No active operators found, or no obligation/KPI data to score yet.
          Add license obligations and push KPI measurements to populate SLA scores.
        </Alert>
      )}

      {!loading && scorecards.length > 0 && (
        <Grid container spacing={2.5}>
          {scorecards.map((card) => (
            <Grid item xs={12} sm={6} md={4} key={card.operatorId}>
              <Scorecard card={card} onClick={() => setSelected(card.operatorId)} />
            </Grid>
          ))}
        </Grid>
      )}

      {selected && (
        <DetailDrawer operatorId={selected} days={days} onClose={() => setSelected(null)} />
      )}
    </Box>
  );
}
