import { useEffect, useState, useMemo } from 'react';
import {
  Typography, Box, Button, Stack, Chip, TextField, InputAdornment,
  Paper, Avatar, LinearProgress, alpha, Divider, IconButton, Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CalculateIcon from '@mui/icons-material/Calculate';
import DownloadIcon from '@mui/icons-material/Download';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import SpeedIcon from '@mui/icons-material/Speed';
import CellTowerIcon from '@mui/icons-material/CellTower';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts';
import { get, post } from '../api/client';
import { Loading, EmptyState, fmt } from '../components/ui';
import { colorFor, opColor } from '../theme';
import { exportCsv } from '../utils/csv';
import { useColorMode } from '../theme/ColorMode';

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const MEDAL_LABELS = ['1st', '2nd', '3rd'];

function TrendIcon({ trend }) {
  if (trend === 'UP') return <TrendingUpIcon sx={{ fontSize: 18, color: '#22c55e' }} />;
  if (trend === 'DOWN') return <TrendingDownIcon sx={{ fontSize: 18, color: '#ef4444' }} />;
  return <TrendingFlatIcon sx={{ fontSize: 18, color: 'text.disabled' }} />;
}

function scoreGrade(score) {
  if (score >= 90) return { label: 'Excellent', color: '#22c55e' };
  if (score >= 75) return { label: 'Good', color: '#84cc16' };
  if (score >= 60) return { label: 'Fair', color: '#f59e0b' };
  if (score >= 40) return { label: 'Poor', color: '#f97316' };
  return { label: 'Critical', color: '#ef4444' };
}

function PodiumCard({ row, rank, isTop }) {
  const oc = opColor(row.operator_name);
  const grade = scoreGrade(row.qos_score);
  const medalColor = MEDAL_COLORS[rank] || 'transparent';
  const isGold = rank === 0;

  return (
    <Paper sx={{
      p: 0, overflow: 'hidden', borderRadius: 3,
      border: '1px solid', borderColor: isGold ? alpha(medalColor, 0.4) : 'divider',
      position: 'relative',
      transition: 'all 0.3s',
      ...(isGold && {
        boxShadow: `0 0 20px ${alpha(medalColor, 0.15)}`,
      }),
    }}>
      {/* Top gradient banner */}
      <Box sx={{
        height: 6,
        background: `linear-gradient(90deg, ${oc}, ${alpha(oc, 0.3)})`,
      }} />

      <Box sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Rank badge */}
          <Box sx={{
            width: 48, height: 48, borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            background: rank < 3
              ? `linear-gradient(135deg, ${medalColor}, ${alpha(medalColor, 0.6)})`
              : 'action.hover',
            color: rank < 3 ? '#000' : 'text.primary',
          }}>
            {rank < 3 ? (
              <EmojiEventsIcon sx={{ fontSize: 26 }} />
            ) : (
              <Typography sx={{ fontSize: 20, fontWeight: 800 }}>#{rank + 1}</Typography>
            )}
          </Box>

          {/* Operator info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={0.3}>
              <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{row.operator_name}</Typography>
              <TrendIcon trend={row.trend} />
              {rank < 3 && (
                <Chip label={MEDAL_LABELS[rank]} size="small"
                  sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: alpha(medalColor, 0.15), color: medalColor }} />
              )}
            </Stack>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              Period: {row.period}
            </Typography>
          </Box>

          {/* Score */}
          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
            <Typography sx={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: grade.color }}>
              {fmt(row.qos_score, 1)}
            </Typography>
            <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.3 }}>/ 100</Typography>
          </Box>
        </Stack>

        {/* Score bar */}
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography sx={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
              Composite QoS Score
            </Typography>
            <Chip label={grade.label} size="small"
              sx={{ height: 18, fontSize: 9, fontWeight: 700, bgcolor: alpha(grade.color, 0.12), color: grade.color }} />
          </Stack>
          <Box sx={{ position: 'relative', height: 10, borderRadius: 5, bgcolor: 'action.hover', overflow: 'hidden' }}>
            <Box sx={{
              position: 'absolute', top: 0, left: 0, bottom: 0,
              width: `${Math.min(row.qos_score, 100)}%`,
              borderRadius: 5,
              background: `linear-gradient(90deg, ${oc}, ${grade.color})`,
              transition: 'width 1s ease-out',
            }} />
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

function CompactRow({ row, rank }) {
  const oc = opColor(row.operator_name);
  const grade = scoreGrade(row.qos_score);

  return (
    <Paper sx={{
      px: 2, py: 1.2, borderRadius: 2,
      border: '1px solid', borderColor: 'divider',
      display: 'flex', alignItems: 'center', gap: 1.5,
      transition: 'all 0.15s',
      '&:hover': { bgcolor: 'action.hover', borderColor: oc },
    }}>
      <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'text.secondary', width: 28, textAlign: 'center' }}>
        #{rank + 1}
      </Typography>
      <Avatar sx={{ width: 32, height: 32, bgcolor: oc, fontSize: 13, fontWeight: 700 }}>
        {row.operator_name.charAt(0)}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{row.operator_name}</Typography>
          <TrendIcon trend={row.trend} />
        </Stack>
        <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover', mt: 0.5, overflow: 'hidden' }}>
          <Box sx={{
            height: '100%', width: `${Math.min(row.qos_score, 100)}%`,
            borderRadius: 2, bgcolor: grade.color,
            transition: 'width 1s ease-out',
          }} />
        </Box>
      </Box>
      <Typography sx={{ fontSize: 16, fontWeight: 800, color: grade.color, minWidth: 42, textAlign: 'right' }}>
        {fmt(row.qos_score, 1)}
      </Typography>
    </Paper>
  );
}

