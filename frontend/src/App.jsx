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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={<Protected><Layout /></Protected>}
      >
        <Route index element={<Dashboard />} />
        <Route path="comparison" element={<KpiComparison />} />
        <Route path="compliance" element={<Compliance />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="map" element={<CoverageMap />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="ingestion" element={<Ingestion />} />
        <Route path="operators" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN']}><Operators /></RoleGuard>} />
        <Route path="assistant" element={<AiAssistant />} />
        <Route path="counters" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN','REGULATOR_ANALYST']}><CounterDictionary /></RoleGuard>} />
        <Route path="kpis" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN']}><KpiBuilder /></RoleGuard>} />
        <Route path="analytics" element={<KpiAnalytics />} />
        <Route path="reports" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN','REGULATOR_ANALYST']}><Reports /></RoleGuard>} />
        <Route path="drive-test" element={<DriveTest />} />
        <Route path="drive-test-analytics" element={<DriveTestAnalytics />} />
        <Route path="drive-test-config" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN','DRIVE_TEST_USER']}><DriveTestConfig /></RoleGuard>} />
        <Route path="users" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN']}><Users /></RoleGuard>} />
        <Route path="settings" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN']}><Settings /></RoleGuard>} />
        <Route path="thresholds" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN']}><Thresholds /></RoleGuard>} />
        <Route path="licenses" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN']}><Licenses /></RoleGuard>} />
        <Route path="scheduled-reports" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN']}><ScheduledReports /></RoleGuard>} />
        <Route path="data-quality" element={<DataQuality />} />
        <Route path="anomalies" element={<Anomalies />} />
        <Route path="audit-log" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN']}><AuditLog /></RoleGuard>} />
        <Route path="compliance-notices" element={<RoleGuard roles={['SYSTEM_ADMIN','REGULATOR_ADMIN']}><ComplianceNotices /></RoleGuard>} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
