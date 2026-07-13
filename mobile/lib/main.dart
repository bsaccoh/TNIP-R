import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/router/app_router.dart';
import 'app/theme/app_theme.dart';

import 'app/theme/app_colors.dart';
import 'app/providers/theme_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: TelecomDriveApp(),
    ),
  );
}

class TelecomDriveApp extends ConsumerWidget {
  const TelecomDriveApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final isDark = themeMode == ThemeMode.dark || 
        (themeMode == ThemeMode.system && 
         MediaQuery.platformBrightnessOf(context) == Brightness.dark);

    if (isDark) {
      AppColors.primaryBackground = const Color(0xFF0A0F1C);
      AppColors.surfaceGray = const Color(0xFF0F172A);
      AppColors.cardWhite = const Color(0xFF11182A);
    } else {
      AppColors.primaryBackground = const Color(0xFFFFFFFF);
      AppColors.surfaceGray = const Color(0xFFF5F7FA);
      AppColors.cardWhite = const Color(0xFFFFFFFF);
    }

    return MaterialApp.router(
      title: 'NatCA Regulator Dashboard',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeMode,
      routerConfig: AppRouter.router,
    );
  }
}