export default function Ranking() {
  const { mode } = useColorMode();
  const [rows, setRows] = useState(null);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    get('/rankings').then((r) => setRows(r.data)).catch(() => setRows([]));
    get('/rankings/history').then((r) => setHistory(r.data || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const chartData = useMemo(() => {
    const byPeriod = {};
    for (const h of history) {
      if (!byPeriod[h.period]) byPeriod[h.period] = { period: h.period };
      byPeriod[h.period][h.operator_name] = Number(h.qos_score);
    }
    return Object.values(byPeriod).sort((a, b) => a.period.localeCompare(b.period));
  }, [history]);

  const operators = useMemo(() =>
    [...new Set(history.map((h) => h.operator_name))].sort()
  , [history]);

  const compute = async () => {
    setBusy(true);
    try { await post('/rankings/compute', {}); load(); } finally { setBusy(false); }
  };

  if (!rows) return <Loading />;

  const filtered = (rows || []).filter((r) =>
    !search || r.operator_name.toLowerCase().includes(search.toLowerCase())
  );

  const topOperator = rows?.[0];
  const avgScore = rows?.length ? rows.reduce((s, r) => s + Number(r.qos_score), 0) / rows.length : 0;

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.3px' }}>
            Operator Ranking
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Composite QoS performance scores across all operators
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<DownloadIcon />} disabled={!rows?.length}
            onClick={() => exportCsv('operator_ranking.csv', [
              { key: 'rank_position', label: 'Rank' }, { key: 'operator_name', label: 'Operator' },
              { key: 'qos_score', label: 'QoS Score' }, { key: 'period', label: 'Period' },
              { key: 'trend', label: 'Trend' },
            ], rows)}>Export</Button>
          <Button startIcon={<CalculateIcon />} variant="outlined" onClick={compute} disabled={busy}>
            {busy ? 'Computing…' : 'Recompute rankings'}
          </Button>
        </Stack>
      </Stack>

      {!rows.length ? (
        <EmptyState message="No rankings yet." hint="Ingest data, then click Recompute rankings." />
      ) : (
        <Stack spacing={3}>
          {/* Summary stats */}
          <Stack direction="row" spacing={2}>
            {[
              { label: 'Leading Operator', value: topOperator?.operator_name || '--', icon: <EmojiEventsIcon />, color: '#FFD700' },
              { label: 'Top Score', value: fmt(topOperator?.qos_score, 1), icon: <SpeedIcon />, color: '#22c55e' },
              { label: 'Average Score', value: fmt(avgScore, 1), icon: <SignalCellularAltIcon />, color: '#3b82f6' },
              { label: 'Operators Ranked', value: rows.length, icon: <CellTowerIcon />, color: '#8b5cf6' },
            ].map((stat) => (
              <Paper key={stat.label} sx={{
                flex: 1, px: 2, py: 1.5, borderRadius: 2,
                border: '1px solid', borderColor: 'divider',
                display: 'flex', alignItems: 'center', gap: 1.5,
              }}>
                <Avatar sx={{ width: 36, height: 36, bgcolor: alpha(stat.color, 0.12), color: stat.color }}>
                  {stat.icon}
                </Avatar>
                <Box>
                  <Typography sx={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', fontWeight: 600 }}>
                    {stat.label}
                  </Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{stat.value}</Typography>
                </Box>
              </Paper>
            ))}
          </Stack>

          {/* QoS Score Trend Chart */}
          {chartData.length > 1 && (
            <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', mb: 2 }}>
                QoS Score Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    {operators.map((op) => (
                      <linearGradient key={op} id={`grad-${op}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={opColor(op)} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={opColor(op)} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'} vertical={false} />
                  <XAxis
                    dataKey="period" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                    stroke={mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                    tickFormatter={(v) => { const [y, m] = v.split('-'); const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${months[+m]} ${y.slice(2)}`; }}
                  />
                  <YAxis
                    domain={['dataMin - 3', 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                    stroke={mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                  />
                  <RTooltip
                    contentStyle={{
                      backgroundColor: mode === 'dark' ? '#1e293b' : '#fff',
                      border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                      borderRadius: 8, fontSize: 12,
                    }}
                    formatter={(v) => [Number(v).toFixed(1), undefined]}
                    labelFormatter={(v) => { const [y, m] = v.split('-'); const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${months[+m]} ${y}`; }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 8 }}
                    iconType="circle" iconSize={8}
                  />
                  {operators.map((op) => (
                    <Area
                      key={op} type="monotone" dataKey={op}
                      stroke={opColor(op)} strokeWidth={2.5}
                      fill={`url(#grad-${op})`}
                      dot={{ r: 4, fill: opColor(op), strokeWidth: 2, stroke: mode === 'dark' ? '#1e293b' : '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          )}

          {/* Leaderboard */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                Leaderboard
              </Typography>
              <TextField
                size="small" placeholder="Search operator…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ width: 200, '& .MuiOutlinedInput-root': { height: 32, fontSize: 12 } }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment> }}
              />
            </Stack>

            <Stack spacing={1.2}>
              {filtered.map((r, i) => {
                const rank = rows.indexOf(r);
                return rank < 3
                  ? <PodiumCard key={r.operator_name} row={r} rank={rank} isTop={rank === 0} />
                  : <CompactRow key={r.operator_name} row={r} rank={rank} />;
              })}
            </Stack>
          </Box>
        </Stack>
      )}
    </Box>
  );
}
