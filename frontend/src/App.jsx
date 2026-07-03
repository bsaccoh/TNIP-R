import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from './auth/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import KpiComparison from './pages/KpiComparison';
import Compliance from './pages/Compliance';
import Ranking from './pages/Ranking';
import CoverageMap from './pages/CoverageMap';
import Inventory from './pages/Inventory';
import Ingestion from './pages/Ingestion';
import Operators from './pages/Operators';
import AiAssistant from './pages/AiAssistant';
import CounterDictionary from './pages/CounterDictionary';
import KpiBuilder from './pages/KpiBuilder';
import KpiAnalytics from './pages/KpiAnalytics';
import Reports from './pages/Reports';
import DriveTest from './pages/DriveTest';
import DriveTestAnalytics from './pages/DriveTestAnalytics';
import DriveTestConfig from './pages/DriveTestConfig';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Thresholds from './pages/Thresholds';
import Licenses from './pages/Licenses';
import ScheduledReports from './pages/ScheduledReports';
import DataQuality from './pages/DataQuality';
import AuditLog from './pages/AuditLog';
import Anomalies from './pages/Anomalies';
import ComplianceNotices from './pages/ComplianceNotices';
import Enforcement from './pages/Enforcement';
import OperatorPortal from './pages/OperatorPortal';
import Disputes from './pages/Disputes';
import SubmissionCycles from './pages/SubmissionCycles';
import Obligations from './pages/Obligations';
import Penalties from './pages/Penalties';
import DriveTestCampaigns from './pages/DriveTestCampaigns';
import ApiGateway from './pages/ApiGateway';
import RealtimeMonitor from './pages/RealtimeMonitor';
import ConsumerQoE from './pages/ConsumerQoE';
import ReportIssue from './pages/ReportIssue';
import PredictiveAnalytics from './pages/PredictiveAnalytics';
import SpectrumManagement from './pages/SpectrumManagement';
import FieldApp from './pages/FieldApp';
import ReportTemplates from './pages/ReportTemplates';
import SlaDashboard from './pages/SlaDashboard';
import RoleGuard from './components/RoleGuard';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function HomeRedirect() {
  const { user } = useAuth();
  return user?.role === 'OPERATOR_USER' ? <OperatorPortal /> : <Dashboard />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/report" element={<ReportIssue />} />
      <Route path="/field" element={<FieldApp />} />
      <Route
        path="/"
        element={<Protected><Layout /></Protected>}
      >
        <Route index element={<HomeRedirect />} />
        <Route path="comparison" element={<KpiComparison />} />
        <Route path="compliance" element={<Compliance />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="map" element={<CoverageMap />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="ingestion" element={<Ingestion />} />
        <Route path="operators" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN']} permissions={['operators:read','operators:write']}><Operators /></RoleGuard>} />
        <Route path="assistant" element={<RoleGuard permissions={['ai:read']}><AiAssistant /></RoleGuard>} />
        <Route path="counters" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN','REGULATOR_ANALYST']} permissions={['kpi:read']}><CounterDictionary /></RoleGuard>} />
        <Route path="kpis" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN']} permissions={['kpi:write']}><KpiBuilder /></RoleGuard>} />
        <Route path="analytics" element={<KpiAnalytics />} />
        <Route path="reports" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN','REGULATOR_ANALYST']} permissions={['reports:read']}><Reports /></RoleGuard>} />
        <Route path="drive-test" element={<DriveTest />} />
        <Route path="drive-test-campaigns" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN','REGULATOR_ANALYST','DRIVE_TEST_USER']}><DriveTestCampaigns /></RoleGuard>} />
        <Route path="drive-test-analytics" element={<DriveTestAnalytics />} />
        <Route path="drive-test-config" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN','DRIVE_TEST_USER']}><DriveTestConfig /></RoleGuard>} />
        <Route path="users" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN']} permissions={['users:write']}><Users /></RoleGuard>} />
        <Route path="settings" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN']}><Settings /></RoleGuard>} />
        <Route path="thresholds" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN']} permissions={['compliance:write']}><Thresholds /></RoleGuard>} />
        <Route path="licenses" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN']}><Licenses /></RoleGuard>} />
        <Route path="scheduled-reports" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN']} permissions={['reports:read']}><ScheduledReports /></RoleGuard>} />
        <Route path="data-quality" element={<DataQuality />} />
        <Route path="anomalies" element={<Anomalies />} />
        <Route path="audit-log" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN']}><AuditLog /></RoleGuard>} />
        <Route path="compliance-notices" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN']} permissions={['compliance:read']}><ComplianceNotices /></RoleGuard>} />
        <Route path="enforcement" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN','REGULATOR_ANALYST']} permissions={['compliance:read']}><Enforcement /></RoleGuard>} />
        <Route path="operator-portal" element={<OperatorPortal />} />
        <Route path="operator-disputes" element={<Disputes />} />
        <Route path="submission-cycles" element={<SubmissionCycles />} />
        <Route path="obligations" element={<Obligations />} />
        <Route path="penalties" element={<Penalties />} />
        <Route path="api-gateway" element={<ApiGateway />} />
        <Route path="realtime" element={<RealtimeMonitor />} />
        <Route path="consumer-qoe" element={<ConsumerQoE />} />
        <Route path="predictive" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN','REGULATOR_ANALYST']} permissions={['compliance:read']}><PredictiveAnalytics /></RoleGuard>} />
        <Route path="spectrum" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN','REGULATOR_ANALYST']} permissions={['compliance:read']}><SpectrumManagement /></RoleGuard>} />
        <Route path="report-templates" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN','REGULATOR_ANALYST']} permissions={['reports:read']}><ReportTemplates /></RoleGuard>} />
        <Route path="sla-dashboard" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN','REGULATOR_ANALYST']} permissions={['compliance:read']}><SlaDashboard /></RoleGuard>} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AppRoutes />;
}
