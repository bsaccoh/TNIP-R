import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Divider,
  CircularProgress, Alert, Button, IconButton,
  TextField, Select, MenuItem, FormControl, InputLabel,
  BottomNavigation, BottomNavigationAction, Snackbar,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Slide, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Card, CardContent, InputAdornment, Switch,
  FormControlLabel, Menu, Badge, Tooltip
} from '@mui/material';
import { useMediaQuery } from '@mui/material';
import RouteIcon from '@mui/icons-material/Route';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import HistoryIcon from '@mui/icons-material/History';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SettingsIcon from '@mui/icons-material/Settings';
import MapIcon from '@mui/icons-material/Map';
import SpeedIcon from '@mui/icons-material/Speed';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShareIcon from '@mui/icons-material/Share';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CellTowerIcon from '@mui/icons-material/CellTower';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CloseIcon from '@mui/icons-material/Close';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import BugReportIcon from '@mui/icons-material/BugReport';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import WebIcon from '@mui/icons-material/Web';
import LayersIcon from '@mui/icons-material/Layers';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import MemoryIcon from '@mui/icons-material/Memory';
import SignalCellular4BarIcon from '@mui/icons-material/SignalCellular4Bar';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import CheckIcon from '@mui/icons-material/Check';

// Leaflet imports
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Recharts for detailed performance analytics
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip as RechartsTooltip, LineChart, Line, BarChart, Bar
} from 'recharts';

import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/* ── 1. GLOBAL DESIGN SYSTEM & PALETTE ───────────────────────────────────── */
const COLORS = {
  bgPrimary: '#0A0F1C',
  bgSecondary: '#0D1527',
  bgCard: '#11182A',
  bgElevated: '#131D31',
  border: '#1D2740',
  accentBlue: '#2F80FF',
  blueGlow: 'rgba(47, 128, 255, 0.35)',
  successGreen: '#12D6A0',
  goodGreen: '#10B981',
  warningAmber: '#F5A623',
  errorRed: '#FF4D5E',
  purple5G: '#8B5CF6',
  tealAccent: '#14D9C4',
  textWhite: '#F5F7FF',
  textMuted: '#94A3B8',
  textSecondary: '#7F8BA8',
  textDim: '#56627E',
  iconInactive: '#5B6787',
  blackOverlay: 'rgba(0,0,0,0.35)',
};

const STATUS_COLORS = {
  excellent: { text: '#12D6A0', bg: 'rgba(18, 214, 160, 0.12)', glow: 'rgba(18, 214, 160, 0.25)' },
  good: { text: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', glow: 'rgba(16, 185, 129, 0.18)' },
  fair: { text: '#F5A623', bg: 'rgba(245, 166, 35, 0.12)', glow: 'rgba(245, 166, 35, 0.18)' },
  poor: { text: '#FF4D5E', bg: 'rgba(255, 77, 94, 0.12)', glow: 'rgba(255, 77, 94, 0.25)' },
};

function getStatusByRsrp(rsrp) {
  if (rsrp == null) return 'poor';
  if (rsrp >= -85) return 'excellent';
  if (rsrp >= -95) return 'good';
  if (rsrp >= -110) return 'fair';
  return 'poor';
}

function pctOf(v, min, max) {
  if (v == null) return 0;
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
}

const SL_CENTER = [8.484, -13.234];

/* ── 2. TELEMETRY MOCK GENERATOR ────────────────────────────────────────── */
const FREETOWN_START = { lat: 8.484, lng: -13.234 };

function nextMockPoint(lastPt, timeStep) {
  const angle = (timeStep / 12) * Math.PI;
  const speed = 0.00012; 
  const driftLat = Math.sin(angle) * speed + (Math.random() - 0.5) * 0.00003;
  const driftLng = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.00003;
  
  const lat = (lastPt?.lat || FREETOWN_START.lat) + driftLat;
  const lng = (lastPt?.lng || FREETOWN_START.lng) + driftLng;
  
  let rsrp = (lastPt?.rsrp || -80) + (Math.random() - 0.5) * 5;
  if (rsrp > -65) rsrp = -65;
  if (rsrp < -120) rsrp = -120;
  rsrp = Math.round(rsrp);

  let sinr = Math.round(18 + (rsrp + 80) * 0.35 + (Math.random() - 0.5) * 3);
  if (sinr > 30) sinr = 30;
  if (sinr < -10) sinr = -10;

  let rsrq = Math.round(-9 + (rsrp + 80) * 0.12 + (Math.random() - 0.5) * 1.5);
  if (rsrq > -3) rsrq = -3;
  if (rsrq < -20) rsrq = -20;

  let pci = lastPt?.pci || 102;
  let handoverOccurred = false;
  if (Math.random() < 0.05) {
    const pcis = [102, 304, 88, 412, 219];
    const filtered = pcis.filter(p => p !== pci);
    pci = filtered[Math.floor(Math.random() * filtered.length)];
    handoverOccurred = true;
  }

  const ping = Math.round(18 + Math.random() * 10 + (110 + rsrp) * 0.4);
  const throughput = Math.round(75 + (rsrp + 90) * 2.5 + (Math.random() - 0.5) * 15);

  return {
    lat,
    lng,
    rsrp,
    sinr,
    rsrq,
    pci,
    ping,
    speed: throughput > 0 ? throughput : 5,
    technology: rsrp > -92 && Math.random() > 0.08 ? '5G-NSA' : '4G LTE',
    accuracy: Math.round(2.1 + Math.random() * 1.8),
    recordedAt: new Date().toISOString(),
    handover: handoverOccurred,
  };
}

function generateMockPoints(count, baseRsrp) {
  let pts = [];
  let cur = { lat: 8.484, lng: -13.234, rsrp: baseRsrp, pci: 102, sinr: 15, rsrq: -10, speed: 65, ping: 30 };
  for (let i = 0; i < count; i++) {
    cur = nextMockPoint(cur, i);
    pts.push(cur);
  }
  return pts;
}

const MOCK_HISTORY_SESSIONS = [
  {
    id: 'dt-001',
    testName: 'Freetown Central Highway Drive',
    operatorName: 'Orange SL',
    technology: '5G-NSA',
    date: '2026-07-10',
    time: '14:23:45',
    duration: 1800,
    distance: 12.4,
    avgSpeed: 142.5,
    avgRsrp: -81,
    avgSinr: 21.2,
    dropCount: 0,
    status: 'COMPLETED',
    exported: true,
    points: generateMockPoints(100, -78)
  },
  {
    id: 'dt-002',
    testName: 'Aberdeen Beach QoS Sweep',
    operatorName: 'Africell SL',
    technology: '4G LTE',
    date: '2026-07-08',
    time: '09:12:10',
    duration: 1200,
    distance: 8.2,
    avgSpeed: 64.1,
    avgRsrp: -92,
    avgSinr: 12.8,
    dropCount: 1,
    status: 'COMPLETED',
    exported: false,
    points: generateMockPoints(75, -90)
  },
  {
    id: 'dt-003',
    testName: 'Wilkinson Road Drive Test',
    operatorName: 'Orange SL',
    technology: '5G-NSA',
    date: '2026-07-05',
    time: '16:45:00',
    duration: 2400,
    distance: 15.6,
    avgSpeed: 168.2,
    avgRsrp: -79,
    avgSinr: 23.1,
    dropCount: 0,
    status: 'COMPLETED',
    exported: true,
    points: generateMockPoints(120, -75)
  },
  {
    id: 'dt-004',
    testName: 'Kissy Bypass Drop Inspector',
    operatorName: 'Qcell SL',
    technology: '4G LTE',
    date: '2026-07-02',
    time: '11:05:30',
    duration: 1500,
    distance: 9.8,
    avgSpeed: 38.5,
    avgRsrp: -104,
    avgSinr: 3.2,
    dropCount: 3,
    status: 'COMPLETED',
    exported: false,
    points: generateMockPoints(85, -102)
  },
  {
    id: 'dt-005',
    testName: 'Lumley Market Signal Audit',
    operatorName: 'SierraTel',
    technology: '4G LTE',
    date: '2026-06-29',
    time: '15:30:15',
    duration: 900,
    distance: 4.5,
    avgSpeed: 45.2,
    avgRsrp: -109,
    avgSinr: 1.8,
    dropCount: 2,
    status: 'COMPLETED',
    exported: false,
    points: generateMockPoints(60, -107)
  }
];

const INITIAL_ALERTS = [
  { id: 1, severity: 'error', title: 'Call Drop Event', desc: 'Active VoLTE session dropped at sector index 4', time: '14:32:10', loc: '8.4845, -13.2341' },
  { id: 2, severity: 'warning', title: 'Poor signal detected', desc: 'RSRP value degraded below -112 dBm on serving cell 304', time: '14:28:44', loc: '8.4839, -13.2321' },
  { id: 3, severity: 'info', title: '5G to 4G Handover', desc: 'Technology downgrade serving sector PCI 102 → 304', time: '14:25:12', loc: '8.4822, -13.2305' },
  { id: 4, severity: 'success', title: '4G to 5G Upgrade', desc: 'Technology handover completed to NR NSA cell (N78)', time: '14:24:02', loc: '8.4811, -13.2289' }
];

/* ── 3. REUSABLE GRAPHICS & SPARKLINE WIDGETS ────────────────────────────── */
function SparklineChart({ data = [], color = COLORS.accentBlue, height = 24 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min === 0 ? 1 : max - min;
  const width = 120;
  
  const points = data.map((val, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height + 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const chartId = `spark-${Math.round(Math.random() * 100000)}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      <path
        d={`M 0,${height} L ${points} L ${width},${height} Z`}
        fill={`url(#${chartId})`}
        opacity={0.15}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <defs>
        <linearGradient id={chartId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function SignalRingGauge({ rsrp, onClick }) {
  const pct = pctOf(rsrp, -130, -50);
  const status = getStatusByRsrp(rsrp);
  const config = STATUS_COLORS[status];
  const size = 180;
  const strokeWidth = 8;
  const radius = size / 2 - strokeWidth - 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        width: size,
        height: size,
        mx: 'auto',
        cursor: 'pointer',
        '&:hover': {
          '& .gauge-pulse': {
            transform: 'scale(1.06)',
            opacity: 0.6
          }
        }
      }}
    >
      <Box
        className="gauge-pulse"
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: `2px solid ${config.text}`,
          boxShadow: `0 0 16px ${config.glow}`,
          opacity: 0.3,
          transition: 'all 0.5s ease',
          animation: 'pulseGlow 2s infinite alternate',
          '@keyframes pulseGlow': {
            '0%': { transform: 'scale(0.96)', opacity: 0.15 },
            '100%': { transform: 'scale(1.04)', opacity: 0.45 }
          }
        }}
      />
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={COLORS.border}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={config.text}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.3s ease' }}
        />
      </svg>
      <Box sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none'
      }}>
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: COLORS.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          RSRP
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 800, color: COLORS.textWhite, my: 0.25, lineHeight: 1 }}>
          {rsrp != null ? rsrp : '—'}
        </Typography>
        <Typography sx={{ fontSize: '0.6' + 'rem', fontWeight: 600, color: COLORS.textSecondary, mb: 1, letterSpacing: 0.8 }}>
          DBM
        </Typography>
        <Box sx={{
          px: 1.25,
          py: 0.25,
          borderRadius: '999px',
          bgcolor: config.bg,
          color: config.text,
          fontSize: '0.62rem',
          fontWeight: 700,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          border: `1px solid ${config.text}44`
        }}>
          {status}
        </Box>
      </Box>
    </Box>
  );
}

function SpeedGauge({ value, max = 300, phase = 'idle' }) {
  const size = 210;
  const strokeWidth = 10;
  const radius = size / 2 - strokeWidth - 15;
  const circumference = 2 * Math.PI * radius;
  
  const totalArcAngle = 270;
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  
  const arcLength = circumference * (totalArcAngle / 360);
  const restOfCircle = circumference - arcLength;
  const dashoffset = circumference * 0.375; 

  const needleRotation = -135 + (pct / 100) * totalArcAngle;

  return (
    <Box sx={{ position: 'relative', width: size, height: size, mx: 'auto', mt: 2 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={COLORS.border}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${restOfCircle}`}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#speed-gradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${restOfCircle}`}
          strokeDashoffset={dashoffset + (arcLength - (pct / 100) * arcLength)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.15s ease-out' }}
        />
        <defs>
          <linearGradient id="speed-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={COLORS.accentBlue} />
            <stop offset="60%" stopColor={COLORS.tealAccent} />
            <stop offset="100%" stopColor={COLORS.successGreen} />
          </linearGradient>
        </defs>
      </svg>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 3,
        height: radius - 4,
        bgcolor: COLORS.textWhite,
        borderRadius: '2px',
        transformOrigin: 'bottom center',
        transform: `translate(-50%, -100%) rotate(${needleRotation}deg)`,
        transition: 'transform 0.15s ease-out',
        boxShadow: `0 0 8px ${COLORS.accentBlue}`,
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -4,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: COLORS.textWhite,
          boxShadow: `0 0 6px ${COLORS.accentBlue}`
        }
      }} />
      <Box sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pt: 5
      }}>
        <Typography variant="h3" sx={{ fontWeight: 800, color: COLORS.textWhite, mb: 0, fontSize: '2.5rem' }}>
          {value != null ? value.toFixed(1) : '0.0'}
        </Typography>
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: COLORS.textSecondary, letterSpacing: 1.5 }}>
          MBPS
        </Typography>
        <Box sx={{
          mt: 1.25,
          px: 1.5,
          py: 0.25,
          borderRadius: '999px',
          bgcolor: 'rgba(255,255,255,0.06)',
          border: `1px solid ${COLORS.border}`,
          fontSize: '0.62rem',
          fontWeight: 700,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: phase === 'downloading' ? COLORS.accentBlue : phase === 'uploading' ? COLORS.purple5G : COLORS.textMuted
        }}>
          {phase}
        </Box>
      </Box>
    </Box>
  );
}

