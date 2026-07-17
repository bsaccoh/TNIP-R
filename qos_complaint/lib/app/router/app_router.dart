import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/models/app_models.dart';
import '../../features/splash/splash_screen.dart';
import '../../features/main_scaffold.dart';
import '../../features/report/report_step1_screen.dart';
import '../../features/report/report_step2_screen.dart';
import '../../features/report/report_step3_screen.dart';
import '../../features/report/billing_details_screen.dart';
import '../../features/complaints/complaint_details_screen.dart';
import '../../features/status/network_status_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/speed_test/speed_comparison_screen.dart';
import '../../features/dashboard/tariff_comparison_screen.dart';
import '../../features/dashboard/knowledge_base_screen.dart';
import '../../features/dashboard/latest_news_screen.dart';
import '../../features/dashboard/sim_registration_screen.dart';
import '../../features/dashboard/kyc_registration_screen.dart';
import '../../features/dashboard/ussd_shortcuts_screen.dart';
import '../../features/dashboard/chatbot_screen.dart';
import '../../features/speed_test/speed_history_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/register_screen.dart';
import '../../features/auth/otp_verification_screen.dart';
import '../../features/auth/biometric_setup_screen.dart';

final GoRouter appRouter = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/register',
      builder: (context, state) => const RegisterScreen(),
    ),
    GoRoute(
      path: '/otp-verification',
      builder: (context, state) {
        final phone = state.uri.queryParameters['phone'] ?? "";
        return OTPVerificationScreen(phoneNumber: phone);
      },
    ),
    GoRoute(
      path: '/biometric-setup',
      builder: (context, state) => const BiometricSetupScreen(),
    ),
    GoRoute(
      path: '/dashboard',
      builder: (context, state) {
        final tabStr = state.uri.queryParameters['tab'];
        final tab = int.tryParse(tabStr ?? '0') ?? 0;
        return MainScaffold(initialTab: tab);
      },
    ),
    GoRoute(
      path: '/report',
      builder: (context, state) => const ReportStep1Screen(),
    ),
    GoRoute(
      path: '/report/location',
      builder: (context, state) => const ReportStep2Screen(),
    ),
    GoRoute(
      path: '/report/review',
      builder: (context, state) => const ReportStep3Screen(),
    ),
    GoRoute(
      path: '/complaint-details',
      builder: (context, state) {
        final complaint = state.extra as ComplaintItem;
        return ComplaintDetailsScreen(complaint: complaint);
      },
    ),
    GoRoute(
      path: '/network-status',
      builder: (context, state) => const NetworkStatusScreen(),
    ),
    GoRoute(
      path: '/notifications',
      builder: (context, state) => const NotificationsScreen(),
    ),
    GoRoute(
      path: '/speed-comparison',
      builder: (context, state) => const SpeedComparisonScreen(),
    ),
    GoRoute(
      path: '/report/billing-details',
      builder: (context, state) => const BillingDetailsScreen(),
    ),
    GoRoute(
      path: '/tariffs',
      builder: (context, state) => const TariffComparisonScreen(),
    ),
    GoRoute(
      path: '/knowledge-base',
      builder: (context, state) => const KnowledgeBaseScreen(),
    ),
    GoRoute(
      path: '/latest-news',
      builder: (context, state) => const LatestNewsScreen(),
    ),
    GoRoute(
      path: '/sim-check',
      builder: (context, state) => const SimRegistrationScreen(),
    ),
    GoRoute(
      path: '/kyc-registration',
      builder: (context, state) {
        final phone = state.uri.queryParameters['phone'] ?? '';
        final nin = state.uri.queryParameters['nin'] ?? '';
        return KycRegistrationScreen(phoneNumber: phone, nin: nin);
      },
    ),
    GoRoute(
      path: '/ussd',
      builder: (context, state) => const UssdShortcutsScreen(),
    ),
    GoRoute(
      path: '/chatbot',
      builder: (context, state) => const ChatbotScreen(),
    ),

    GoRoute(
      path: '/speed-history',
      builder: (context, state) => const SpeedHistoryScreen(),
    ),
  ],
);
