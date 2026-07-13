import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_text_styles.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: AppColors.primaryBlue,
      scaffoldBackgroundColor: AppColors.surfaceGray,
      cardColor: AppColors.cardWhite,
      dialogBackgroundColor: AppColors.cardWhite,
      dividerColor: AppColors.borderLight,

      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.cardWhite,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
      ),

      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.cardWhite,
        selectedItemColor: AppColors.primaryBlue,
        unselectedItemColor: AppColors.textMuted,
        selectedLabelStyle: AppTextStyles.bottomNavLabel,
        unselectedLabelStyle: AppTextStyles.bottomNavLabel,
      ),

      textTheme: const TextTheme(
        headlineLarge: AppTextStyles.screenTitle,
        titleLarge: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.bold,
          color: AppColors.textPrimary,
        ),
        bodyLarge: AppTextStyles.bodyText,
        bodySmall: AppTextStyles.caption,
      ),

      inputDecorationTheme: InputDecorationTheme(
        fillColor: AppColors.cardWhite,
        filled: true,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.borderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primaryBlue),
        ),
        labelStyle: const TextStyle(color: AppColors.textSecondary),
        hintStyle: const TextStyle(color: AppColors.textMuted),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: AppColors.accentBlue,
      scaffoldBackgroundColor: const Color(0xFF0A0F1C),
      cardColor: const Color(0xFF11182A),
      dialogBackgroundColor: const Color(0xFF131D31),
      dividerColor: const Color(0xFF1D2740),

      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF11182A),
        foregroundColor: Colors.white,
        elevation: 0,
        iconTheme: IconThemeData(color: Colors.white),
      ),

      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: Color(0xFF11182A),
        selectedItemColor: AppColors.accentBlue,
        unselectedItemColor: Color(0xFF5B6787),
        selectedLabelStyle: AppTextStyles.bottomNavLabel,
        unselectedLabelStyle: AppTextStyles.bottomNavLabel,
      ),

      textTheme: const TextTheme(
        headlineLarge: TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
        titleLarge: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
        bodyLarge: TextStyle(
          fontSize: 14,
          color: Color(0xFF94A3B8),
        ),
        bodySmall: TextStyle(
          fontSize: 11,
          color: Color(0xFF7F8BA8),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        fillColor: const Color(0xFF11182A),
        filled: true,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF1D2740)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF1D2740)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.accentBlue),
        ),
        labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
        hintStyle: const TextStyle(color: Color(0xFF7F8BA8)),
      ),
    );
  }
}