function StackedBar({ excellent = 45, good = 30, fair = 15, poor = 10 }) {
  const sum = excellent + good + fair + poor;
  const pExc = (excellent / sum) * 100;
  const pGood = (good / sum) * 100;
  const pFair = (fair / sum) * 100;
  const pPoor = (poor / sum) * 100;

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', height: 12, borderRadius: '6px', overflow: 'hidden', bgcolor: COLORS.border }}>
        <Box sx={{ width: `${pExc}%`, bgcolor: COLORS.successGreen }} />
        <Box sx={{ width: `${pGood}%`, bgcolor: COLORS.goodGreen }} />
        <Box sx={{ width: `${pFair}%`, bgcolor: COLORS.warningAmber }} />
        <Box sx={{ width: `${pPoor}%`, bgcolor: COLORS.errorRed }} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', mt: 1.5 }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS.successGreen }} />
          <Typography sx={{ fontSize: '0.58rem', color: COLORS.textSecondary }}>Exc ({pExc.toFixed(0)}%)</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS.goodGreen }} />
          <Typography sx={{ fontSize: '0.58rem', color: COLORS.textSecondary }}>Good ({pGood.toFixed(0)}%)</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS.warningAmber }} />
          <Typography sx={{ fontSize: '0.58rem', color: COLORS.textSecondary }}>Fair ({pFair.toFixed(0)}%)</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS.errorRed }} />
          <Typography sx={{ fontSize: '0.58rem', color: COLORS.textSecondary }}>Poor ({pPoor.toFixed(0)}%)</Typography>
        </Stack>
      </Box>
    </Box>
  );
}

function DonutChart({ val1 = 65, lab1 = '5G', val2 = 35, lab2 = '4G' }) {
  const sum = val1 + val2;
  const p1 = (val1 / sum) * 100;
  const size = 90;
  const strokeWidth = 8;
  const radius = size / 2 - strokeWidth - 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (p1 / 100) * circumference;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={COLORS.accentBlue}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={COLORS.purple5G}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <Box sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Typography sx={{ fontSize: '0.55rem', fontWeight: 600, color: COLORS.textSecondary }}>RAT</Typography>
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.textWhite }}>
            {p1.toFixed(0)}%
          </Typography>
        </Box>
      </Box>
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: COLORS.purple5G }} />
          <Typography sx={{ fontSize: '0.68rem', color: COLORS.textWhite, fontWeight: 600 }}>{lab1} ({p1.toFixed(0)}%)</Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: COLORS.accentBlue }} />
          <Typography sx={{ fontSize: '0.68rem', color: COLORS.textWhite, fontWeight: 600 }}>{lab2} ({(100 - p1).toFixed(0)}%)</Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

function MetricCard({ label, value, unit, status, trend = [], onClick }) {
  const config = status ? STATUS_COLORS[status] : null;
  const color = config ? config.text : COLORS.textWhite;
  const borderLeft = config ? `3px solid ${config.text}` : `1px solid ${COLORS.border}`;

  return (
    <Paper
      onClick={onClick}
      sx={{
        p: 2,
        bgcolor: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        borderLeft: borderLeft,
        borderRadius: '16px',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? {
          bgcolor: COLORS.bgElevated,
          boxShadow: config ? `0 0 10px ${config.glow}` : `0 0 10px rgba(255,255,255,0.05)`,
          transform: 'translateY(-2px)'
        } : {},
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, color: COLORS.textSecondary, letterSpacing: 1.2, textTransform: 'uppercase', mb: 0.5 }}>
        {label}
      </Typography>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: color }}>
          {value}
          {unit && (
            <Typography component="span" sx={{ fontSize: '0.72rem', color: COLORS.textSecondary, ml: 0.5 }}>
              {unit}
            </Typography>
          )}
        </Typography>
        {config && (
          <Chip
            size="small"
            label={status}
            sx={{
              height: 16,
              fontSize: '0.55rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              bgcolor: config.bg,
              color: config.text
            }}
          />
        )}
      </Stack>
      {trend.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <SparklineChart data={trend} color={color} />
        </Box>
      )}
    </Paper>
  );
}

// Leaflet Polyline drawer with Segment-by-segment color coding
function RoutePath({ points, metric = 'rsrp' }) {
  if (!points || points.length < 2) return null;

  const getMetricColor = (pt) => {
    if (metric === 'rsrp') {
      const v = pt.rsrp;
      if (v >= -85) return COLORS.successGreen;
      if (v >= -95) return COLORS.goodGreen;
      if (v >= -110) return COLORS.warningAmber;
      return COLORS.errorRed;
    } else if (metric === 'sinr') {
      const v = pt.sinr;
      if (v >= 15) return COLORS.successGreen;
      if (v >= 8) return COLORS.goodGreen;
      if (v >= 0) return COLORS.warningAmber;
      return COLORS.errorRed;
    } else if (metric === 'speed') {
      const v = pt.speed;
      if (v >= 120) return COLORS.successGreen;
      if (v >= 60) return COLORS.goodGreen;
      if (v >= 20) return COLORS.warningAmber;
      return COLORS.errorRed;
    } else { 
      const v = pt.ping || 40;
      if (v < 30) return COLORS.successGreen;
      if (v < 55) return COLORS.goodGreen;
      if (v < 90) return COLORS.warningAmber;
      return COLORS.errorRed;
    }
  };

  const segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    segments.push({
      positions: [[p1.lat, p1.lng], [p2.lat, p2.lng]],
      color: getMetricColor(p1)
    });
  }

  return (
    <>
      {segments.map((seg, idx) => (
        <Polyline
          key={idx}
          positions={seg.positions}
          pathOptions={{ color: seg.color, weight: 6, opacity: 0.9, lineCap: 'round' }}
        />
      ))}
    </>
  );
}

const LocationMarker = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);

  if (!position) return null;

  return (
    <>
      <CircleMarker
        center={position}
        radius={15}
        pathOptions={{
          fillColor: COLORS.accentBlue,
          fillOpacity: 0.15,
          color: COLORS.accentBlue,
          weight: 1,
          dashArray: '3, 4'
        }}
      />
      <CircleMarker
        center={position}
        radius={7}
        pathOptions={{
          fillColor: COLORS.accentBlue,
          fillOpacity: 1,
          color: '#ffffff',
          weight: 2
        }}
      />
    </>
  );
};

