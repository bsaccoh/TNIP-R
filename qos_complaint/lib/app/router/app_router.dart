import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/models/app_models.dart';
import '../../features/splash/splash_screen.dart';
import '../../features/main_scaffold.dart';
import '../../features/report/report_step1_screen.dart';
import '../../features/report/report_step2_screen.dart';
import '../../features/report/report_step3_screen.dart';
import '../../features/complaints/complaint_details_screen.dart';
import '../../features/status/network_status_screen.dart';
import '../../features/notifications/notifications_screen.dart';
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
  ],
);
