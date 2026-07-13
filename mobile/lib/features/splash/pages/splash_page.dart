import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> with SingleTickerProviderStateMixin {
  late AnimationController _waveController;

  @override
  void initState() {
    super.initState();
    _waveController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();

    // Redirect to Login page after 3 seconds
    Timer(const Duration(seconds: 3), () {
      if (mounted) {
        context.go('/login');
      }
    });
  }

  @override
  void dispose() {
    _waveController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // 1. Base Dark Navy Gradient Background
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFF1A237E), // Deep navy
                    Color(0xFF0D47A1), // Darker blue
                  ],
                ),
              ),
            ),
          ),

          // 2. Bottom Animated Wave Shapes in Sierra Leone colors
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: MediaQuery.of(context).size.height * 0.35,
            child: AnimatedBuilder(
              animation: _waveController,
              builder: (context, child) {
                return CustomPaint(
                  painter: _SplashWavesPainter(progress: _waveController.value),
                );
              },
            ),
          ),

          // 3. Central centered content
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(height: 40),
                    const Icon(
                      Icons.cell_tower_outlined,
                      size: 80,
                      color: Colors.white,
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      "NatCA",
                      style: AppTextStyles.splashTitle,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      "Quality Of Service Monitoring System",
                      textAlign: TextAlign.center,
                      style: AppTextStyles.splashSubtitle,
                    ),
                    const SizedBox(height: 24),
                    Container(
                      width: 60,
                      height: 1,
                      color: Colors.white30,
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      "Monitor. Analyze. Regulate.",
                      style: AppTextStyles.splashTagline,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      "Ensuring Quality Connectivity\nfor a Better Sierra Leone",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.white70,
                      ),
                    ),
                    const SizedBox(height: 48),

                    // Faux Government Crest Emblem
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.12),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white54, width: 1.5),
                      ),
                      alignment: Alignment.center,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.gavel_rounded, color: Color(0xFF66BB6A), size: 18),
                          Text(
                            "SL CREST",
                            style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 80),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SplashWavesPainter extends CustomPainter {
  final double progress;

  _SplashWavesPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final wave1 = Paint()..color = const Color(0xFF1565C0).withOpacity(0.6)..style = PaintingStyle.fill;
    final wave2 = Paint()..color = const Color(0xFF1E88E5).withOpacity(0.5)..style = PaintingStyle.fill;
    final wave3 = Paint()..color = const Color(0xFF4CAF50).withOpacity(0.4)..style = PaintingStyle.fill; // success green front

    final path1 = Path();
    final path2 = Path();
    final path3 = Path();

    // Bottom fill limits
    path1.moveTo(0, size.height);
    path2.moveTo(0, size.height);
    path3.moveTo(0, size.height);

    for (double x = 0; x <= size.width; x++) {
      // Rear wave
      double y1 = size.height * 0.4 + sin((x / size.width * 2 * pi) + (progress * 2 * pi)) * 18;
      path1.lineTo(x, y1);

      // Mid wave
      double y2 = size.height * 0.5 + cos((x / size.width * 2 * pi) - (progress * 2 * pi)) * 14;
      path2.lineTo(x, y2);

      // Front wave
      double y3 = size.height * 0.6 + sin((x / size.width * 2 * pi) + (progress * 2 * pi) + pi) * 20;
      path3.lineTo(x, y3);
    }

    path1.lineTo(size.width, size.height);
    path2.lineTo(size.width, size.height);
    path3.lineTo(size.width, size.height);

    canvas.drawPath(path1, wave1);
    canvas.drawPath(path2, wave2);
    canvas.drawPath(path3, wave3);
  }

  @override
  bool shouldRepaint(covariant _SplashWavesPainter oldDelegate) => true;
}
