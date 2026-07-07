import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Box, Drawer, Toolbar, Typography, List, ListItemButton, ListItemIcon,
  ListItemText, IconButton, Avatar, Chip, Divider, Tooltip, Stack, useMediaQuery, useTheme,
  Collapse,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import VerifiedIcon from '@mui/icons-material/Verified';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MapIcon from '@mui/icons-material/Map';
import CellTowerIcon from '@mui/icons-material/CellTower';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import BusinessIcon from '@mui/icons-material/Business';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ListAltIcon from '@mui/icons-material/ListAlt';
import FunctionsIcon from '@mui/icons-material/Functions';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import RouteIcon from '@mui/icons-material/Route';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import TuneIcon from '@mui/icons-material/Tune';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HistoryIcon from '@mui/icons-material/History';
import RadarIcon from '@mui/icons-material/Radar';
import GavelIcon from '@mui/icons-material/Gavel';
import SecurityIcon from '@mui/icons-material/Security';
import BalanceIcon from '@mui/icons-material/Balance';
import HomeIcon from '@mui/icons-material/Home';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CampaignIcon from '@mui/icons-material/Campaign';
import ApiIcon from '@mui/icons-material/Api';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MultilineChartIcon from '@mui/icons-material/MultilineChart';
import LanIcon from '@mui/icons-material/Lan';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CellWifiIcon from '@mui/icons-material/CellWifi';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import FeedIcon from '@mui/icons-material/Feed';
import FactCheckIcon2 from '@mui/icons-material/RuleFolder';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import TimelineIcon from '@mui/icons-material/Timeline';
import { useAuth } from '../auth/AuthContext';
import { useColorMode } from '../theme/ColorMode';
import NotificationsBell from './NotificationsBell';

const FULL = 248;
const MINI = 64;

// roles: user must have one of these roles
// permissions: user must have one of these permission keys (from role defaults or custom grants)
// Omit both to allow any authenticated user.
const ALL_STAFF = ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST'];

