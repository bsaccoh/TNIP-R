import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../features/splash/pages/splash_page.dart';
import '../../features/auth/pages/login_page.dart';
import '../../features/auth/pages/forgot_password_page.dart';
import '../../features/onboarding/pages/onboarding_page.dart';
import '../../features/dashboard/pages/dashboard_page.dart';
import '../../features/dashboard/pages/network_quality_page.dart';
import '../../features/map/pages/coverage_map_page.dart';
import '../../features/drive_test/pages/drive_test_page.dart';
import '../../features/drive_test/pages/drive_test_history_page.dart';
import '../../features/history/pages/session_report_page.dart';
import '../../features/alerts/pages/alerts_page.dart';
import '../../features/alerts/pages/alert_details_page.dart';
import '../../features/reports/pages/reports_page.dart';
import '../../features/operators/pages/operators_page.dart';
import '../../features/operators/pages/operator_details_page.dart';
import '../../features/sites/pages/sites_page.dart';
import '../../features/sites/pages/site_details_page.dart';
import '../../features/kpi/pages/kpi_page.dart';
import '../../features/kpi/pages/kpi_details_page.dart';
import '../../features/compliance/pages/compliance_page.dart';
import '../../features/complaints/pages/complaints_page.dart';
import '../../features/complaints/pages/complaint_details_page.dart';
import '../../features/regional_analysis/pages/regional_analysis_page.dart';
import '../../features/benchmarking/pages/benchmarking_page.dart';
import '../../features/profile/pages/profile_page.dart';
import '../../features/notifications/pages/notifications_page.dart';
import '../../features/quality_trends/pages/quality_trends_page.dart';
import '../../features/settings/pages/settings_page.dart';
import '../../features/search/pages/search_page.dart';
import '../../features/export/pages/export_center_page.dart';
import '../../features/field_inspection/pages/field_inspection_page.dart';
import '../../features/tests/pages/tests_page.dart';
import '../../features/tests/pages/speed_test_page.dart';
import '../../features/tests/pages/ping_details_page.dart';
import '../../features/tests/pages/web_load_details_page.dart';
import '../../features/tests/pages/video_stream_details_page.dart';

class AppRouter {
  AppRouter._();

  static final GoRouter router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingPage(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordPage(),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const DashboardPage(),
      ),
      GoRoute(
        path: '/network-quality',
        builder: (context, state) => const NetworkQualityPage(),
      ),
      GoRoute(
        path: '/map',
        builder: (context, state) => const CoverageMapPage(),
      ),
      GoRoute(
        path: '/drive-test',
        builder: (context, state) => const DriveTestPage(),
      ),
      GoRoute(
        path: '/drive-test-history',
        builder: (context, state) => const DriveTestHistoryPage(),
      ),
      GoRoute(
        path: '/session-report/:id',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return SessionReportPage(sessionId: id);
        },
      ),
      GoRoute(
        path: '/alerts',
        builder: (context, state) => const AlertsPage(),
      ),
      GoRoute(
        path: '/alert-details/:id',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return AlertDetailsPage(alertId: id);
        },
      ),
      GoRoute(
        path: '/reports',
        builder: (context, state) => const ReportsPage(),
      ),
      GoRoute(
        path: '/kpi',
        builder: (context, state) => const KpiPage(),
      ),
      GoRoute(
        path: '/kpi-details/:metric',
        builder: (context, state) {
          final metric = state.pathParameters['metric'] ?? '';
          return KpiDetailsPage(metric: metric);
        },
      ),
      GoRoute(
        path: '/compliance',
        builder: (context, state) => const CompliancePage(),
      ),
      GoRoute(
        path: '/complaints',
        builder: (context, state) => const ComplaintsPage(),
      ),
      GoRoute(
        path: '/complaints/:id',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return ComplaintDetailsPage(complaintId: id);
        },
      ),
      GoRoute(
        path: '/operators',
        builder: (context, state) => const OperatorsPage(),
      ),
      GoRoute(
        path: '/operators/:id',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return OperatorDetailsPage(operatorId: id);
        },
      ),
      GoRoute(
        path: '/sites',
        builder: (context, state) => const SitesPage(),
      ),
      GoRoute(
        path: '/site-details/:id',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return SiteDetailsPage(siteId: id);
        },
      ),
      GoRoute(
        path: '/regional-analysis',
        builder: (context, state) => const RegionalAnalysisPage(),
      ),
      GoRoute(
        path: '/benchmarking',
        builder: (context, state) => const BenchmarkingPage(),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfilePage(),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsPage(),
      ),
      GoRoute(
        path: '/quality-trends',
        builder: (context, state) => const QualityTrendsPage(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsPage(),
      ),
      GoRoute(
        path: '/search',
        builder: (context, state) => const SearchPage(),
      ),
      GoRoute(
        path: '/export-center',
        builder: (context, state) => const ExportCenterPage(),
      ),
      GoRoute(
        path: '/field-inspection',
        builder: (context, state) => const FieldInspectionPage(),
      ),
      GoRoute(
        path: '/tests',
        builder: (context, state) => const TestsPage(),
      ),
      GoRoute(
        path: '/tests/speed',
        builder: (context, state) => const SpeedTestPage(),
      ),
      GoRoute(
        path: '/tests/ping',
        builder: (context, state) => const PingDetailsPage(),
      ),
      GoRoute(
        path: '/tests/webload',
        builder: (context, state) => const WebLoadDetailsPage(),
      ),
      GoRoute(
        path: '/tests/video',
        builder: (context, state) => const VideoStreamDetailsPage(),
      ),
    ],
  );
}
