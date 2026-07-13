import 'dart:math';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _waveController;

  @override
  void initState() {
    super.initState();
    _waveController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
  }

  @override
  void dispose() {
    _waveController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFF1A3C8F),
              Color(0xFF0D2560),
            ],
          ),
        ),
        child: Stack(
          children: [
            // Cityscape Background Layer (At the bottom)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: SizedBox(
                height: 180,
                width: double.infinity,
                child: CustomPaint(
                  painter: _CityscapePainter(),
                ),
              ),
            ),
            
            // Main content column
            SafeArea(
              child: Column(
                children: [
                  const SizedBox(height: 40),
                  // Signal Tower Graphic
                  Expanded(
                    child: Center(
                      child: AnimatedBuilder(
                        animation: _waveController,
                        builder: (context, child) {
                          return CustomPaint(
                            size: const Size(200, 220),
                            painter: _SignalTowerPainter(progress: _waveController.value),
                          );
                        },
                      ),
                    ),
                  ),

                  // Branding Texts
                  RichText(
                    text: TextSpan(
                      children: [
                        TextSpan(
                          text: "NatCA",
                          style: AppTextStyles.h2.copyWith(
                            color: Colors.white,
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        TextSpan(
                          text: "QoS Complaint",
                          style: AppTextStyles.h2.copyWith(
                            color: AppColors.accentGreen,
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Your Voice for Better Network Quality",
                    style: AppTextStyles.body.copyWith(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Feature Icons Row
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _featureItem(Icons.signal_cellular_off_rounded, "Report Bad\nNetwork"),
                        _featureItem(Icons.assignment_outlined, "Track Your\nComplaints"),
                        _featureItem(Icons.map_outlined, "Improve\nCoverage"),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),

                  // Bottom white card containing CTA Button
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(24),
                        topRight: Radius.circular(24),
                      ),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          "Join us in making our network better for everyone.",
                          style: AppTextStyles.body.copyWith(color: AppColors.textSecondary),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 20),

                        // Get Started CTA
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: ElevatedButton(
                            onPressed: () => context.go('/register'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primaryBlue,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(26),
                              ),
                              elevation: 4,
                              shadowColor: AppColors.primaryBlue.withOpacity(0.35),
                            ),
                            child: Text(
                              "Get Started",
                              style: AppTextStyles.body.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 14),

                        // Already have account
                        GestureDetector(
                          onTap: () => context.go('/login'),
                          child: RichText(
                            text: TextSpan(
                              children: [
                                TextSpan(
                                  text: "Already have an account? ",
                                  style: AppTextStyles.small.copyWith(color: AppColors.textSecondary),
                                ),
                                TextSpan(
                                  text: "Sign In",
                                  style: AppTextStyles.small.copyWith(
                                    color: AppColors.primaryBlue,
                                    fontWeight: FontWeight.bold,
                                    decoration: TextDecoration.underline,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _featureItem(IconData icon, String label) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, size: 28, color: Colors.white),
          const SizedBox(height: 6),
          Text(
            label,
            style: AppTextStyles.micro.copyWith(
              color: Colors.white.withOpacity(0.8),
              fontSize: 11,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _CityscapePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF0A1F4E)
      ..style = PaintingStyle.fill;

    // Draw city skyline buildings
    final path = Path();
    path.moveTo(0, size.height);
    
    // Buildings silhouette coordinates
    path.lineTo(0, size.height * 0.6);
    path.lineTo(size.width * 0.08, size.height * 0.6);
    path.lineTo(size.width * 0.08, size.height * 0.45);
    path.lineTo(size.width * 0.16, size.height * 0.45);
    path.lineTo(size.width * 0.16, size.height * 0.7);
    path.lineTo(size.width * 0.22, size.height * 0.7);
    path.lineTo(size.width * 0.22, size.height * 0.35);
    path.lineTo(size.width * 0.30, size.height * 0.35);
    path.lineTo(size.width * 0.30, size.height * 0.55);
    path.lineTo(size.width * 0.36, size.height * 0.55);
    path.lineTo(size.width * 0.36, size.height * 0.25);
    path.lineTo(size.width * 0.44, size.height * 0.25);
    path.lineTo(size.width * 0.44, size.height * 0.65);
    
    // Middle section
    path.lineTo(size.width * 0.52, size.height * 0.65);
    path.lineTo(size.width * 0.52, size.height * 0.4);
    path.lineTo(size.width * 0.60, size.height * 0.4);
    path.lineTo(size.width * 0.60, size.height * 0.5);
    path.lineTo(size.width * 0.66, size.height * 0.5);
    path.lineTo(size.width * 0.66, size.height * 0.3);
    path.lineTo(size.width * 0.74, size.height * 0.3);
    path.lineTo(size.width * 0.74, size.height * 0.6);
    
    // Right section
    path.lineTo(size.width * 0.82, size.height * 0.6);
    path.lineTo(size.width * 0.82, size.height * 0.45);
    path.lineTo(size.width * 0.90, size.height * 0.45);
    path.lineTo(size.width * 0.90, size.height * 0.38);
    path.lineTo(size.width * 0.96, size.height * 0.38);
    path.lineTo(size.width * 0.96, size.height * 0.7);
    path.lineTo(size.width, size.height * 0.7);
    path.lineTo(size.width, size.height);
    
    path.close();
    canvas.drawPath(path, paint);

    // Draw little windows in white at 10% opacity
    final winPaint = Paint()
      ..color = Colors.white.withOpacity(0.12)
      ..style = PaintingStyle.fill;
    
    // We can draw a few tiny rectangular window dots
    final Random rand = Random(42);
    for (int i = 0; i < 20; i++) {
      double x = rand.nextDouble() * size.width;
      double y = size.height * 0.4 + rand.nextDouble() * (size.height * 0.5);
      canvas.drawRect(Rect.fromLTWH(x, y, 3, 3), winPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _SignalTowerPainter extends CustomPainter {
  final double progress;

  _SignalTowerPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height * 0.65; // Base of tower tip

    final paint = Paint()
      ..color = Colors.white.withOpacity(0.9)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.2;

    // 1. Draw Lattice tower legs
    final towerPath = Path();
    towerPath.moveTo(cx - 24, size.height * 0.9);
    towerPath.lineTo(cx - 8, cy);
    towerPath.lineTo(cx + 8, cy);
    towerPath.lineTo(cx + 24, size.height * 0.9);
    canvas.drawPath(towerPath, paint);

    // 2. Draw cross girders
    double steps = 5;
    for (int i = 0; i <= steps; i++) {
      double pct = i / steps;
      double y = cy + (size.height * 0.9 - cy) * pct;
      double width = 16 + (48 - 16) * pct;
      canvas.drawLine(Offset(cx - width / 2, y), Offset(cx + width / 2, y), paint);

      if (i < steps) {
        double nextY = cy + (size.height * 0.9 - cy) * ((i + 1) / steps);
        double nextWidth = 16 + (48 - 16) * ((i + 1) / steps);
        // X shapes
        canvas.drawLine(Offset(cx - width / 2, y), Offset(cx + nextWidth / 2, nextY), paint);
        canvas.drawLine(Offset(cx + width / 2, y), Offset(cx - nextWidth / 2, nextY), paint);
      }
    }

    // 3. Tip point dot
    final dotPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(cx, cy), 5.0, dotPaint);

    // 4. Radiating Waves
    final wavePaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 3.0;

    double p = progress; // 0.0 -> 1.0

    // Wave 1 (inner)
    double wave1Rad = 24 + p * 16;
    wavePaint.color = Colors.white.withOpacity((1.0 - p).clamp(0.0, 0.9));
    canvas.drawArc(
      Rect.fromCircle(center: Offset(cx, cy), radius: wave1Rad),
      -pi * 0.75,
      pi * 0.5,
      false,
      wavePaint,
    );

    // Wave 2 (middle)
    double wave2Rad = 48 + p * 20;
    wavePaint.color = Colors.white.withOpacity(((1.0 - p) * 0.6).clamp(0.0, 0.6));
    canvas.drawArc(
      Rect.fromCircle(center: Offset(cx, cy), radius: wave2Rad),
      -pi * 0.75,
      pi * 0.5,
      false,
      wavePaint,
    );

    // Wave 3 (outer)
    double wave3Rad = 76 + p * 24;
    wavePaint.color = Colors.white.withOpacity(((1.0 - p) * 0.3).clamp(0.0, 0.3));
    canvas.drawArc(
      Rect.fromCircle(center: Offset(cx, cy), radius: wave3Rad),
      -pi * 0.75,
      pi * 0.5,
      false,
      wavePaint,
    );
  }

  @override
  bool shouldRepaint(covariant _SignalTowerPainter oldDelegate) => oldDelegate.progress != progress;
}
