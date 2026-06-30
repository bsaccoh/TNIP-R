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
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useAuth } from '../auth/AuthContext';
import { useColorMode } from '../theme/ColorMode';
import NotificationsBell from './NotificationsBell';

const FULL = 248;
const MINI = 64;
const NAV = [
  { to: '/', label: 'National Dashboard', icon: <DashboardIcon /> },
  { to: '/comparison', label: 'KPI Comparison', icon: <CompareArrowsIcon /> },
  { to: '/analytics', label: 'KPI Analytics', icon: <AnalyticsIcon /> },
  {
    group: 'compliance', label: 'Compliance', icon: <VerifiedIcon />,
    children: [
      { to: '/compliance', label: 'Compliance', icon: <VerifiedIcon /> },
      { to: '/compliance-notices', label: 'Compliance Notices', icon: <GavelIcon /> },
    ],
  },
  {
    group: 'operators', label: 'Operators', icon: <BusinessIcon />,
    children: [
      { to: '/operators', label: 'Operators', icon: <BusinessIcon /> },
      { to: '/ranking', label: 'Operator Ranking', icon: <EmojiEventsIcon /> },
    ],
  },
  { to: '/map', label: 'Coverage Map', icon: <MapIcon /> },
  {
    group: 'network-data', label: 'Network & Data', icon: <CellTowerIcon />,
    children: [
      { to: '/inventory', label: 'Network Inventory', icon: <CellTowerIcon /> },
      { to: '/counters', label: 'Counter Dictionary', icon: <ListAltIcon /> },
    ],
  },
  {
    group: 'data-mgmt', label: 'Data Management', icon: <UploadFileIcon />,
    children: [
      { to: '/ingestion', label: 'Data Ingestion', icon: <UploadFileIcon /> },
      { to: '/data-quality', label: 'Data Quality', icon: <VerifiedUserIcon /> },
    ],
  },
  {
    group: 'reports', label: 'Reports', icon: <AssessmentIcon />,
    children: [
      { to: '/reports', label: 'Reports', icon: <AssessmentIcon /> },
      { to: '/scheduled-reports', label: 'Scheduled Reports', icon: <ScheduleIcon /> },
    ],
  },
  {
    group: 'drive-test', label: 'Drive Testing', icon: <RouteIcon />,
    children: [
      { to: '/drive-test', label: 'Drive Tests', icon: <RouteIcon /> },
      { to: '/drive-test-analytics', label: 'DT Analytics', icon: <QueryStatsIcon /> },
      { to: '/drive-test-config', label: 'DT Config', icon: <SettingsIcon /> },
    ],
  },
  {
    group: 'kpi-config', label: 'KPI Configuration', icon: <FunctionsIcon />, adminOnly: true,
    children: [
      { to: '/kpis', label: 'KPI Builder', icon: <FunctionsIcon /> },
      { to: '/thresholds', label: 'KPI Thresholds', icon: <TuneIcon /> },
    ],
  },
  { to: '/anomalies', label: 'Anomaly Detection', icon: <RadarIcon /> },
  { to: '/assistant', label: 'AI Assistant', icon: <SmartToyIcon /> },
  { to: '/users', label: 'User Management', icon: <PeopleIcon />, adminOnly: true },
  {
    group: 'settings', label: 'Settings', icon: <SettingsIcon />, adminOnly: true,
    children: [
      { to: '/settings', label: 'General Settings', icon: <SettingsIcon /> },
      { to: '/licenses', label: 'License Management', icon: <CardMembershipIcon /> },
      { to: '/audit-log', label: 'Audit Log', icon: <HistoryIcon /> },
    ],
  },
];

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
        {NAV.filter((item) => !item.adminOnly || ['SYSTEM_ADMIN', 'REGULATOR_ADMIN'].includes(user?.role)).map((item) => {
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
          {!isMobile && <Chip label="National Regulator" color="primary" variant="outlined" size="small" />}
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
