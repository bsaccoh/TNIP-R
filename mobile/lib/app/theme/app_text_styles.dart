import 'package:flutter/material.dart';

class AppTextStyles {
  AppTextStyles._();

  // Splash Screen Styles (Always white on navy gradient background)
  static const TextStyle splashTitle = TextStyle(
    fontSize: 52,
    fontWeight: FontWeight.w800,
    color: Colors.white,
    letterSpacing: 2.0,
  );

  static const TextStyle splashSubtitle = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w400,
    color: Colors.white70,
    height: 1.4,
  );

  static const TextStyle splashTagline = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w600,
    color: Colors.white,
  );

  // General Screen Styles (Omit hardcoded colors to auto-inherit theme colors)
  static const TextStyle screenTitle = TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w700,
  );

  static const TextStyle welcomeText = TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w400,
  );

  static const TextStyle userName = TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.w700,
  );

  static const TextStyle heroMetric = TextStyle(
    fontSize: 48,
    fontWeight: FontWeight.w800,
    height: 1.1,
  );

  static const TextStyle cardTitle = TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w600,
  );

  static const TextStyle cardValueLarge = TextStyle(
    fontSize: 32,
    fontWeight: FontWeight.w700,
  );

  static const TextStyle cardValueMedium = TextStyle(
    fontSize: 22,
    fontWeight: FontWeight.w700,
  );

  static const TextStyle metricLabel = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w500,
  );

  static const TextStyle badgeText = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w600,
  );

  static const TextStyle bodyText = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
  );

  static const TextStyle caption = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w400,
  );

  static const TextStyle bottomNavLabel = TextStyle(
    fontSize: 10,
    fontWeight: FontWeight.w500,
  );

  static const TextStyle tabLabel = TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w500,
  );

  static const TextStyle sectionLabel = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.bold,
  );

  static const TextStyle largeMetric = TextStyle(
    fontSize: 32,
    fontWeight: FontWeight.bold,
  );

  static const TextStyle unitLabel = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w500,
  );

  static const TextStyle tinyCaption = TextStyle(
    fontSize: 10,
    fontWeight: FontWeight.w400,
  );
}