// section: renders a small non-clickable group label to separate blocks.
// group: collapsible parent with children. Otherwise a flat link.
const NAV = [
  // ── Operator-user workspace ──
  { to: '/',                  label: 'My Overview',    icon: <HomeIcon />,               roles: ['OPERATOR_USER'] },
  { to: '/submission-cycles', label: 'My Submissions', icon: <AssignmentTurnedInIcon />, roles: ['OPERATOR_USER'] },
  { to: '/operator-disputes', label: 'My Disputes',    icon: <BalanceIcon />,            roles: ['OPERATOR_USER'] },

  // ── Regulator workspace ──
  { section: 'Dashboard & Analytics' },
  { to: '/', label: 'National Dashboard', icon: <DashboardIcon />, roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST', 'DRIVE_TEST_USER'] },
  {
    group: 'performance', label: 'KPI & Monitoring', icon: <AnalyticsIcon />,
    children: [
      { to: '/analytics', label: 'KPI Analytics', icon: <AnalyticsIcon /> },
      { to: '/pm-kpis', label: 'KPI Health Matrix', icon: <MultilineChartIcon /> },
      { to: '/predictive', label: 'Predictive Analytics', icon: <TrendingUpIcon />, roles: ALL_STAFF, permissions: ['compliance:read'] },
      { to: '/realtime', label: 'Live Monitor', icon: <WifiTetheringIcon /> },
      { to: '/noc', label: 'NOC Monitoring', icon: <RadarIcon /> },
      { to: '/anomalies', label: 'Anomaly Detection', icon: <RadarIcon /> },
    ],
  },

  { section: 'Compliance & Enforcement' },
  {
    group: 'compliance', label: 'Compliance & Obligations', icon: <VerifiedIcon />,
    children: [
      { to: '/compliance', label: 'Compliance Matrix', icon: <VerifiedIcon /> },
      { to: '/sla-dashboard', label: 'SLA Dashboard', icon: <FactCheckIcon2 />, roles: ALL_STAFF, permissions: ['compliance:read'] },
      { to: '/compliance-notices', label: 'Compliance Notices', icon: <GavelIcon />, roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN'], permissions: ['compliance:read', 'compliance:write'] },
      { to: '/enforcement', label: 'Enforcement Cases', icon: <SecurityIcon />, roles: ALL_STAFF, permissions: ['compliance:read'] },
      { to: '/operator-disputes', label: 'Disputes', icon: <BalanceIcon />, roles: ALL_STAFF, permissions: ['compliance:read'] },
      { to: '/submission-cycles', label: 'Submission Cycles', icon: <AssignmentTurnedInIcon />, roles: ALL_STAFF, permissions: ['compliance:read'] },
      { to: '/obligations', label: 'License Obligations', icon: <FactCheckIcon />, roles: ALL_STAFF, permissions: ['compliance:read'] },
      { to: '/penalties', label: 'Penalties & Fines', icon: <AccountBalanceIcon />, roles: ALL_STAFF, permissions: ['compliance:read'] },
    ],
  },

  { section: 'Operators & Complaints' },
  {
    group: 'operators', label: 'Operators & QoE', icon: <BusinessIcon />,
    children: [
      { to: '/operators', label: 'Operators List', icon: <BusinessIcon />, roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN'], permissions: ['operators:read', 'operators:write'] },
      { to: '/ranking', label: 'Operator Ranking', icon: <EmojiEventsIcon /> },
      { to: '/consumer-qoe', label: 'Consumer QoE', icon: <SentimentVeryDissatisfiedIcon /> },
      { to: '/complaints', label: 'Complaint Portal', icon: <ReportProblemIcon /> },
      { to: '/complaint-analytics', label: 'Complaint Analytics', icon: <TimelineIcon /> },
    ],
  },

  { section: 'Network & Testing' },
  {
    group: 'network', label: 'Network & Coverage', icon: <CellTowerIcon />,
    children: [
      { to: '/map', label: 'Coverage Map', icon: <MapIcon /> },
      { to: '/inventory', label: 'Network Inventory', icon: <CellTowerIcon /> },
      { to: '/spectrum', label: 'Spectrum Management', icon: <CellWifiIcon />, roles: ALL_STAFF, permissions: ['compliance:read'] },
      { to: '/counters', label: 'Counter Dictionary', icon: <ListAltIcon />, roles: ALL_STAFF, permissions: ['kpi:read', 'kpi:write'] },
      { to: '/fiber', label: 'Fiber Monitoring', icon: <LanIcon /> },
    ],
  },
  {
    group: 'drive-test', label: 'Drive Testing', icon: <RouteIcon />,
    children: [
      { to: '/drive-test', label: 'Drive Tests', icon: <RouteIcon /> },
      { to: '/drive-test-campaigns', label: 'Campaigns', icon: <CampaignIcon />, roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'REGULATOR_ANALYST', 'DRIVE_TEST_USER'] },
      { to: '/field', label: 'Field App', icon: <PhoneAndroidIcon />, roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'DRIVE_TEST_USER'] },
      { to: '/drive-test-analytics', label: 'DT Analytics', icon: <QueryStatsIcon /> },
      { to: '/drive-test-config', label: 'DT Config', icon: <SettingsIcon />, roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN', 'DRIVE_TEST_USER'] },
    ],
  },

  { section: 'System & Admin' },
  {
    group: 'reports', label: 'Reports Management', icon: <AssessmentIcon />,
    children: [
      { to: '/reports', label: 'Reports', icon: <AssessmentIcon />, roles: ALL_STAFF, permissions: ['reports:read'] },
      { to: '/report-templates', label: 'Report Templates', icon: <FeedIcon />, roles: ALL_STAFF, permissions: ['reports:read'] },
      { to: '/scheduled-reports', label: 'Scheduled Reports', icon: <ScheduleIcon />, roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN'], permissions: ['reports:read'] },
    ],
  },
  {
    group: 'data', label: 'Data & Integration', icon: <UploadFileIcon />,
    children: [
      { to: '/ingestion', label: 'Data Ingestion', icon: <UploadFileIcon />, permissions: ['ingestion:write'], roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN'] },
      { to: '/data-quality', label: 'Data Quality', icon: <VerifiedUserIcon /> },
      { to: '/api-gateway', label: 'API Gateway', icon: <ApiIcon /> },
    ],
  },
  { to: '/assistant', label: 'AI Assistant', icon: <SmartToyIcon />, permissions: ['ai:read'] },
  {
    group: 'kpi-config', label: 'KPI Configuration', icon: <FunctionsIcon />,
    children: [
      { to: '/kpis', label: 'KPI Builder', icon: <FunctionsIcon />, roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN'], permissions: ['kpi:write'] },
      { to: '/thresholds', label: 'KPI Thresholds', icon: <TuneIcon />, roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN'], permissions: ['compliance:write'] },
    ],
  },
  {
    group: 'admin', label: 'System Admin', icon: <SettingsIcon />,
    children: [
      { to: '/users', label: 'User Management', icon: <PeopleIcon />, roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN'], permissions: ['users:write'] },
      { to: '/settings', label: 'General Settings', icon: <SettingsIcon />, roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN'] },
      { to: '/licenses', label: 'License Management', icon: <CardMembershipIcon />, roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN'] },
      { to: '/audit-log', label: 'Audit Log', icon: <HistoryIcon />, roles: ['SYSTEM_ADMIN', 'REGULATOR_ADMIN'] },
    ],
  },
];

function canAccess(item, user) {
  if (!item.roles?.length && !item.permissions?.length) return true;
  const hasRole = item.roles?.includes(user?.role) ?? false;
  const hasPerm = item.permissions?.some((p) => user?.permissions?.includes(p)) ?? false;
  return hasRole || hasPerm;
}

// Build the role-filtered nav, dropping section headers that have no visible
// entry before the next section (avoids orphan labels for limited roles).
function buildVisibleNav(user) {
  const visible = [];
  for (const item of NAV) {
    if (item.section) { visible.push(item); continue; }
    if (item.group) {
      const children = item.children.filter((c) => canAccess(c, user));
      if (children.length) visible.push({ ...item, children });
      continue;
    }
    if (canAccess(item, user)) visible.push(item);
  }
  return visible.filter((item, i) => {
    if (!item.section) return true;
    const rest = visible.slice(i + 1);
    const nextItem = rest.findIndex((x) => !x.section);
    const nextSection = rest.findIndex((x) => x.section);
    if (nextItem === -1) return false;
    if (nextSection !== -1 && nextSection < nextItem) return false;
    return true;
  });
}

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
        {now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        {' '}
        {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </Typography>
    </Stack>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { mode, toggle } = useColorMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState({});

  useEffect(() => { setOpen(!isMobile); }, [isMobile]);

  const width = isMobile ? 0 : (open ? FULL : MINI);
  const drawerWidth = open ? FULL : MINI;

  const renderDrawer = (expanded) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ gap: 1, justifyContent: expanded ? 'flex-start' : 'center', minHeight: '64px !important' }}>
        <CellTowerIcon color="primary" />
        {expanded && (
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" lineHeight={1}>TNIP-R</Typography>
            <Typography variant="caption" color="text.secondary">Regulatory Intelligence</Typography>
          </Box>
        )}
        {!isMobile && (
          <IconButton size="small" onClick={() => setOpen(!open)} sx={{ ml: expanded ? 0 : -0.5 }}>
            {expanded ? <ChevronLeftIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, py: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {buildVisibleNav(user).map((item) => {
          if (item.section) {
            return expanded ? (
              <Typography key={`sec-${item.section}`} variant="overline"
                sx={{ display: 'block', px: 3, pt: 2, pb: 0.5, color: 'text.disabled' }}>
                {item.section}
              </Typography>
            ) : (
              <Divider key={`sec-${item.section}`} sx={{ my: 1, mx: 1.5 }} />
            );
          }
          if (item.group) {
            const isGroupActive = item.children.some((c) => location.pathname === c.to);
            const isOpen = groupOpen[item.group] ?? isGroupActive;
            return (
              <Box key={item.group}>
                <Tooltip title={expanded ? '' : item.label} placement="right" arrow>
                  <ListItemButton
                    onClick={() => {
                      if (expanded) {
                        setGroupOpen((prev) => ({ ...prev, [item.group]: !isOpen }));
                      } else {
                        navigate(item.children[0].to);
                        if (isMobile) setMobileOpen(false);
                      }
                    }}
                    sx={{
                      mx: expanded ? 1 : 0.5, borderRadius: 2, mb: 0.5,
                      px: expanded ? 2 : 1.5, justifyContent: expanded ? 'initial' : 'center',
                      ...(isGroupActive && !expanded && {
                        bgcolor: 'action.selected',
                        '&:hover': { bgcolor: 'action.selected' },
                      }),
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: expanded ? 40 : 'auto', color: isGroupActive ? 'primary.main' : 'inherit', justifyContent: 'center' }}>
                      {item.icon}
                    </ListItemIcon>
                    {expanded && <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: isGroupActive ? 600 : 400 }} />}
                    {expanded && (isOpen ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />)}
                  </ListItemButton>
                </Tooltip>
                {expanded && (
                  <Collapse in={isOpen} timeout="auto" unmountOnExit>
                    <List disablePadding>
                      {item.children.map((child) => {
                        const childActive = location.pathname === child.to;
                        return (
                          <ListItemButton
                            key={child.to}
                            selected={childActive}
                            onClick={() => { navigate(child.to); if (isMobile) setMobileOpen(false); }}
                            sx={{ pl: 4, mx: 1, borderRadius: 2, mb: 0.5, py: 0.5 }}
                          >
                            <ListItemIcon sx={{ minWidth: 32, color: childActive ? 'primary.main' : 'inherit' }}>
                              {child.icon}
                            </ListItemIcon>
                            <ListItemText primary={child.label} primaryTypographyProps={{ fontSize: 13 }} />
                          </ListItemButton>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </Box>
            );
          }
          const active = location.pathname === item.to;
          return (
            <Tooltip key={item.to} title={expanded ? '' : item.label} placement="right" arrow>
              <ListItemButton
                selected={active}
                onClick={() => { navigate(item.to); if (isMobile) setMobileOpen(false); }}
                sx={{ mx: expanded ? 1 : 0.5, borderRadius: 2, mb: 0.5, px: expanded ? 2 : 1.5, justifyContent: expanded ? 'initial' : 'center' }}
              >
                <ListItemIcon sx={{ minWidth: expanded ? 40 : 'auto', color: active ? 'primary.main' : 'inherit', justifyContent: 'center' }}>
                  {item.icon}
                </ListItemIcon>
                {expanded && <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14 }} />}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>
      <Divider />
      <Box sx={{ p: expanded ? 2 : 1, display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: expanded ? 'flex-start' : 'center' }}>
        <Tooltip title="My Profile">
          <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, cursor: 'pointer' }}
            onClick={() => { navigate('/profile'); if (isMobile) setMobileOpen(false); }}>
            {(user?.fullName || user?.email || '?')[0].toUpperCase()}
          </Avatar>
        </Tooltip>
        {expanded && (
          <Box sx={{ flex: 1, overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => { navigate('/profile'); if (isMobile) setMobileOpen(false); }}>
            <Typography variant="body2" noWrap>{user?.fullName || user?.email}</Typography>
            <Chip size="small" label={user?.role} sx={{ height: 18, fontSize: 10 }} />
          </Box>
        )}
        <Tooltip title="Log out">
          <IconButton onClick={logout} size="small"><LogoutIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  const current = NAV.reduce((found, n) => {
    if (found) return found;
    if (n.to === location.pathname) return n;
    if (n.children) return n.children.find((c) => c.to === location.pathname);
    return null;
  }, null);

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" elevation={0}
        sx={{
          width: { xs: '100%', md: `calc(100% - ${width}px)` },
          ml: { xs: 0, md: `${width}px` },
          bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider',
          transition: 'width 225ms, margin 225ms',
        }}>
        <Toolbar>
          {isMobile && (
            <IconButton onClick={() => setMobileOpen(true)} sx={{ mr: 1, color: 'text.primary' }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" color="text.primary" noWrap>{current?.label || 'TNIP-R'}</Typography>
          <Box sx={{ flex: 1 }} />

          {/* User + clock */}
          <Stack direction="row" spacing={2} alignItems="center" mr={2}>
            {!isMobile && <LiveClock />}
            {!isMobile && <Divider orientation="vertical" flexItem />}
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28, fontSize: 13 }}>
                {(user?.fullName || user?.email || '?')[0].toUpperCase()}
              </Avatar>
              {!isMobile && (
                <Box>
                  <Typography variant="body2" color="text.primary" lineHeight={1.2} noWrap>
                    {user?.fullName || user?.email}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" lineHeight={1}>
                    {user?.role?.replace(/_/g, ' ')}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Stack>

          <NotificationsBell />
          <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton onClick={toggle} color="inherit" sx={{ mr: 1, color: 'text.primary' }}>
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: FULL, bgcolor: 'background.paper' } }}>
          {renderDrawer(true)}
        </Drawer>
      )}

      {/* Desktop drawer */}
      {!isMobile && (
        <Drawer variant="permanent"
          sx={{
            width, flexShrink: 0, transition: 'width 225ms',
            '& .MuiDrawer-paper': {
              width: drawerWidth, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider',
              overflowX: 'hidden', transition: 'width 225ms',
            },
          }}>
          {renderDrawer(open)}
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 1.5, md: 3 }, mt: 8, minHeight: '100vh', transition: 'margin 225ms' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
