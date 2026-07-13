import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../shared/widgets/telecom_animated_background.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> with TickerProviderStateMixin {
  late AnimationController _logoController;
  late AnimationController _progressController;
  late Animation<double> _progressAnimation;
  double _opacity = 0.0;
  double _logoScale = 0.8;
  double _taglineOpacity = 0.0;

  @override
  void initState() {
    super.initState();

    // 1. Logo rotation animation
    _logoController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();

    // 2. Loading bar progress animation
    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    );
    _progressAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _progressController, curve: Curves.easeInOut),
    );

    // 3. Staggered Entrance Animations
    Future.delayed(const Duration(milliseconds: 300), () {
      if (!mounted) return;
      setState(() {
        _opacity = 1.0;
        _logoScale = 1.0;
      });
    });

    Future.delayed(const Duration(milliseconds: 900), () {
      if (!mounted) return;
      setState(() {
        _taglineOpacity = 1.0;
      });
    });

    Future.delayed(const Duration(milliseconds: 1200), () {
      if (!mounted) return;
      _progressController.forward();
    });

    // 4. Navigate to Login after 3 seconds
    Timer(const Duration(milliseconds: 3200), () {
      if (mounted) {
        context.go('/login');
      }
    });
  }

  @override
  void dispose() {
    _logoController.dispose();
    _progressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primaryBackground,
      body: Stack(
        children: [
          // Simulated background
          const Positioned.fill(
            child: TelecomAnimatedBackground(
              intensity: "splash",
              showWifiArcs: true,
              showParticles: true,
              showDataStreams: false,
              showGrid: true,
            ),
          ),

          // Central content
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Animated logo container
                AnimatedScale(
                  scale: _logoScale,
                  duration: const Duration(milliseconds: 600),
                  curve: Curves.easeOutBack,
                  child: AnimatedOpacity(
                    opacity: _opacity,
                    duration: const Duration(milliseconds: 500),
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        // Rotating outer thin arc
                        RotationTransition(
                          turns: _logoController,
                          child: Container(
                            width: 100,
                            height: 100,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: AppColors.successGreen.withOpacity(0.8),
                                width: 1.5,
                              ),
                            ),
                          ),
                        ),
                        // Inner ring container
                        Container(
                          width: 84,
                          height: 84,
                          decoration: BoxDecoration(
                            color: AppColors.secondaryBackground,
                            shape: BoxShape.circle,
                            border: Border.all(color: AppColors.primaryAccentBlue, width: 2),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primaryAccentBlue.withOpacity(0.35),
                                blurRadius: 12,
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.cell_tower_rounded,
                            size: 40,
                            color: AppColors.primaryAccentBlue,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // App Name
                AnimatedOpacity(
                  opacity: _opacity,
                  duration: const Duration(milliseconds: 600),
                  child: const Text(
                    "DriveTest Pro",
                    style: TextStyle(
                      fontSize: 36,
                      fontWeight: FontWeight.w900,
                      color: AppColors.textWhite,
                      letterSpacing: 1.5,
                    ),
                  ),
                ),
                const SizedBox(height: 8),

                // Tagline
                AnimatedOpacity(
                  opacity: _taglineOpacity,
                  duration: const Duration(milliseconds: 500),
                  child: const Text(
                    "Telecom Quality Intelligence",
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(height: 60),

                // Horizontal custom progress loader
                AnimatedBuilder(
                  animation: _progressAnimation,
                  builder: (context, child) {
                    return ClipRRect(
                      borderRadius: BorderRadius.circular(99),
                      child: Container(
                        width: 120,
                        height: 2,
                        color: AppColors.border,
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: FractionallySizedBox(
                            widthFactor: _progressAnimation.value,
                            child: Container(
                              decoration: const BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [AppColors.primaryAccentBlue, AppColors.successGreen],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),

          // Bottom Version code
          Positioned(
            bottom: 24,
            left: 0,
            right: 0,
            child: Center(
              child: Text(
                "v2.1.0",
                style: AppTextStyles.tinyCaption.copyWith(fontSize: 11),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