/* ── 4. MAIN FIELD APP COMPONENT ─────────────────────────────────────────── */
export default function FieldApp() {
  const { user, loading: authLoading } = useAuth();
  
  // Navigation stack: [{ name: 'dashboard', params: {} }]
  const [screenStack, setScreenStack] = useState([{ name: 'dashboard', params: {} }]);
  const pushScreen = (name, params = {}) => setScreenStack(prev => [...prev, { name, params }]);
  const popScreen = () => setScreenStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
  const resetToScreen = (name) => setScreenStack([{ name, params: {} }]);
  
  const current = screenStack[screenStack.length - 1];

  // Active Drive Test Simulation State
  const [isRecording, setIsRecording] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionDistance, setSessionDistance] = useState(0);
  const [recordedPoints, setRecordedPoints] = useState([]);
  
  // Dynamic current metrics
  const [currentRsrp, setCurrentRsrp] = useState(-81);
  const [currentSinr, setCurrentSinr] = useState(18);
  const [currentRsrq, setCurrentRsrq] = useState(-11);
  const [currentPci, setCurrentPci] = useState(102);
  const [currentGpsAcc, setCurrentGpsAcc] = useState(2.8);
  
  // Historical trends for sparklines (Dashboard metrics)
  const [rsrpTrend, setRsrpTrend] = useState([-79, -82, -80, -85, -81, -83, -80, -81]);
  const [sinrTrend, setSinrTrend] = useState([16, 17, 15, 14, 18, 16, 17, 18]);
  const [rsrqTrend, setRsrqTrend] = useState([-10, -11, -10, -12, -11, -12, -10, -11]);
  
  // Active test suite state
  const [pingSuiteActive, setPingSuiteActive] = useState(true);
  const [currentPing, setCurrentPing] = useState(24);
  const [pingJitter, setPingJitter] = useState(3);
  const [pingHistory, setPingHistory] = useState([22, 25, 24, 28, 23, 25, 24]);
  
  const [downloadActive, setDownloadActive] = useState(false);
  const [speedVal, setSpeedVal] = useState(84.2);
  
  // History sessions list
  const [sessions, setSessions] = useState(MOCK_HISTORY_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState(null); // when stopping recording to compile report

  // Settings state
  const [pingInterval, setPingInterval] = useState(1000);
  const [packetSize, setPacketSize] = useState(32);
  const [speedServer, setSpeedServer] = useState('Freetown - Orange Cache');
  const [gpsUpdateRate, setGpsUpdateRate] = useState(1);
  const [logInterval, setLogInterval] = useState(1);
  const [mapMetric, setMapMetric] = useState('rsrp');
  const [mapStyle, setMapStyle] = useState('dark'); // dark, satellite, streets
  const [themeMode, setThemeMode] = useState('dark');
  const [units, setUnits] = useState('metric');
  const [autoUpload, setAutoUpload] = useState(true);
  const [sftpHost, setSftpHost] = useState('sftp.tnip-r.gov.sl');
  const [sftpUser, setSftpUser] = useState('drive_team_04');
  const [sftpPass, setSftpPass] = useState('********');
  const [wifiOnly, setWifiOnly] = useState(false);
  const [exportFormats, setExportFormats] = useState(['CSV', 'KML']);

  // Alerts state
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [alertFilter, setAlertFilter] = useState('All');
  
  // Global Modals / Sheets State
  const [modalOpen, setModalOpen] = useState(null); // 'metric-detail', 'filter-sheet', 'export-sheet', 'stop-confirm', 'completed', 'permission'
  const [modalParams, setModalParams] = useState({});
  
  // Notification system
  const [toastMessage, setToastMessage] = useState(null);

  // Speed test screen states
  const [speedTestRunning, setSpeedTestRunning] = useState(false);
  const [speedTestPhase, setSpeedTestPhase] = useState('idle'); // idle, ping, downloading, uploading, complete
  const [speedTestVal, setSpeedTestVal] = useState(0);
  const [speedTestPing, setSpeedTestPing] = useState(null);
  const [speedTestJitter, setSpeedTestJitter] = useState(null);
  const [speedTestDl, setSpeedTestDl] = useState(null);
  const [speedTestUl, setSpeedTestUl] = useState(null);
  const [speedTestPoints, setSpeedTestPoints] = useState([]);

  // Geolocation reference for manual fallback/simulation
  const watchRef = useRef(null);
  const simTimerRef = useRef(null);

  // 1. Synchronized Timer Loop when recording is Active
  useEffect(() => {
    if (isRecording) {
      simTimerRef.current = setInterval(() => {
        setSessionDuration(prev => prev + 1);
        
        // Generate next telemetry step
        setRecordedPoints(prevPoints => {
          const last = prevPoints[prevPoints.length - 1];
          const next = nextMockPoint(last, prevPoints.length);
          
          // Add metric state updates
          setCurrentRsrp(next.rsrp);
          setCurrentSinr(next.sinr);
          setCurrentRsrq(next.rsrq);
          setCurrentPci(next.pci);
          setCurrentGpsAcc(next.accuracy);

          // Update trends arrays
          setRsrpTrend(t => [...t.slice(1), next.rsrp]);
          setSinrTrend(t => [...t.slice(1), next.sinr]);
          setRsrqTrend(t => [...t.slice(1), next.rsrq]);

          // Handle handovers
          if (next.handover) {
            const timeStr = new Date().toTimeString().split(' ')[0];
            const newAlert = {
              id: Date.now(),
              severity: 'info',
              title: 'Cell Handover Event',
              desc: `PCI changed to ${next.pci} on technology ${next.technology}`,
              time: timeStr,
              loc: `${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`
            };
            setAlerts(a => [newAlert, ...a]);
            setToastMessage(`Handover Event: Sector PCI changed to ${next.pci}`);
          }

          // Handle poor coverage events
          if (next.rsrp < -112) {
            const alreadyFlagged = prevPoints.length > 0 && prevPoints[prevPoints.length - 1].rsrp < -112;
            if (!alreadyFlagged) {
              const timeStr = new Date().toTimeString().split(' ')[0];
              const newAlert = {
                id: Date.now(),
                severity: 'warning',
                title: 'Poor Signal Detected',
                desc: `RSRP dropped to ${next.rsrp} dBm (Sector PCI ${next.pci})`,
                time: timeStr,
                loc: `${next.lat.toFixed(5)}, ${next.lng.toFixed(5)}`
              };
              setAlerts(a => [newAlert, ...a]);
            }
          }

          // Distance increment: approx 15m (0.015 km) per point
          setSessionDistance(d => d + 0.015);
          
          return [...prevPoints, next];
        });
      }, 1000);
    } else {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    }

    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [isRecording]);

  // Active QoS ping testing loop simulation in background
  useEffect(() => {
    const t = setInterval(() => {
      if (pingSuiteActive) {
        const dev = isRecording ? (currentRsrp + 90) * 0.2 : 0;
        const newPing = Math.round(20 + Math.random() * 8 + dev);
        setCurrentPing(newPing);
        setPingJitter(Math.round(2 + Math.random() * 2));
        setPingHistory(prev => [...prev.slice(1), newPing]);
      }
    }, 1500);
    return () => clearInterval(t);
  }, [pingSuiteActive, isRecording, currentRsrp]);

  // Speed test simulation loop trigger
  const runSpeedTestSim = () => {
    if (speedTestRunning) return;
    setSpeedTestRunning(true);
    setSpeedTestPhase('ping');
    setSpeedTestVal(0);
    setSpeedTestPing(null);
    setSpeedTestJitter(null);
    setSpeedTestDl(null);
    setSpeedTestUl(null);
    setSpeedTestPoints([]);

    // Ping phase (2 seconds)
    setTimeout(() => {
      setSpeedTestPing(Math.round(15 + Math.random() * 12));
      setSpeedTestJitter(Math.round(1 + Math.random() * 3));
      setSpeedTestPhase('downloading');

      // Download phase (5 seconds)
      let dlTicks = 0;
      let dlPoints = [];
      const dlInterval = setInterval(() => {
        dlTicks++;
        const baseSpeed = currentRsrp >= -85 ? 180 : currentRsrp >= -95 ? 110 : 35;
        const noise = (Math.random() - 0.5) * 20;
        const speed = Math.max(5, baseSpeed + noise);
        setSpeedTestVal(speed);
        dlPoints.push(speed);

        if (dlTicks >= 20) { 
          clearInterval(dlInterval);
          const dlAverage = dlPoints.reduce((a, b) => a + b, 0) / dlPoints.length;
          setSpeedTestDl(dlAverage);
          setSpeedTestPhase('uploading');

          // Upload phase (5 seconds)
          let ulTicks = 0;
          let ulPoints = [];
          const ulInterval = setInterval(() => {
            ulTicks++;
            const baseSpeed = currentRsrp >= -85 ? 45 : currentRsrp >= -95 ? 25 : 8;
            const noise = (Math.random() - 0.5) * 5;
            const speed = Math.max(1, baseSpeed + noise);
            setSpeedTestVal(speed);
            ulPoints.push(speed);

            if (ulTicks >= 20) {
              clearInterval(ulInterval);
              const ulAverage = ulPoints.reduce((a, b) => a + b, 0) / ulPoints.length;
              setSpeedTestUl(ulAverage);
              setSpeedTestPhase('complete');
              setSpeedTestRunning(false);
              setSpeedTestVal(0);
              
              // Trigger notification
              setToastMessage('Speed Test complete!');
              
              // Add alert
              const timeStr = new Date().toTimeString().split(' ')[0];
              setAlerts(prev => [
                {
                  id: Date.now(),
                  severity: 'success',
                  title: 'Speed Test Complete',
                  desc: `DL: ${dlAverage.toFixed(1)} Mbps · UL: ${ulAverage.toFixed(1)} Mbps`,
                  time: timeStr
                },
                ...prev
              ]);
            }
          }, 200);
        }
      }, 200);
    }, 2000);
  };

  if (authLoading) return <Box sx={{ display: 'grid', placeItems: 'center', height: '100vh', bgcolor: COLORS.bgPrimary }}><CircularProgress /></Box>;
  if (!user) return <Navigate to="/login" replace />;

  // Recording control functions
  const startRecording = () => {
    setIsRecording(true);
    setSessionDuration(0);
    setSessionDistance(0);
    // Seed path with initial point
    const firstPt = nextMockPoint(null, 0);
    setRecordedPoints([firstPt]);
    setToastMessage('Drive test session recording started');
  };

  const handleStopRecordingRequest = () => {
    setModalOpen('stop-confirm');
  };

  const confirmStopRecording = () => {
    setIsRecording(false);
    setModalOpen(null);
    
    // Save recording into History sessions list
    const newSessionId = `dt-${Date.now()}`;
    const newSession = {
      id: newSessionId,
      testName: `Drive Test Session ${sessions.length + 1}`,
      operatorName: 'Orange SL',
      technology: recordedPoints[recordedPoints.length - 1]?.technology || '5G-NSA',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      duration: sessionDuration,
      distance: Number(sessionDistance.toFixed(2)),
      avgSpeed: Number((recordedPoints.reduce((sum, p) => sum + p.speed, 0) / (recordedPoints.length || 1)).toFixed(1)),
      avgRsrp: Math.round(recordedPoints.reduce((sum, p) => sum + p.rsrp, 0) / (recordedPoints.length || 1)),
      avgSinr: Number((recordedPoints.reduce((sum, p) => sum + p.sinr, 0) / (recordedPoints.length || 1)).toFixed(1)),
      dropCount: alerts.filter(a => a.title.includes('Drop') && a.time >= new Date(Date.now() - sessionDuration * 1000).toTimeString().split(' ')[0]).length,
      status: 'COMPLETED',
      exported: false,
      points: [...recordedPoints]
    };

    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    
    // Open session completed success modal after short delay
    setTimeout(() => {
      setModalOpen('completed');
    }, 400);
  };

  const deleteSession = (id) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    setToastMessage('Session record deleted successfully');
  };

  // CSV/KML Export Triggers
  const triggerCSVDownload = (session) => {
    if (!session || !session.points) return;
    let headers = 'Timestamp,Latitude,Longitude,RSRP(dBm),SINR(dB),RSRQ(dB),PCI,Speed(Mbps),Ping(ms),Technology\n';
    let rows = session.points.map(p => 
      `"${p.recordedAt}",${p.lat},${p.lng},${p.rsrp},${p.sinr},${p.rsrq},${p.pci},${p.speed},${p.ping},"${p.technology}"`
    ).join('\n');
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${session.testName.replace(/\s+/g, '_')}_logs.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMessage('CSV Log Exported!');
  };

  const triggerKMLDownload = (session) => {
    if (!session || !session.points) return;
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${session.testName}</name>
    <description>TNIP-R Color-coded RSRP drive route</description>
    <Style id="excellent-marker">
      <IconStyle><color>ff12d6a0</color></IconStyle>
    </Style>
    <Style id="poor-marker">
      <IconStyle><color>ffff4d5e</color></IconStyle>
    </Style>
    <Placemark>
      <name>Route Path</name>
      <LineString>
        <coordinates>
          ${session.points.map(p => `${p.lng},${p.lat},0`).join('\n          ')}
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${session.testName.replace(/\s+/g, '_')}_route.kml`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToastMessage('KML Path Exported!');
  };

  /* ── 5. SCREEN RENDERERS ────────────────────────────────────────────────── */

  // Screen 1: Dashboard View
  const renderDashboard = () => {
    return (
      <Box sx={{ p: 2, pb: 10 }}>
        {/* Signal Ring Gauge Card */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Chip
              label="5G-NSA"
              size="small"
              onClick={() => pushScreen('device-info')}
              sx={{ bgcolor: 'rgba(139, 92, 246, 0.18)', color: '#B794FF', fontWeight: 700, fontSize: '0.65rem', border: '1px solid rgba(139, 92, 246, 0.3)' }}
            />
            <Chip
              label="Orange SL"
              size="small"
              onClick={() => pushScreen('device-info')}
              sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: '#E5E7EB', fontWeight: 600, fontSize: '0.65rem', border: `1px solid ${COLORS.border}` }}
            />
          </Box>
          <SignalRingGauge rsrp={currentRsrp} onClick={() => pushScreen('cell-details')} />
        </Paper>

        {/* Metric Cards Grid (2x2) */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <MetricCard
              label="SINR"
              value={currentSinr}
              unit="dB"
              status={currentSinr >= 15 ? 'excellent' : currentSinr >= 8 ? 'good' : currentSinr >= 0 ? 'fair' : 'poor'}
              trend={sinrTrend}
              onClick={() => {
                setModalParams({ metric: 'SINR', desc: 'Signal-to-Interference-plus-Noise Ratio. Measures signal quality relative to background noise. Values above 15dB represent excellent carrier quality.', val: currentSinr, unit: 'dB', trend: sinrTrend });
                setModalOpen('metric-detail');
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <MetricCard
              label="RSRQ"
              value={currentRsrq}
              unit="dB"
              status={currentRsrq >= -10 ? 'excellent' : currentRsrq >= -15 ? 'good' : currentRsrq >= -18 ? 'fair' : 'poor'}
              trend={rsrqTrend}
              onClick={() => {
                setModalParams({ metric: 'RSRQ', desc: 'Reference Signal Received Quality. Measures cell loading and channel quality. Values closer to 0dB (-3dB to -10dB) are excellent.', val: currentRsrq, unit: 'dB', trend: rsrqTrend });
                setModalOpen('metric-detail');
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <MetricCard
              label="PCI"
              value={currentPci}
              onClick={() => pushScreen('device-info')}
            />
          </Grid>
          <Grid item xs={6}>
            <MetricCard
              label="GPS Acc."
              value={currentGpsAcc.toFixed(1)}
              unit="m"
              status={currentGpsAcc <= 3.0 ? 'excellent' : currentGpsAcc <= 6.0 ? 'good' : 'fair'}
              onClick={() => pushScreen('device-info', { focus: 'gps' })}
            />
          </Grid>
        </Grid>

        {/* Bottom record panel */}
        <Paper sx={{
          p: 2,
          position: 'fixed',
          bottom: 76,
          left: 0,
          right: 0,
          bgcolor: COLORS.bgCard,
          borderTop: `1px solid ${COLORS.border}`,
          zIndex: 100,
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 20px rgba(0,0,0,0.4)',
          maxWidth: 390,
          mx: 'auto'
        }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: COLORS.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                DRIVE TEST
              </Typography>
              <Typography sx={{ color: isRecording ? COLORS.successGreen : COLORS.textMuted, fontSize: '0.8rem', fontWeight: 600 }}>
                {isRecording ? `Recording... (${new Date(sessionDuration * 1000).toISOString().substr(11, 8)})` : 'Ready to record'}
              </Typography>
            </Box>
            <IconButton
              onClick={isRecording ? handleStopRecordingRequest : startRecording}
              sx={{
                bgcolor: isRecording ? COLORS.errorRed : COLORS.accentBlue,
                color: COLORS.textWhite,
                width: 48,
                height: 48,
                '&:hover': {
                  bgcolor: isRecording ? '#e03c4c' : '#2370eb',
                  boxShadow: `0 0 12px ${isRecording ? COLORS.errorRed : COLORS.accentBlue}`
                },
                boxShadow: `0 0 10px ${isRecording ? 'rgba(255, 77, 94, 0.4)' : 'rgba(47, 128, 255, 0.4)'}`,
                transition: 'all 0.3s ease'
              }}
            >
              {isRecording ? <StopCircleIcon /> : <RadioButtonCheckedIcon />}
            </IconButton>
          </Stack>
        </Paper>
      </Box>
    );
  };

  // Screen 2: Map View
  const renderMap = () => {
    const centerPoint = recordedPoints.length > 0
      ? [recordedPoints[recordedPoints.length - 1].lat, recordedPoints[recordedPoints.length - 1].lng]
      : SL_CENTER;

    return (
      <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
        <MapContainer center={centerPoint} zoom={15} style={{ width: '100%', height: '100%' }} zoomControl={false}>
          <TileLayer
            attribution='&copy; CARTO'
            url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`}
          />
          {recordedPoints.length > 0 && (
            <>
              <RoutePath points={recordedPoints} metric={mapMetric} />
              <LocationMarker position={[recordedPoints[recordedPoints.length - 1].lat, recordedPoints[recordedPoints.length - 1].lng]} />
            </>
          )}
        </MapContainer>

        {/* Top metric selector overlay */}
        <Box sx={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 1000 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Paper sx={{ p: '2px 8px', bgcolor: 'rgba(17, 24, 42, 0.85)', backdropFilter: 'blur(8px)', border: `1px solid ${COLORS.border}`, borderRadius: '999px' }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography sx={{ fontSize: '0.65rem', color: COLORS.textSecondary, fontWeight: 700, mr: 0.5 }}>METRIC:</Typography>
                {['rsrp', 'sinr', 'speed'].map(m => (
                  <Chip
                    key={m}
                    label={m.toUpperCase()}
                    size="small"
                    onClick={() => setMapMetric(m)}
                    sx={{
                      height: 20,
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      bgcolor: mapMetric === m ? COLORS.accentBlue : 'transparent',
                      color: mapMetric === m ? COLORS.textWhite : COLORS.textSecondary,
                      '&:hover': { bgcolor: mapMetric === m ? COLORS.accentBlue : 'rgba(255,255,255,0.05)' }
                    }}
                  />
                ))}
              </Stack>
            </Paper>
            
            <IconButton
              onClick={() => pushScreen('alerts')}
              sx={{ bgcolor: 'rgba(17, 24, 42, 0.85)', backdropFilter: 'blur(8px)', border: `1px solid ${COLORS.border}`, color: COLORS.textWhite, width: 36, height: 36 }}
            >
              <Badge badgeContent={alerts.length} color="error">
                <NotificationsIcon sx={{ fontSize: 18 }} />
              </Badge>
            </IconButton>
          </Stack>
        </Box>

        {/* Right floating button panel */}
        <Box sx={{ position: 'absolute', right: 12, top: 70, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <IconButton
            onClick={() => setModalOpen('filter-sheet')}
            sx={{ bgcolor: 'rgba(17, 24, 42, 0.85)', backdropFilter: 'blur(8px)', border: `1px solid ${COLORS.border}`, color: COLORS.textWhite }}
          >
            <LayersIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            onClick={() => pushScreen('heatmap')}
            sx={{ bgcolor: 'rgba(17, 24, 42, 0.85)', backdropFilter: 'blur(8px)', border: `1px solid ${COLORS.border}`, color: COLORS.textWhite }}
          >
            <AssessmentIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            onClick={() => {
              if (recordedPoints.length > 0) {
                setToastMessage('Recentering location marker...');
              } else {
                setToastMessage('GPS locked near center');
              }
            }}
            sx={{ bgcolor: 'rgba(17, 24, 42, 0.85)', backdropFilter: 'blur(8px)', border: `1px solid ${COLORS.border}`, color: COLORS.textWhite }}
          >
            <GpsFixedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Bottom floating draggable-like card */}
        <Paper sx={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 12,
          p: 2,
          bgcolor: 'rgba(17, 24, 42, 0.88)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${COLORS.border}`,
          borderRadius: '20px',
          zIndex: 1000
        }}>
          {/* Handle */}
          <Box sx={{ width: 40, height: 4, bgcolor: COLORS.border, borderRadius: 2, mx: 'auto', mb: 1.5 }} />
          
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Typography sx={{ fontSize: '0.55rem', color: COLORS.textSecondary, fontWeight: 700, letterSpacing: 0.5 }}>RSRP</Typography>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: COLORS.successGreen }}>{currentRsrp} dBm</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography sx={{ fontSize: '0.55rem', color: COLORS.textSecondary, fontWeight: 700, letterSpacing: 0.5 }}>DIST.</Typography>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: COLORS.textWhite }}>{sessionDistance.toFixed(2)} km</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography sx={{ fontSize: '0.55rem', color: COLORS.textSecondary, fontWeight: 700, letterSpacing: 0.5 }}>TIME</Typography>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: COLORS.textWhite }}>{new Date(sessionDuration * 1000).toISOString().substr(14, 5)}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography sx={{ fontSize: '0.55rem', color: COLORS.textSecondary, fontWeight: 700, letterSpacing: 0.5 }}>TECH</Typography>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: COLORS.purple5G }}>{recordedPoints[recordedPoints.length - 1]?.technology || '5G-NSA'}</Typography>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    );
  };

  // Screen 3: Active Tests Suite
  const renderActiveTests = () => {
    return (
      <Box sx={{ p: 2, pb: 10 }}>
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: COLORS.textSecondary, letterSpacing: 1.5, mb: 0.5 }}>QOS · QOE SUITE RUNNING</Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textWhite, mb: 3 }}>Active Tests</Typography>

        <Stack spacing={2}>
          {/* 1. Ping Card */}
          <Paper
            onClick={() => pushScreen('ping-details')}
            sx={{ p: 2, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 8, height: 8, bgcolor: COLORS.successGreen, borderRadius: '50%' }} />
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.textWhite }}>Ping Latency</Typography>
              </Stack>
              <Chip label="ACTIVE" size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700, bgcolor: 'rgba(18, 214, 160, 0.12)', color: COLORS.successGreen }} />
            </Stack>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={4}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.successGreen }}>{currentPing} <Typography component="span" sx={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>ms</Typography></Typography>
                <Typography sx={{ fontSize: '0.58rem', color: COLORS.textSecondary }}>Jitter: {pingJitter} ms</Typography>
              </Grid>
              <Grid item xs={8}>
                <Box sx={{ height: 35 }}>
                  <SparklineChart data={pingHistory} color={COLORS.successGreen} height={35} />
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* 2. Download speed Card */}
          <Paper
            onClick={() => pushScreen('speed-test')}
            sx={{ p: 2, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 8, height: 8, bgcolor: COLORS.accentBlue, borderRadius: '50%' }} />
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.textWhite }}>Download Throughput</Typography>
              </Stack>
              <Chip label="STANDBY" size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700, bgcolor: 'rgba(47, 128, 255, 0.12)', color: COLORS.accentBlue }} />
            </Stack>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={5}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.accentBlue }}>{speedVal.toFixed(1)} <Typography component="span" sx={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>Mbps</Typography></Typography>
                <Typography sx={{ fontSize: '0.58rem', color: COLORS.textSecondary }}>LTE Cell Capacity</Typography>
              </Grid>
              <Grid item xs={7}>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end', height: 35 }}>
                  {[45, 62, 58, 79, 90, 84, 76, 92].map((s, idx) => (
                    <Box key={idx} sx={{ flex: 1, bgcolor: COLORS.border, height: `${s}%`, borderRadius: '1px', borderTop: `1px solid ${COLORS.accentBlue}` }} />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* 3. Web Load Card */}
          <Paper
            onClick={() => pushScreen('web-load-details')}
            sx={{ p: 2, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 8, height: 8, bgcolor: COLORS.warningAmber, borderRadius: '50%' }} />
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.textWhite }}>HTTP Page Load (QoE)</Typography>
              </Stack>
              <Chip label="QOE RUNNING" size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700, bgcolor: 'rgba(245, 166, 35, 0.12)', color: COLORS.warningAmber }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.warningAmber, mb: 1 }}>1.42 <Typography component="span" sx={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>sec</Typography></Typography>
            
            {/* Segmented Waterfall load bar */}
            <Box sx={{ display: 'flex', height: 6, borderRadius: '3px', overflow: 'hidden' }}>
              <Box sx={{ width: '15%', bgcolor: '#FF4D5E' }} /> {/* DNS */}
              <Box sx={{ width: '20%', bgcolor: '#8B5CF6' }} /> {/* TCP */}
              <Box sx={{ width: '15%', bgcolor: '#2F80FF' }} /> {/* TLS */}
              <Box sx={{ width: '30%', bgcolor: '#14D9C4' }} /> {/* TTFB */}
              <Box sx={{ width: '20%', bgcolor: '#10B981' }} /> {/* Load */}
            </Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
              <Typography sx={{ fontSize: '0.58rem', color: COLORS.textSecondary }}>DNS: 42ms</Typography>
              <Typography sx={{ fontSize: '0.58rem', color: COLORS.textSecondary }}>TTFB: 320ms</Typography>
            </Stack>
          </Paper>

          {/* 4. Video Stream Card */}
          <Paper
            onClick={() => pushScreen('video-stream-details')}
            sx={{ p: 2, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)' } }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ width: 8, height: 8, bgcolor: COLORS.purple5G, borderRadius: '50%' }} />
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: COLORS.textWhite }}>Video Streaming</Typography>
              </Stack>
              <Chip label="1080p HD" size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700, bgcolor: 'rgba(139, 92, 246, 0.18)', color: '#B794FF' }} />
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography sx={{ fontSize: '0.58rem', color: COLORS.textSecondary }}>BITRATE</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: COLORS.textWhite }}>4.2 Mbps</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography sx={{ fontSize: '0.58rem', color: COLORS.textSecondary }}>BUFFER STALLS</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: COLORS.successGreen }}>0 (Excellent)</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Stack>
      </Box>
    );
  };

  // Screen 4: Test History
  const renderTestHistory = () => {
    return (
      <Box sx={{ p: 2, pb: 10 }}>
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: COLORS.textSecondary, letterSpacing: 1.5, mb: 0.5 }}>COMPLETED LOGS</Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textWhite, mb: 3 }}>Test History</Typography>

        <Stack spacing={2}>
          {sessions.map(s => {
            const hasGlow = s.avgRsrp >= -85;
            return (
              <Paper
                key={s.id}
                sx={{
                  p: 2,
                  bgcolor: COLORS.bgCard,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '20px',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: COLORS.bgElevated,
                    boxShadow: hasGlow ? '0 0 10px rgba(18, 214, 160, 0.15)' : 'none'
                  },
                  transition: 'all 0.2s'
                }}
              >
                <Stack direction="row" spacing={2} onClick={() => pushScreen('session-report', { session: s })}>
                  {/* Left mini map thumbnail representation */}
                  <Box sx={{
                    width: 70,
                    height: 70,
                    borderRadius: '12px',
                    bgcolor: COLORS.bgSecondary,
                    border: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {/* Simulated route drawing */}
                    <svg width="60" height="60" viewBox="0 0 100 100" style={{ transform: 'rotate(-45deg)' }}>
                      <path
                        d="M 10,80 Q 50,20 90,80"
                        fill="none"
                        stroke={hasGlow ? COLORS.successGreen : COLORS.warningAmber}
                        strokeWidth="5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </Box>

                  {/* Metadata */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.textWhite, mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.testName}
                    </Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary, mb: 1 }}>
                      {s.operatorName} · {s.technology} · {s.date}
                    </Typography>
                    
                    <Stack direction="row" spacing={2}>
                      <Box>
                        <Typography sx={{ fontSize: '0.52rem', color: COLORS.textDim }}>DIST</Typography>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.textWhite }}>{s.distance} km</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.52rem', color: COLORS.textDim }}>RSRP</Typography>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: getStatusByRsrp(s.avgRsrp) === 'excellent' ? COLORS.successGreen : COLORS.warningAmber }}>{s.avgRsrp} dBm</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: '0.52rem', color: COLORS.textDim }}>SPEED</Typography>
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.textWhite }}>{s.avgSpeed.toFixed(0)} M</Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Stack>

                {/* Badges / Actions */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
                  {s.exported ? (
                    <Chip
                      label="EXPORTED"
                      size="small"
                      icon={<CheckIcon sx={{ fontSize: 10, color: `${COLORS.successGreen} !important` }} />}
                      sx={{ height: 18, fontSize: '0.55rem', fontWeight: 700, bgcolor: 'rgba(18, 214, 160, 0.08)', color: COLORS.successGreen }}
                    />
                  ) : (
                    <Chip
                      label="EXPORT LOG"
                      size="small"
                      onClick={() => pushScreen('export-center', { session: s })}
                      sx={{ height: 18, fontSize: '0.55rem', fontWeight: 700, bgcolor: COLORS.border, color: COLORS.textWhite, cursor: 'pointer' }}
                    />
                  )}
                  <IconButton
                    size="small"
                    onClick={() => deleteSession(s.id)}
                    sx={{ color: COLORS.errorRed, p: 0 }}
                  >
                    <DeleteIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      </Box>
    );
  };

  // Screen 5: Settings
  const renderSettings = () => {
    return (
      <Box sx={{ p: 2, pb: 10 }}>
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: COLORS.textSecondary, letterSpacing: 1.5, mb: 0.5 }}>GLOBAL PARAMETERS</Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.textWhite, mb: 3 }}>Settings</Typography>

        <Stack spacing={3}>
          {/* Section A: Test Parameters */}
          <Box>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.accentBlue, letterSpacing: 1, textTransform: 'uppercase', mb: 1.5 }}>
              A. Test Parameters
            </Typography>
            <Paper sx={{ p: 2, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
              <Stack spacing={2.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: COLORS.textWhite }}>Ping Interval</Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>Delay between ping test requests</Typography>
                  </Box>
                  <Select
                    value={pingInterval}
                    onChange={(e) => setPingInterval(e.target.value)}
                    size="small"
                    sx={{ color: COLORS.textWhite, border: `1px solid ${COLORS.border}`, height: 32, fontSize: '0.8rem' }}
                  >
                    <MenuItem value={500}>500 ms</MenuItem>
                    <MenuItem value={1000}>1.0 sec</MenuItem>
                    <MenuItem value={2000}>2.0 sec</MenuItem>
                  </Select>
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: COLORS.textWhite }}>Packet Size</Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>ICMP ping buffer payload size</Typography>
                  </Box>
                  <Select
                    value={packetSize}
                    onChange={(e) => setPacketSize(e.target.value)}
                    size="small"
                    sx={{ color: COLORS.textWhite, border: `1px solid ${COLORS.border}`, height: 32, fontSize: '0.8rem' }}
                  >
                    <MenuItem value={32}>32 Bytes</MenuItem>
                    <MenuItem value={64}>64 Bytes</MenuItem>
                    <MenuItem value={512}>512 Bytes</MenuItem>
                  </Select>
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: COLORS.textWhite }}>Speed Server</Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>Active endpoint node target</Typography>
                  </Box>
                  <Chip
                    label="Freetown Cache"
                    size="small"
                    onClick={() => setModalOpen('server-picker')}
                    sx={{ bgcolor: COLORS.border, color: COLORS.textWhite, fontSize: '0.72rem', cursor: 'pointer' }}
                  />
                </Stack>
              </Stack>
            </Paper>
          </Box>

          {/* Section B: Display Settings */}
          <Box>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.accentBlue, letterSpacing: 1, textTransform: 'uppercase', mb: 1.5 }}>
              B. Display
            </Typography>
            <Paper sx={{ p: 2, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
              <Stack spacing={2.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: COLORS.textWhite }}>Default Map Metric</Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>Primary rendering route color</Typography>
                  </Box>
                  <Select
                    value={mapMetric}
                    onChange={(e) => setMapMetric(e.target.value)}
                    size="small"
                    sx={{ color: COLORS.textWhite, border: `1px solid ${COLORS.border}`, height: 32, fontSize: '0.8rem' }}
                  >
                    <MenuItem value="rsrp">RSRP</MenuItem>
                    <MenuItem value="sinr">SINR</MenuItem>
                    <MenuItem value="speed">Throughput</MenuItem>
                  </Select>
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: COLORS.textWhite }}>Units System</Typography>
                    <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>Distance telemetry metrics</Typography>
                  </Box>
                  <Select
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    size="small"
                    sx={{ color: COLORS.textWhite, border: `1px solid ${COLORS.border}`, height: 32, fontSize: '0.8rem' }}
                  >
                    <MenuItem value="metric">Metric (km)</MenuItem>
                    <MenuItem value="imperial">Imperial (mi)</MenuItem>
                  </Select>
                </Stack>
              </Stack>
            </Paper>
          </Box>

          {/* Section C: Export & Cloud */}
          <Box>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.accentBlue, letterSpacing: 1, textTransform: 'uppercase', mb: 1.5 }}>
              C. Export & Cloud Upload
            </Typography>
            <Paper sx={{ p: 2, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
              <Stack spacing={2.5}>
                <FormControlLabel
                  control={<Switch checked={autoUpload} onChange={(e) => setAutoUpload(e.target.checked)} color="primary" size="small" />}
                  label={
                    <Box sx={{ ml: 1 }}>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: COLORS.textWhite }}>Auto-Upload Session</Typography>
                      <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>Upload log upon session completion</Typography>
                    </Box>
                  }
                  sx={{ width: '100%', justifyContent: 'space-between', flexDirection: 'row-reverse', m: 0 }}
                />
                
                <Divider sx={{ borderColor: COLORS.border }} />

                <Stack spacing={1}>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.textSecondary }}>SFTP ENDPOINT HOST</Typography>
                  <TextField
                    value={sftpHost}
                    onChange={(e) => setSftpHost(e.target.value)}
                    size="small"
                    variant="outlined"
                    sx={{ input: { color: COLORS.textWhite, fontSize: '0.75rem', py: 1 }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: COLORS.border } } }}
                  />
                </Stack>

                <Stack spacing={1}>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.textSecondary }}>SFTP USERNAME</Typography>
                  <TextField
                    value={sftpUser}
                    onChange={(e) => setSftpUser(e.target.value)}
                    size="small"
                    variant="outlined"
                    sx={{ input: { color: COLORS.textWhite, fontSize: '0.75rem', py: 1 }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: COLORS.border } } }}
                  />
                </Stack>
              </Stack>
            </Paper>
          </Box>

          {/* Section D: Diagnostics */}
          <Box sx={{ mb: 6 }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.accentBlue, letterSpacing: 1, textTransform: 'uppercase', mb: 1.5 }}>
              D. Diagnostics
            </Typography>
            <Paper sx={{ p: 2, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ fontSize: '0.8rem', color: COLORS.textWhite, fontWeight: 600 }}>App Version</Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: COLORS.textSecondary }}>v2.4.0 (Build 902)</Typography>
                </Stack>
                
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ fontSize: '0.8rem', color: COLORS.textWhite, fontWeight: 600 }}>Permission Status</Typography>
                  <Chip
                    label="GRANTED"
                    size="small"
                    onClick={() => setModalOpen('permission')}
                    sx={{ bgcolor: 'rgba(18, 214, 160, 0.12)', color: COLORS.successGreen, fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}
                  />
                </Stack>

                <Divider sx={{ borderColor: COLORS.border }} />

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => pushScreen('about-diagnostics')}
                  sx={{ color: COLORS.textWhite, borderColor: COLORS.border, borderRadius: '12px', fontSize: '0.75rem', py: 1 }}
                >
                  Inspect Diagnostic Console
                </Button>

                <Button
                  fullWidth
                  color="error"
                  variant="outlined"
                  onClick={() => setModalOpen('reset-confirm')}
                  sx={{ borderRadius: '12px', fontSize: '0.75rem', py: 1 }}
                >
                  Reset All Session Data
                </Button>
              </Stack>
            </Paper>
          </Box>
        </Stack>
      </Box>
    );
  };

  // Screen 6: Cell Details (Serving + neighbors)
  const renderCellDetails = () => {
    return (
      <Box sx={{ p: 2, pb: 4 }}>
        {/* Header */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <IconButton onClick={popScreen} sx={{ color: COLORS.textWhite, p: 0 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.textWhite }}>Cell Details</Typography>
            <Typography sx={{ fontSize: '0.65rem', color: COLORS.textSecondary }}>Serving + Neighbor Cells</Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Chip
            icon={<Box sx={{ width: 6, height: 6, bgcolor: COLORS.successGreen, borderRadius: '50%', ml: 1, animation: 'pulse 1.5s infinite alternate' }} />}
            label="LIVE CELL"
            size="small"
            sx={{ bgcolor: 'rgba(18, 214, 160, 0.12)', color: COLORS.successGreen, fontSize: '0.6rem', fontWeight: 700 }}
          />
        </Stack>

        {/* Serving Cell Card */}
        <Paper sx={{ p: 2.5, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography sx={{ fontSize: '0.52rem', color: COLORS.textSecondary, fontWeight: 700, letterSpacing: 1 }}>SERVING RAT</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: COLORS.purple5G }}>5G NSA (NR-ARFCN 627312)</Typography>
            </Box>
            <Chip label="Orange SL" size="small" sx={{ bgcolor: COLORS.border, color: COLORS.textWhite, fontSize: '0.62rem' }} />
          </Stack>

          <Grid container spacing={2.5}>
            {[
              { label: 'RSRP', val: `${currentRsrp} dBm` },
              { label: 'RSRQ', val: `${currentRsrq} dB` },
              { label: 'SINR', val: `${currentSinr} dB` },
              { label: 'PCI', val: currentPci },
              { label: 'TAC', val: '8401' },
              { label: 'EARFCN', val: '1650' },
              { label: 'MCC', val: '619' },
              { label: 'MNC', val: '01' },
              { label: 'Band', val: 'B3 (1800MHz)' },
            ].map(m => (
              <Grid item xs={4} key={m.label}>
                <Typography sx={{ fontSize: '0.55rem', color: COLORS.textDim, fontWeight: 700 }}>{m.label}</Typography>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: COLORS.textWhite }}>{m.val}</Typography>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Signal History Spark chart */}
        <Paper sx={{ p: 2.5, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.textWhite, mb: 2 }}>RSRP Signal History (60s)</Typography>
          <Box sx={{ height: 110 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rsrpTrend.map((v, i) => ({ time: i, rsrp: v }))}>
                <defs>
                  <linearGradient id="rsrp-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.successGreen} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.successGreen} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <YAxis domain={[-115, -70]} hide />
                <RechartsTooltip contentStyle={{ bgcolor: COLORS.bgCard, borderColor: COLORS.border }} />
                <Area type="monotone" dataKey="rsrp" stroke={COLORS.successGreen} strokeWidth={2.5} fillOpacity={1} fill="url(#rsrp-grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        {/* Neighbor cells section */}
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.textWhite, mb: 1.5, ml: 0.5 }}>Neighbor Cells</Typography>
        <Paper sx={{ bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px', overflow: 'hidden', mb: 3 }}>
          <List dense disablePadding>
            {[
              { pci: 304, earfcn: 1650, rsrp: -92, quality: 'good' },
              { pci: 88, earfcn: 1650, rsrp: -104, quality: 'fair' },
              { pci: 412, earfcn: 1650, rsrp: -113, quality: 'poor' },
              { pci: 219, earfcn: 1650, rsrp: -118, quality: 'poor' }
            ].map((n, idx, arr) => (
              <ListItem
                key={n.pci}
                divider={idx < arr.length - 1}
                onClick={() => {
                  setModalParams({ pci: n.pci, earfcn: n.earfcn, rsrp: n.rsrp });
                  setModalOpen('neighbor-detail');
                }}
                sx={{ py: 1.25, px: 2, cursor: 'pointer', '&:hover': { bgcolor: COLORS.bgElevated } }}
              >
                <ListItemText
                  primary={<Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: COLORS.textWhite }}>Cell PCI {n.pci}</Typography>}
                  secondary={<Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>EARFCN: {n.earfcn}</Typography>}
                />
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: STATUS_COLORS[n.quality].text }}>
                    {n.rsrp} dBm
                  </Typography>
                  <Chip
                    label={n.quality.toUpperCase()}
                    size="small"
                    sx={{ height: 16, fontSize: '0.52rem', fontWeight: 700, bgcolor: STATUS_COLORS[n.quality].bg, color: STATUS_COLORS[n.quality].text }}
                  />
                </Stack>
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Handover Event Timeline */}
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.textWhite, mb: 1.5, ml: 0.5 }}>Handover Event Timeline</Typography>
        <Paper sx={{ p: 2, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
          <Stack spacing={2}>
            {alerts.filter(a => a.title.includes('Handover')).map(h => (
              <Stack key={h.id} direction="row" spacing={1.5}>
                {/* Timeline node */}
                <Stack alignItems="center">
                  <Box sx={{ width: 8, height: 8, bgcolor: COLORS.accentBlue, borderRadius: '50%', mt: 0.5 }} />
                  <Box sx={{ width: 1, bgcolor: COLORS.border, flex: 1 }} />
                </Stack>
                <Box>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: COLORS.textWhite }}>{h.title}</Typography>
                  <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>{h.desc}</Typography>
                  <Typography sx={{ fontSize: '0.55rem', color: COLORS.textDim }}>Time: {h.time}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Paper>
      </Box>
    );
  };

  // Screen 7: Full Speed Test Page
  const renderFullSpeedTest = () => {
    return (
      <Box sx={{ p: 2, pb: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <IconButton onClick={popScreen} sx={{ color: COLORS.textWhite, p: 0 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.textWhite }}>Speed Test</Typography>
            <Typography sx={{ fontSize: '0.65rem', color: COLORS.textSecondary }}>Dedicated capacity sweep</Typography>
          </Box>
        </Stack>

        {/* Server picker pill */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Chip
            label={speedServer}
            onClick={() => setModalOpen('server-picker')}
            sx={{ bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, color: COLORS.textWhite, fontSize: '0.72rem', px: 1 }}
          />
        </Box>

        {/* Speed test Dial */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SpeedGauge value={speedTestVal} max={300} phase={speedTestPhase} />
        </Box>

        {/* Results row card */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
          <Grid container spacing={1}>
            <Grid item xs={3} sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.52rem', color: COLORS.textDim, fontWeight: 700 }}>DOWNLOAD</Typography>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: COLORS.successGreen }}>
                {speedTestDl ? `${speedTestDl.toFixed(0)} M` : '—'}
              </Typography>
            </Grid>
            <Grid item xs={3} sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.52rem', color: COLORS.textDim, fontWeight: 700 }}>UPLOAD</Typography>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: COLORS.purple5G }}>
                {speedTestUl ? `${speedTestUl.toFixed(0)} M` : '—'}
              </Typography>
            </Grid>
            <Grid item xs={3} sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: COLORS.textWhite }}>
                {speedTestPing ? `${speedTestPing} ms` : '—'}
              </Typography>
            </Grid>
            <Grid item xs={3} sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.52rem', color: COLORS.textDim, fontWeight: 700 }}>JITTER</Typography>
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: COLORS.textWhite }}>
                {speedTestJitter ? `${speedTestJitter} ms` : '—'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Start / Stop floating button */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <IconButton
            onClick={speedTestRunning ? () => { setSpeedTestRunning(false); setSpeedTestPhase('idle'); } : runSpeedTestSim}
            disabled={speedTestRunning && speedTestPhase !== 'complete'}
            sx={{
              width: 58,
              height: 58,
              bgcolor: speedTestRunning ? COLORS.errorRed : COLORS.successGreen,
              color: COLORS.bgPrimary,
              '&:hover': {
                bgcolor: speedTestRunning ? COLORS.errorRed : COLORS.successGreen,
                boxShadow: `0 0 16px ${speedTestRunning ? COLORS.errorRed : COLORS.successGreen}`
              },
              boxShadow: `0 0 12px rgba(${speedTestRunning ? '255,77,94' : '18,214,160'}, 0.4)`
            }}
          >
            {speedTestRunning ? <CloseIcon /> : <PlayArrowIcon />}
          </IconButton>
        </Box>
      </Box>
    );
  };

  // Screen 8: Session Report Analytics Page
  const renderSessionReport = () => {
    const s = current.params.session;
    if (!s) return null;

    return (
      <Box sx={{ p: 2, pb: 4 }}>
        {/* Header */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
          <IconButton onClick={popScreen} sx={{ color: COLORS.textWhite, p: 0 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.textWhite, fontSize: '1rem' }}>Session Report</Typography>
            <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>{s.testName}</Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <IconButton
            onClick={() => pushScreen('export-center', { session: s })}
            sx={{ color: COLORS.textWhite }}
          >
            <ShareIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>

        {/* Quality Score Hero Card */}
        <Paper sx={{
          p: 2.5,
          mb: 3,
          bgcolor: COLORS.bgCard,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '24px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          background: 'radial-gradient(circle at 80% 20%, rgba(18, 214, 160, 0.08) 0%, transparent 60%)',
          borderLeft: `4px solid ${COLORS.successGreen}`
        }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography sx={{ fontSize: '0.55rem', fontWeight: 800, color: COLORS.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                OVERALL QUALITY SCORE
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.textWhite, my: 0.5 }}>
                {s.avgRsrp >= -85 ? '94%' : s.avgRsrp >= -95 ? '81%' : '62%'}
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: COLORS.successGreen, fontWeight: 700 }}>
                {s.avgRsrp >= -85 ? 'EXCELLENT PERFORMANCE' : 'GOOD COVERAGE'}
              </Typography>
            </Box>
            <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: 'rgba(18, 214, 160, 0.12)', display: 'grid', placeItems: 'center', border: `1px solid ${COLORS.successGreen}33` }}>
              <SignalCellularAltIcon sx={{ color: COLORS.successGreen, fontSize: 28 }} />
            </Box>
          </Stack>
        </Paper>

        {/* Summary Metric Grid */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'DISTANCE', val: `${s.distance} km` },
            { label: 'DURATION', val: `${new Date(s.duration * 1000).toISOString().substr(11, 8)}` },
            { label: 'AVG SPEED', val: `${s.avgSpeed.toFixed(1)} M` },
            { label: 'DROP COUNT', val: s.dropCount, color: s.dropCount > 0 ? COLORS.errorRed : COLORS.textWhite }
          ].map(m => (
            <Grid item xs={6} key={m.label}>
              <Paper sx={{ p: 1.5, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '16px' }}>
                <Typography sx={{ fontSize: '0.52rem', color: COLORS.textDim, fontWeight: 700 }}>{m.label}</Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: m.color || COLORS.textWhite }}>{m.val}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Mini static polyline map */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '24px', overflow: 'hidden' }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.textWhite, mb: 1.5 }}>Coverage Path Map</Typography>
          <Box sx={{ height: 140, borderRadius: '16px', overflow: 'hidden', border: `1px solid ${COLORS.border}`, position: 'relative' }}>
            <MapContainer center={s.points[0] ? [s.points[0].lat, s.points[0].lng] : SL_CENTER} zoom={14} style={{ width: '100%', height: '100%' }} zoomControl={false}>
              <TileLayer
                url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`}
              />
              <RoutePath points={s.points} metric="rsrp" />
            </MapContainer>
          </Box>
        </Paper>

        {/* Stacked distribution coverage */}
        <Paper sx={{ p: 2.5, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '24px' }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.textWhite, mb: 1.5 }}>Signal Quality Distribution</Typography>
          <StackedBar excellent={s.avgRsrp >= -85 ? 60 : 25} good={30} fair={10} poor={5} />
        </Paper>

        {/* Donut tech distribution */}
        <Paper sx={{ p: 2.5, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '24px' }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.textWhite, mb: 1.5 }}>Technology Footprint</Typography>
          <DonutChart val1={s.technology === '5G-NSA' ? 75 : 0} lab1="5G NR" val2={100} lab2="4G LTE" />
        </Paper>

        {/* Actions panel */}
        <Stack spacing={2} sx={{ mb: 4 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => triggerCSVDownload(s)}
            startIcon={<FileDownloadIcon />}
            sx={{ bgcolor: COLORS.accentBlue, color: COLORS.textWhite, py: 1.25, borderRadius: '14px', fontWeight: 700 }}
          >
            Export Logs as CSV
          </Button>

          <Button
            fullWidth
            variant="outlined"
            onClick={() => triggerKMLDownload(s)}
            startIcon={<MapIcon />}
            sx={{ color: COLORS.textWhite, borderColor: COLORS.border, py: 1.25, borderRadius: '14px' }}
          >
            Export GIS Route as KML
          </Button>
        </Stack>
      </Box>
    );
  };

  // Screen 9: Heatmap View
  const renderHeatmapView = () => {
    const points = recordedPoints.length > 0 ? recordedPoints : sessions[0].points;
    const centerPoint = points[0] ? [points[0].lat, points[0].lng] : SL_CENTER;

    return (
      <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
        <MapContainer center={centerPoint} zoom={15} style={{ width: '100%', height: '100%' }} zoomControl={false}>
          <TileLayer
            url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`}
          />
          {/* Render circular markers styled like high-density heat blooms */}
          {points.map((p, idx) => {
            const v = p.rsrp;
            const fill = v >= -85 ? COLORS.successGreen : v >= -95 ? COLORS.goodGreen : v >= -110 ? COLORS.warningAmber : COLORS.errorRed;
            return (
              <CircleMarker
                key={idx}
                center={[p.lat, p.lng]}
                radius={22}
                pathOptions={{
                  fillColor: fill,
                  fillOpacity: 0.12,
                  stroke: false
                }}
              />
            );
          })}
          {/* Central location marker */}
          {points[points.length - 1] && (
            <LocationMarker position={[points[points.length - 1].lat, points[points.length - 1].lng]} />
          )}
        </MapContainer>

        {/* Legend Overlay */}
        <Paper sx={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 12,
          p: 2,
          bgcolor: 'rgba(17, 24, 42, 0.88)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${COLORS.border}`,
          borderRadius: '20px',
          zIndex: 1000
        }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.textWhite }}>Signal Density Heatmap</Typography>
            <Button
              size="small"
              onClick={popScreen}
              sx={{ color: COLORS.accentBlue, fontSize: '0.65rem', p: 0, minWidth: 0 }}
            >
              Path View
            </Button>
          </Stack>

          <Grid container spacing={1} sx={{ textAlign: 'center' }}>
            <Grid item xs={3}>
              <Box sx={{ width: '100%', height: 4, bgcolor: COLORS.successGreen, borderRadius: 1 }} />
              <Typography sx={{ fontSize: '0.55rem', color: COLORS.textSecondary, mt: 0.5 }}>Exc (&gt;-85)</Typography>
            </Grid>
            <Grid item xs={3}>
              <Box sx={{ width: '100%', height: 4, bgcolor: COLORS.goodGreen, borderRadius: 1 }} />
              <Typography sx={{ fontSize: '0.55rem', color: COLORS.textSecondary, mt: 0.5 }}>Good (&gt;-95)</Typography>
            </Grid>
            <Grid item xs={3}>
              <Box sx={{ width: '100%', height: 4, bgcolor: COLORS.warningAmber, borderRadius: 1 }} />
              <Typography sx={{ fontSize: '0.55rem', color: COLORS.textSecondary, mt: 0.5 }}>Fair (&gt;-110)</Typography>
            </Grid>
            <Grid item xs={3}>
              <Box sx={{ width: '100%', height: 4, bgcolor: COLORS.errorRed, borderRadius: 1 }} />
              <Typography sx={{ fontSize: '0.55rem', color: COLORS.textSecondary, mt: 0.5 }}>Poor (&lt;-110)</Typography>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    );
  };

  // Screen 10: Alerts & Operational Events
  const renderAlertsEvents = () => {
    const filteredAlerts = alerts.filter(a => {
      if (alertFilter === 'All') return true;
      if (alertFilter === 'Signal') return a.title.includes('signal') || a.title.includes('Poor');
      if (alertFilter === 'Handovers') return a.title.includes('Handover') || a.title.includes('Upgrade');
      if (alertFilter === 'Drops') return a.title.includes('Drop');
      return true;
    });

    return (
      <Box sx={{ p: 2, pb: 4 }}>
        {/* Header */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
          <IconButton onClick={popScreen} sx={{ color: COLORS.textWhite, p: 0 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.textWhite }}>Alerts & Events</Typography>
            <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>Real-time operation stream</Typography>
          </Box>
          <Button
            size="small"
            color="error"
            onClick={() => setAlerts([])}
            sx={{ fontSize: '0.7rem' }}
          >
            Clear All
          </Button>
        </Stack>

        {/* Filter chips */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3, overflowX: 'auto', pb: 1 }}>
          {['All', 'Signal', 'Handovers', 'Drops'].map(c => (
            <Chip
              key={c}
              label={c}
              size="small"
              onClick={() => setAlertFilter(c)}
              sx={{
                bgcolor: alertFilter === c ? COLORS.accentBlue : COLORS.bgCard,
                color: alertFilter === c ? COLORS.textWhite : COLORS.textSecondary,
                border: alertFilter === c ? 'none' : `1px solid ${COLORS.border}`
              }}
            />
          ))}
        </Box>

        {/* List of Alerts */}
        {filteredAlerts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <NotificationsIcon sx={{ fontSize: 48, color: COLORS.textDim, mb: 1 }} />
            <Typography sx={{ color: COLORS.textSecondary, fontSize: '0.8rem' }}>No events logged in filter</Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {filteredAlerts.map(a => {
              const borderCol = a.severity === 'error' ? COLORS.errorRed : a.severity === 'warning' ? COLORS.warningAmber : a.severity === 'success' ? COLORS.successGreen : COLORS.accentBlue;
              return (
                <Paper
                  key={a.id}
                  sx={{
                    p: 2,
                    bgcolor: COLORS.bgCard,
                    border: `1px solid ${COLORS.border}`,
                    borderLeft: `3px solid ${borderCol}`,
                    borderRadius: '16px'
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: COLORS.textWhite }}>{a.title}</Typography>
                    <Typography sx={{ fontSize: '0.58rem', color: COLORS.textDim }}>{a.time}</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: '0.68rem', color: COLORS.textMuted, mb: 1 }}>{a.desc}</Typography>
                  {a.loc && (
                    <Typography sx={{ fontSize: '0.52rem', color: COLORS.textDim, fontFamily: 'monospace' }}>GPS: {a.loc}</Typography>
                  )}
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>
    );
  };

  // Screen 11: Ping Details
  const renderPingDetails = () => {
    return (
      <Box sx={{ p: 2, pb: 4 }}>
        {/* Header */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
          <IconButton onClick={popScreen} sx={{ color: COLORS.textWhite, p: 0 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.textWhite }}>Ping Diagnostics</Typography>
            <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>ICMP Echo Sweeper</Typography>
          </Box>
        </Stack>

        <Paper sx={{ p: 3, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '24px', textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: COLORS.textSecondary, letterSpacing: 1.5, mb: 1 }}>CURRENT LATENCY</Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, color: COLORS.successGreen, mb: 1 }}>
            {currentPing} <Typography component="span" sx={{ fontSize: '1rem', color: COLORS.textSecondary }}>ms</Typography>
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
            <Chip label={`Jitter: ${pingJitter} ms`} size="small" sx={{ bgcolor: COLORS.border, color: COLORS.textWhite }} />
            <Chip label="Packet Loss: 0.0%" size="small" sx={{ bgcolor: 'rgba(18, 214, 160, 0.12)', color: COLORS.successGreen }} />
          </Stack>
        </Paper>

        {/* Live Line Graph */}
        <Paper sx={{ p: 2.5, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '24px' }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.textWhite, mb: 2 }}>Ping Line Graph</Typography>
          <Box sx={{ height: 100 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pingHistory.map((v, i) => ({ time: i, ping: v }))}>
                <YAxis domain={['auto', 'auto']} hide />
                <Line type="monotone" dataKey="ping" stroke={COLORS.successGreen} strokeWidth={2.5} dot={{ fill: COLORS.successGreen }} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        {/* Host Parameters info */}
        <Paper sx={{ p: 2, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
          <Stack spacing={1.5}>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>Target Host:</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: COLORS.textWhite, fontWeight: 700 }}>8.8.8.8 (Google DNS)</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>Buffer Bytes:</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: COLORS.textWhite, fontWeight: 700 }}>{packetSize} Bytes</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>Interval Delay:</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: COLORS.textWhite, fontWeight: 700 }}>{pingInterval} ms</Typography>
            </Stack>
          </Stack>
        </Paper>
      </Box>
    );
  };

  // Screen 12: Web Load Details
  const renderWebLoadDetails = () => {
    return (
      <Box sx={{ p: 2, pb: 4 }}>
        {/* Header */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
          <IconButton onClick={popScreen} sx={{ color: COLORS.textWhite, p: 0 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.textWhite }}>Web Page Load</Typography>
            <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>HTTP GET diagnostics</Typography>
          </Box>
        </Stack>

        <Paper sx={{ p: 2.5, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
          <Typography sx={{ fontSize: '0.55rem', color: COLORS.textSecondary, fontWeight: 700, mb: 0.5 }}>TARGET URL</Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.textWhite, mb: 2 }}>https://www.gov.sl/portal</Typography>
          
          <Typography variant="h3" sx={{ fontWeight: 800, color: COLORS.warningAmber, mb: 1 }}>
            1.42 <Typography component="span" sx={{ fontSize: '0.9rem', color: COLORS.textSecondary }}>seconds</Typography>
          </Typography>
          <Chip label="HTTP Status: 200 OK" size="small" sx={{ bgcolor: 'rgba(18, 214, 160, 0.12)', color: COLORS.successGreen }} />
        </Paper>

        {/* Detailed Waterfall segmented bars */}
        <Paper sx={{ p: 2.5, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '24px' }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.textWhite, mb: 2.5 }}>HTTP Timing Breakdown</Typography>
          <Stack spacing={2}>
            {[
              { label: 'DNS Resolution', val: '42 ms', pct: '15%', bg: '#FF4D5E' },
              { label: 'TCP Handshake', val: '120 ms', pct: '25%', bg: '#8B5CF6' },
              { label: 'TLS Exchange', val: '65 ms', pct: '15%', bg: '#2F80FF' },
              { label: 'Time-To-First-Byte (TTFB)', val: '820 ms', pct: '50%', bg: '#14D9C4' },
              { label: 'Document Render', val: '373 ms', pct: '30%', bg: '#10B981' }
            ].map(w => (
              <Box key={w.label}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                  <Typography sx={{ fontSize: '0.7rem', color: COLORS.textWhite }}>{w.label}</Typography>
                  <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: COLORS.textMuted }}>{w.val}</Typography>
                </Stack>
                <Box sx={{ height: 6, bgcolor: COLORS.border, borderRadius: 1, overflow: 'hidden' }}>
                  <Box sx={{ width: w.pct, height: '100%', bgcolor: w.bg }} />
                </Box>
              </Box>
            ))}
          </Stack>
        </Paper>

        {/* Mini Browser preview simulator */}
        <Paper sx={{ bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px', overflow: 'hidden' }}>
          <Box sx={{ p: 1, bgcolor: COLORS.border, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS.errorRed }} />
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS.warningAmber }} />
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS.successGreen }} />
            <Box sx={{ flex: 1, bgcolor: COLORS.bgSecondary, height: 16, borderRadius: 2, display: 'flex', alignItems: 'center', px: 1 }}>
              <Typography sx={{ fontSize: '0.52rem', color: COLORS.textDim }}>gov.sl/portal</Typography>
            </Box>
          </Box>
          <Box sx={{ p: 3, textAlign: 'center', height: 80, display: 'grid', placeItems: 'center' }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 32, color: COLORS.successGreen, mb: 0.5 }} />
            <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>Page Loaded successfully</Typography>
          </Box>
        </Paper>
      </Box>
    );
  };

  // Screen 13: Video Streaming Details
  const renderVideoStreamDetails = () => {
    return (
      <Box sx={{ p: 2, pb: 4 }}>
        {/* Header */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
          <IconButton onClick={popScreen} sx={{ color: COLORS.textWhite, p: 0 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.textWhite }}>Video Streaming QoE</Typography>
            <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>Adaptive bitrate streaming profile</Typography>
          </Box>
        </Stack>

        {/* Dynamic simulator player block */}
        <Paper sx={{
          width: '100%',
          height: 160,
          bgcolor: '#000',
          border: `1px solid ${COLORS.border}`,
          borderRadius: '24px',
          mb: 3,
          position: 'relative',
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center'
        }}>
          {/* Simulated stream video placeholder */}
          <Box sx={{ textAlign: 'center', zIndex: 10 }}>
            <PlayCircleOutlineIcon sx={{ fontSize: 56, color: COLORS.textWhite, opacity: 0.6 }} />
            <Typography sx={{ fontSize: '0.62rem', color: COLORS.textWhite, fontWeight: 700, mt: 1 }}>SIMULATED LIVE CHANNEL STREAM</Typography>
          </Box>
          <Box sx={{ position: 'absolute', bottom: 12, left: 12, right: 12, zIndex: 20 }}>
            <Stack direction="row" justifyContent="space-between">
              <Chip label="1080p @ 60 FPS" size="small" sx={{ height: 16, fontSize: '0.52rem', bgcolor: COLORS.purple5G, color: COLORS.textWhite }} />
              <Typography sx={{ fontSize: '0.55rem', color: COLORS.successGreen, fontWeight: 700 }}>BUFFERING HEALTHY</Typography>
            </Stack>
          </Box>
        </Paper>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Bitrate Capacity', val: '4.8 Mbps' },
            { label: 'Startup Delay', val: '280 ms' },
            { label: 'Buffering Ratio', val: '0.0%' },
            { label: 'Stall Counts', val: '0 stalls' },
            { label: 'Active Codec', val: 'H.265 / HEVC' },
            { label: 'CDN Server Node', val: 'Freetown Edge 4' }
          ].map(m => (
            <Grid item xs={6} key={m.label}>
              <Paper sx={{ p: 1.5, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '16px' }}>
                <Typography sx={{ fontSize: '0.55rem', color: COLORS.textDim, fontWeight: 700 }}>{m.label}</Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: COLORS.textWhite }}>{m.val}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Playback health line chart */}
        <Paper sx={{ p: 2, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '24px' }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.textWhite, mb: 1.5 }}>Buffer level trend (Sec)</Typography>
          <Box sx={{ height: 80 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[12, 14, 15, 14, 18, 19, 22, 24].map((v, i) => ({ time: i, sec: v }))}>
                <defs>
                  <linearGradient id="buffer-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.purple5G} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={COLORS.purple5G} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="sec" stroke={COLORS.purple5G} fillOpacity={1} fill="url(#buffer-grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Box>
    );
  };

  // Screen 14: Export Center
  const renderExportCenter = () => {
    const s = current.params.session || sessions[0];
    
    return (
      <Box sx={{ p: 2, pb: 4 }}>
        {/* Header */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
          <IconButton onClick={popScreen} sx={{ color: COLORS.textWhite, p: 0 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.textWhite }}>Export Center</Typography>
            <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>File generation & cloud sync</Typography>
          </Box>
        </Stack>

        <Paper sx={{ p: 2, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
          <Typography sx={{ fontSize: '0.52rem', color: COLORS.textDim, fontWeight: 700 }}>SELECTED SESSION</Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: COLORS.textWhite, mb: 0.5 }}>{s.testName}</Typography>
          <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>{s.date} · {s.points.length} coordinate points recorded</Typography>
        </Paper>

        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.textWhite, mb: 1.5, ml: 0.5 }}>Select Export Format</Typography>
        
        <Stack spacing={2} sx={{ mb: 3 }}>
          {[
            { format: 'CSV Logs', desc: 'Standard cellular parameter timeseries spreadsheet', act: () => triggerCSVDownload(s) },
            { format: 'KML Map Route', desc: 'GIS coordinate polyline for Google Earth & ArcGIS', act: () => triggerKMLDownload(s) },
            { format: 'JSON Structure', desc: 'Structured raw javascript telemetry records packet', act: () => { setToastMessage('JSON payload generated'); } },
            { format: 'Sync SFTP Cloud', desc: 'Upload direct to regulatory gateway repository server', act: () => { setToastMessage('Connected to server... session synchronized.'); } }
          ].map(e => (
            <Paper
              key={e.format}
              onClick={e.act}
              sx={{
                p: 2,
                bgcolor: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '16px',
                cursor: 'pointer',
                '&:hover': { bgcolor: COLORS.bgElevated, borderColor: COLORS.accentBlue },
                transition: 'all 0.2s'
              }}
            >
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: COLORS.textWhite, mb: 0.5 }}>{e.format}</Typography>
              <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>{e.desc}</Typography>
            </Paper>
          ))}
        </Stack>
      </Box>
    );
  };

  // Screen 15: Device / Network Info Screen
  const renderDeviceNetworkInfo = () => {
    return (
      <Box sx={{ p: 2, pb: 4 }}>
        {/* Header */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
          <IconButton onClick={popScreen} sx={{ color: COLORS.textWhite, p: 0 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.textWhite }}>Device Metadata</Typography>
            <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>Firmware & hardware stats</Typography>
          </Box>
        </Stack>

        <Stack spacing={3}>
          {/* Card A: Hardware Info */}
          <Box>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.accentBlue, letterSpacing: 1, textTransform: 'uppercase', mb: 1.5, ml: 0.5 }}>
              Hardware details
            </Typography>
            <Paper sx={{ p: 2, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
              <Stack spacing={1.5}>
                {[
                  { label: 'Device Model', val: 'Samsung Galaxy S26 Ultra' },
                  { label: 'OS Version', val: 'Android 17 (V-Preview)' },
                  { label: 'Baseband Chipset', val: 'Snapdragon X85 5G Modem' },
                  { label: 'CPU Cores', val: 'Octa-Core @ 3.4 GHz' },
                  { label: 'RAM Installed', val: '12 GB LPDDR5' }
                ].map(r => (
                  <Stack key={r.label} direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>{r.label}:</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: COLORS.textWhite, fontWeight: 600 }}>{r.val}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Box>

          {/* Card B: SIM details */}
          <Box>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.accentBlue, letterSpacing: 1, textTransform: 'uppercase', mb: 1.5, ml: 0.5 }}>
              SIM slot status
            </Typography>
            <Paper sx={{ p: 2, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
              <Stack spacing={1.5}>
                {[
                  { label: 'Primary ICCID', val: '8923201402741920142' },
                  { label: 'Home Operator', val: 'Orange Sierra Leone' },
                  { label: 'MCC / MNC Code', val: '619 / 01' },
                  { label: 'Radio Technology', val: '5G NR SA / NSA' },
                  { label: 'IP Address', val: '10.142.84.102' }
                ].map(r => (
                  <Stack key={r.label} direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>{r.label}:</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: COLORS.textWhite, fontWeight: 600 }}>{r.val}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Box>

          {/* Card C: Geolocation Info */}
          <Box>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.accentBlue, letterSpacing: 1, textTransform: 'uppercase', mb: 1.5, ml: 0.5 }}>
              GPS Telemetry details
            </Typography>
            <Paper sx={{ p: 2, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
              <Stack spacing={1.5}>
                {[
                  { label: 'Current Latitude', val: recordedPoints[recordedPoints.length - 1]?.lat.toFixed(6) || FREETOWN_START.lat },
                  { label: 'Current Longitude', val: recordedPoints[recordedPoints.length - 1]?.lng.toFixed(6) || FREETOWN_START.lng },
                  { label: 'Accuracy Radius', val: `${currentGpsAcc.toFixed(1)} meters` },
                  { label: 'Satellites Locked', val: '18 Satellites (GNSS)' },
                  { label: 'GPS Provider Type', val: 'Fused Location Engine' }
                ].map(r => (
                  <Stack key={r.label} direction="row" justifyContent="space-between">
                    <Typography sx={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>{r.label}:</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: COLORS.textWhite, fontWeight: 600 }}>{r.val}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Box>
        </Stack>
      </Box>
    );
  };

  // Screen 16: About / Diagnostics Console
  const renderAboutDiagnostics = () => {
    return (
      <Box sx={{ p: 2, pb: 4 }}>
        {/* Header */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
          <IconButton onClick={popScreen} sx={{ color: COLORS.textWhite, p: 0 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.textWhite }}>Diagnostics Console</Typography>
            <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>Real-time core troubleshooting console</Typography>
          </Box>
        </Stack>

        <Paper sx={{ p: 2, mb: 3, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.accentBlue, mb: 1.5 }}>Diagnostic Logs Terminal</Typography>
          <Box sx={{
            height: 220,
            bgcolor: '#030712',
            border: `1px solid ${COLORS.border}`,
            borderRadius: '12px',
            p: 1.5,
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.6rem',
            color: '#34d399',
            lineHeight: 1.4
          }}>
            <div>[01:42:04] Starting TNIP-R Drive Log engine...</div>
            <div>[01:42:05] Fused GPS sensor: initial lock established (accuracy 2.8m)</div>
            <div>[01:42:06] NSA NR 5G secondary cell configured on band n78</div>
            <div>[01:42:08] Auto-upload sync server handshake completed</div>
            <div>[01:42:15] Telemetry loop polling active (1Hz rate)</div>
            {recordedPoints.slice(-5).map((p, idx) => (
              <div key={idx}>
                [{new Date(p.recordedAt).toTimeString().split(' ')[0]}] PCI={p.pci} RSRP={p.rsrp} SINR={p.sinr} GPS={p.lat.toFixed(5)},{p.lng.toFixed(5)}
                {p.handover && <span style={{ color: COLORS.warningAmber }}> [HANDOVER]</span>}
              </div>
            ))}
          </Box>
        </Paper>

        <Paper sx={{ p: 2, bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '20px' }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: COLORS.textWhite, mb: 1.5 }}>Troubleshooting checklist</Typography>
          <Stack spacing={1.5}>
            {[
              { rule: 'GNSS Lock check', ok: true },
              { rule: 'Cell Tower lookup permission', ok: true },
              { rule: 'Write local storage cache permission', ok: true },
              { rule: 'Gateway SFTP connection check', ok: true }
            ].map(c => (
              <Stack key={c.rule} direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: c.ok ? 'rgba(18, 214, 160, 0.12)' : 'rgba(255, 77, 94, 0.12)', display: 'grid', placeItems: 'center' }}>
                  {c.ok ? <CheckIcon sx={{ fontSize: 10, color: COLORS.successGreen }} /> : <CloseIcon sx={{ fontSize: 10, color: COLORS.errorRed }} />}
                </Box>
                <Typography sx={{ fontSize: '0.75rem', color: COLORS.textWhite }}>{c.rule}</Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>
      </Box>
    );
  };

  const renderActiveScreen = () => {
    switch (current.name) {
      case 'dashboard': return renderDashboard();
      case 'map': return renderMap();
      case 'active-tests': return renderActiveTests();
      case 'test-history': return renderTestHistory();
      case 'settings': return renderSettings();
      case 'cell-details': return renderCellDetails();
      case 'speed-test': return renderFullSpeedTest();
      case 'session-report': return renderSessionReport();
      case 'heatmap': return renderHeatmapView();
      case 'alerts': return renderAlertsEvents();
      case 'ping-details': return renderPingDetails();
      case 'web-load-details': return renderWebLoadDetails();
      case 'video-stream-details': return renderVideoStreamDetails();
      case 'export-center': return renderExportCenter();
      case 'device-info': return renderDeviceNetworkInfo();
      case 'about-diagnostics': return renderAboutDiagnostics();
      default: return renderDashboard();
    }
  };

  const getScreenTitleAndSubtitle = () => {
    switch (current.name) {
      case 'dashboard': return { title: '5G Drive Test', sub: 'QoS live monitoring engine' };
      case 'map': return { title: 'Coverage Route Map', sub: 'Signal tracking' };
      case 'active-tests': return { title: 'QoS QoS Suite', sub: 'Active test suite' };
      case 'test-history': return { title: 'Sessions history', sub: 'Drive records log' };
      case 'settings': return { title: 'App settings', sub: 'Parameters config' };
      case 'cell-details': return { title: 'Cell details', sub: 'Sector analysis' };
      case 'speed-test': return { title: 'Speed sweep test', sub: 'Capacitive test' };
      case 'session-report': return { title: 'Report dashboard', sub: 'Session summary analysis' };
      case 'heatmap': return { title: 'Signal density map', sub: 'Heat overlay tracker' };
      case 'alerts': return { title: 'Operational alerts', sub: 'Real-time alert logger' };
      case 'ping-details': return { title: 'Ping diagnostics', sub: 'Latency sweep' };
      case 'web-load-details': return { title: 'HTTP web loading', sub: 'Waterfall timing tracker' };
      case 'video-stream-details': return { title: 'Video streaming QoE', sub: 'Adaptive profiles diagnostics' };
      case 'export-center': return { title: 'Export center', sub: 'Download logs & GIS maps' };
      case 'device-info': return { title: 'System metadata', sub: 'Diagnostics hardware specs' };
      case 'about-diagnostics': return { title: 'Terminal console', sub: 'Diagnostics terminal log stream' };
      default: return { title: '5G Drive Test', sub: 'QoS live monitoring' };
    }
  };

  const headerInfo = getScreenTitleAndSubtitle();

  // Highlight bottom bar active index
  const getBottomNavIndex = () => {
    const list = ['dashboard', 'map', 'active-tests', 'test-history', 'settings'];
    const idx = list.indexOf(current.name);
    if (idx !== -1) return idx;
    
    // Sub-screens mapping to primary parent tabs
    if (['cell-details', 'device-info'].includes(current.name)) return 0;
    if (['heatmap'].includes(current.name)) return 1;
    if (['speed-test', 'ping-details', 'web-load-details', 'video-stream-details'].includes(current.name)) return 2;
    if (['session-report', 'export-center'].includes(current.name)) return 3;
    if (['about-diagnostics', 'alerts'].includes(current.name)) return 4;
    return 0;
  };

  const handleBottomNavAction = (v) => {
    const screens = ['dashboard', 'map', 'active-tests', 'test-history', 'settings'];
    resetToScreen(screens[v]);
  };

  // List of screens that should hide the bottom navigation bar for immersive layout
  const shouldHideBottomNav = ['map', 'heatmap', 'speed-test', 'session-report', 'cell-details', 'about-diagnostics', 'ping-details', 'web-load-details', 'video-stream-details'].includes(current.name);

  return (
    <MobileShellWrapper>
      {/* Top Simulated status bar */}
      <Box sx={{
        height: 38,
        px: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: COLORS.bgPrimary,
        color: COLORS.textWhite,
        fontSize: '0.72rem',
        fontWeight: 600,
        zIndex: 1000,
        flexShrink: 0
      }}>
        {/* Clock */}
        <Box sx={{ mt: 0.5 }}>14:32</Box>
        {/* Status badges */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
          <Typography sx={{ fontSize: '0.62rem', color: COLORS.purple5G, fontWeight: 700 }}>5G-NSA</Typography>
          <SignalCellularAltIcon sx={{ fontSize: 13 }} />
          <Box sx={{
            width: 18,
            height: 9,
            border: '1px solid rgba(255,255,255,0.4)',
            borderRadius: '3px',
            p: '1px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Box sx={{ width: '80%', height: '100%', bgcolor: COLORS.successGreen, borderRadius: '1px' }} />
          </Box>
        </Stack>
      </Box>

      {/* Screen Header Bar (Except on Dashboard & Map deep layout overrides) */}
      {!['dashboard', 'map', 'heatmap', 'speed-test', 'session-report', 'cell-details', 'alerts', 'ping-details', 'web-load-details', 'video-stream-details', 'export-center', 'device-info', 'about-diagnostics'].includes(current.name) && (
        <Box sx={{
          p: 2,
          bgcolor: COLORS.bgPrimary,
          borderBottom: `1px solid ${COLORS.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: COLORS.textWhite, lineHeight: 1.1 }}>
              {headerInfo.title}
            </Typography>
            <Typography sx={{ fontSize: '0.62rem', color: COLORS.textSecondary }}>
              {headerInfo.sub}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <IconButton
              onClick={() => pushScreen('alerts')}
              sx={{
                bgcolor: 'rgba(255,255,255,0.04)',
                border: `1px solid ${COLORS.border}`,
                color: COLORS.textWhite,
                width: 32,
                height: 32
              }}
            >
              <Badge badgeContent={alerts.length} color="error">
                <NotificationsIcon sx={{ fontSize: 16 }} />
              </Badge>
            </IconButton>
          </Stack>
        </Box>
      )}

      {/* Main Screen Content Viewport */}
      <Box sx={{
        flex: 1,
        overflowY: 'auto',
        bgcolor: COLORS.bgPrimary,
        position: 'relative'
      }}>
        {renderActiveScreen()}
      </Box>

      {/* Bottom Navigation tabs bar */}
      {!shouldHideBottomNav && (
        <BottomNavigation
          value={getBottomNavIndex()}
          onChange={(_, v) => handleBottomNavAction(v)}
          showLabels
          sx={{
            height: 72,
            bgcolor: COLORS.bgCard,
            borderTop: `1px solid ${COLORS.border}`,
            flexShrink: 0,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              p: 0,
              color: COLORS.iconInactive,
              '&.Mui-selected': {
                color: COLORS.accentBlue,
                textShadow: `0 0 8px ${COLORS.blueGlow}`,
                '& .MuiSvgIcon-root': {
                  filter: `drop-shadow(0 0 4px ${COLORS.blueGlow})`
                }
              }
            }
          }}
        >
          <BottomNavigationAction label="Monitor" icon={<RadioButtonCheckedIcon sx={{ fontSize: 20 }} />} />
          <BottomNavigationAction label="Route" icon={<MapIcon sx={{ fontSize: 20 }} />} />
          <BottomNavigationAction label="Tests" icon={<SpeedIcon sx={{ fontSize: 20 }} />} />
          <BottomNavigationAction label="Logs" icon={<HistoryIcon sx={{ fontSize: 20 }} />} />
          <BottomNavigationAction label="Config" icon={<SettingsIcon sx={{ fontSize: 20 }} />} />
        </BottomNavigation>
      )}

      {/* ── GLOBAL MODALS & OVERLAYS ───────────────────────────────────────── */}

      {/* Modal 1: Metric details description modal */}
      <Dialog
        open={modalOpen === 'metric-detail'}
        onClose={() => setModalOpen(null)}
        PaperProps={{ sx: { bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '24px', p: 1 } }}
      >
        <DialogTitle sx={{ color: COLORS.textWhite, fontWeight: 800 }}>{modalParams.metric} Metric Details</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: COLORS.textMuted, fontSize: '0.8rem', mb: 3 }}>{modalParams.desc}</Typography>
          <Paper sx={{ p: 2, bgcolor: COLORS.bgSecondary, border: `1px solid ${COLORS.border}`, borderRadius: '16px' }}>
            <Typography sx={{ fontSize: '0.72rem', color: COLORS.textSecondary, mb: 1 }}>CURRENT TELEMETRY VALUE</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.accentBlue }}>
              {modalParams.val} {modalParams.unit}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(null)} sx={{ color: COLORS.textWhite }}>Dismiss</Button>
        </DialogActions>
      </Dialog>

      {/* Modal 2: Confirm Stop recording dialog */}
      <Dialog
        open={modalOpen === 'stop-confirm'}
        onClose={() => setModalOpen(null)}
        PaperProps={{ sx: { bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '24px' } }}
      >
        <DialogTitle sx={{ color: COLORS.textWhite, fontWeight: 800 }}>Confirm Stop Recording</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: COLORS.textMuted, fontSize: '0.8rem' }}>
            Are you sure you want to stop this drive test session? Stopping the session will pack your {recordedPoints.length} coordinate records and generate an analytical report.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setModalOpen(null)} sx={{ color: COLORS.textWhite }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmStopRecording} sx={{ borderRadius: '10px' }}>Stop & Save</Button>
        </DialogActions>
      </Dialog>

      {/* Modal 3: Session Completed Success Modal */}
      <Dialog
        open={modalOpen === 'completed'}
        onClose={() => setModalOpen(null)}
        PaperProps={{ sx: { bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '24px', p: 1, textAlign: 'center' } }}
      >
        <DialogContent>
          <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(18, 214, 160, 0.12)', display: 'grid', placeItems: 'center', mx: 'auto', mb: 2, border: `1px solid ${COLORS.successGreen}44` }}>
            <CheckCircleIcon sx={{ color: COLORS.successGreen, fontSize: 36 }} />
          </Box>
          <Typography variant="h6" sx={{ color: COLORS.textWhite, fontWeight: 800, mb: 1 }}>Session Recorded!</Typography>
          <Typography sx={{ color: COLORS.textMuted, fontSize: '0.78rem', mb: 3 }}>
            Drive test logs successfully packed and processed. Average RSRP is {sessions[0]?.avgRsrp} dBm.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            variant="contained"
            onClick={() => {
              setModalOpen(null);
              // Open session report screen
              pushScreen('session-report', { session: sessions[0] });
            }}
            sx={{ bgcolor: COLORS.accentBlue, color: COLORS.textWhite, px: 3, borderRadius: '12px' }}
          >
            View Analytics Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal 4: Server picker selector */}
      <Dialog
        open={modalOpen === 'server-picker'}
        onClose={() => setModalOpen(null)}
        PaperProps={{ sx: { bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '24px' } }}
      >
        <DialogTitle sx={{ color: COLORS.textWhite, fontWeight: 800 }}>Choose Test Node Server</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <List>
            {[
              'Freetown - Orange Cache',
              'Freetown - Africell Core',
              'London - AWS Gateway',
              'Paris - Orange Central Server'
            ].map(srv => (
              <ListItem
                key={srv}
                button
                onClick={() => {
                  setSpeedServer(srv);
                  setModalOpen(null);
                  setToastMessage(`Switched server node to ${srv}`);
                }}
                sx={{ py: 1.5, color: COLORS.textWhite, borderBottom: `1px solid ${COLORS.border}` }}
              >
                <ListItemText primary={srv} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Reset confirm */}
      <Dialog
        open={modalOpen === 'reset-confirm'}
        onClose={() => setModalOpen(null)}
        PaperProps={{ sx: { bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '24px' } }}
      >
        <DialogTitle sx={{ color: COLORS.textWhite, fontWeight: 800 }}>Reset Database</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: COLORS.textMuted, fontSize: '0.8rem' }}>
            Are you sure you want to reset all data records? This will clear all historical logs and restore mock samples. This action is irreversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(null)} sx={{ color: COLORS.textWhite }}>Cancel</Button>
          <Button
            onClick={() => {
              setSessions(MOCK_HISTORY_SESSIONS);
              setModalOpen(null);
              setToastMessage('Database restored to default.');
            }}
            color="error"
          >
            Clear Data
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal 6: Map layer filters sheet */}
      <Dialog
        open={modalOpen === 'filter-sheet'}
        onClose={() => setModalOpen(null)}
        PaperProps={{ sx: { bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '24px', position: 'absolute', bottom: 12, left: 12, right: 12, width: 'calc(100% - 24px)', m: 0 } }}
      >
        <DialogTitle sx={{ color: COLORS.textWhite, fontWeight: 800, fontSize: '0.9rem', pb: 1 }}>Map Layer Overlays</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ py: 1 }}>
            {[
              { style: 'dark', label: 'Dark Mode Street' },
              { style: 'streets', label: 'Detailed Street Grid' },
              { style: 'satellite', label: 'Satellite View' }
            ].map(styleOpt => (
              <Button
                key={styleOpt.style}
                variant={mapStyle === styleOpt.style ? 'contained' : 'outlined'}
                onClick={() => {
                  setMapStyle(styleOpt.style);
                  setModalOpen(null);
                }}
                sx={{
                  justifyContent: 'flex-start',
                  py: 1,
                  borderRadius: '12px',
                  bgcolor: mapStyle === styleOpt.style ? COLORS.accentBlue : 'transparent',
                  color: COLORS.textWhite,
                  borderColor: COLORS.border
                }}
              >
                {styleOpt.label}
              </Button>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Modal 7: Permission status guidance modal */}
      <Dialog
        open={modalOpen === 'permission'}
        onClose={() => setModalOpen(null)}
        PaperProps={{ sx: { bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '24px' } }}
      >
        <DialogTitle sx={{ color: COLORS.textWhite, fontWeight: 800 }}>Cell Permissions Guide</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: COLORS.textMuted, fontSize: '0.8rem', mb: 2 }}>
            To inspect serving cell IDs and neighboring signals on Android and iOS:
          </Typography>
          <Stack spacing={1.5}>
            <Alert severity="info" sx={{ py: 0.5, px: 2, fontSize: '0.72rem' }}>
              <strong>Android:</strong> Requires ACCESS_FINE_LOCATION and READ_PHONE_STATE permissions. Enable Developer Mode to access high-frequency cell telemetry.
            </Alert>
            <Alert severity="info" sx={{ py: 0.5, px: 2, fontSize: '0.72rem' }}>
              <strong>iOS (Apple):</strong> Cell tower IDs are restricted. Path visualization relies on CoreLocation GPS coordinate tracks and network diagnostics.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(null)} sx={{ color: COLORS.textWhite }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Modal 8: Neighbor cell detail dialog */}
      <Dialog
        open={modalOpen === 'neighbor-detail'}
        onClose={() => setModalOpen(null)}
        PaperProps={{ sx: { bgcolor: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: '24px' } }}
      >
        <DialogTitle sx={{ color: COLORS.textWhite, fontWeight: 800 }}>Neighbor Cell PCI {modalParams.pci}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ py: 1 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>EARFCN Channel:</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: COLORS.textWhite, fontWeight: 600 }}>{modalParams.earfcn}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>Reported RSRP:</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: COLORS.successGreen, fontWeight: 700 }}>{modalParams.rsrp} dBm</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>Azimuth Angle:</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: COLORS.textWhite, fontWeight: 600 }}>120° (Sector B)</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(null)} sx={{ color: COLORS.textWhite }}>Dismiss</Button>
        </DialogActions>
      </Dialog>

      {/* SnackBar Toasts notifications */}
      <Snackbar
        open={!!toastMessage}
        autoHideDuration={2500}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        message={toastMessage}
        sx={{
          zIndex: 3000,
          '& .MuiSnackbarContent-root': {
            bgcolor: COLORS.bgElevated,
            color: COLORS.textWhite,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '12px',
            fontSize: '0.78rem',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }
        }}
      />
    </MobileShellWrapper>
  );
}

// Phone Chassis wrapper for desktop viewports
function MobileShellWrapper({ children }) {
  const isDesktop = useMediaQuery('(min-width:600px)');

  if (!isDesktop) {
    return (
      <Box sx={{
        width: '100vw',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: COLORS.bgPrimary,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {children}
      </Box>
    );
  }

  return (
    <Box sx={{
      display: 'grid',
      placeItems: 'center',
      minHeight: '100vh',
      bgcolor: '#040814',
      py: 3,
      userSelect: 'none'
    }}>
      <Box sx={{
        position: 'relative',
        width: 390,
        height: 844,
        borderRadius: '46px',
        border: '12px solid #1D2740',
        bgcolor: COLORS.bgPrimary,
        boxShadow: '0 28px 60px rgba(0, 0, 0, 0.75), inset 0 0 12px rgba(255,255,255,0.06)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Simulated Camera lens */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 110,
          height: 26,
          bgcolor: '#1D2740',
          borderBottomLeftRadius: '16px',
          borderBottomRightRadius: '16px',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#090d16', ml: -3 }} />
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#111827', ml: 1.5 }} />
        </Box>

        {/* Home Bottom indicator line */}
        <Box sx={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 120,
          height: 4,
          bgcolor: 'rgba(255,255,255,0.25)',
          borderRadius: 999,
          zIndex: 1100,
          pointerEvents: 'none'
        }} />

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
