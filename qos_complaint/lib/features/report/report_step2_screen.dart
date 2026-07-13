import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';
import '../../app/providers/state_providers.dart';

class ReportStep2Screen extends ConsumerStatefulWidget {
  const ReportStep2Screen({super.key});

  @override
  ConsumerState<ReportStep2Screen> createState() => _ReportStep2ScreenState();
}

class _ReportStep2ScreenState extends ConsumerState<ReportStep2Screen> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  
  // Simulated address state variables
  String _currentStreet = "12 Bockarie Gbay Street";
  String _currentCity = "Kenema, Sierra Leone";
  double _currentLat = 8.1189;
  double _currentLng = -11.1963;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  void _simulateNewLocation() {
    final Random rand = Random();
    setState(() {
      _currentStreet = "Alternative Route ${rand.nextInt(100)}";
      _currentCity = "Kenema Central Sector";
      _currentLat = 8.1150 + rand.nextDouble() * 0.01;
      _currentLng = -11.2000 + rand.nextDouble() * 0.01;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      appBar: AppBar(
        backgroundColor: AppColors.dynamicBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
        title: Text("Location", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Subtitle and step bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Confirm your location", style: AppTextStyles.small),
                const SizedBox(height: 10),
                _buildProgressIndicator(),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Google Map Simulation Canvas
          Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.dynamicBorder),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Stack(
                  children: [
                    // Mock Google Map Painter Drawing roads, paths, rivers
                    Positioned.fill(
                      child: CustomPaint(
                        painter: _MockMapPainter(lat: _currentLat, lng: _currentLng),
                      ),
                    ),

                    // Central Target Pin + Accuracy pulse ring
                    Center(
                      child: AnimatedBuilder(
                        animation: _pulseController,
                        builder: (context, child) {
                          return CustomPaint(
                            size: const Size(120, 120),
                            painter: _MapPulsePinPainter(progress: _pulseController.value),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Location details card
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.dynamicCard,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.dynamicBorder),
                boxShadow: const [
                  BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2)),
                ],
              ),
              child: Row(
                children: [
                  const Icon(Icons.location_on_rounded, color: AppColors.primaryBlue, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_currentStreet, style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 2),
                        Text(_currentCity, style: AppTextStyles.small),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: AppColors.accentGreen,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              "Accuracy: High (\u226410m)",
                              style: AppTextStyles.micro.copyWith(color: AppColors.accentGreen, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.my_location_rounded, color: AppColors.textSecondary),
                    onPressed: _simulateNewLocation,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Action links
          Center(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                GestureDetector(
                  onTap: _simulateNewLocation,
                  child: Row(
                    children: [
                      const Icon(Icons.navigation_outlined, size: 16, color: AppColors.primaryBlue),
                      const SizedBox(width: 4),
                      Text("Use Current Location", style: AppTextStyles.small.copyWith(color: AppColors.primaryBlue, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                const SizedBox(width: 24),
                GestureDetector(
                  onTap: _simulateNewLocation,
                  child: Row(
                    children: [
                      const Icon(Icons.search, size: 16, color: AppColors.primaryBlue),
                      const SizedBox(width: 4),
                      Text("Search for another location", style: AppTextStyles.small.copyWith(color: AppColors.primaryBlue)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Confirm Location Button
          _buildBottomCTA(context),
        ],
      ),
    );
  }

  Widget _buildProgressIndicator() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.textLight, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Container(width: 16, height: 8, decoration: BoxDecoration(color: AppColors.primaryBlue, borderRadius: BorderRadius.circular(4))),
        const SizedBox(width: 6),
        Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.textLight, shape: BoxShape.circle)),
      ],
    );
  }

  Widget _buildBottomCTA(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      decoration: BoxDecoration(
        color: AppColors.dynamicCard,
        border: Border(top: BorderSide(color: AppColors.dynamicBorder)),
      ),
      child: SizedBox(
        width: double.infinity,
        height: 52,
        child: ElevatedButton(
          onPressed: () {
            // Save details to Riverpod provider draft state
            ref.read(draftReportProvider.notifier).updateLocation(
              _currentStreet,
              _currentCity,
              _currentLat,
              _currentLng,
            );
            // Go to step 3 review
            context.push('/report/review');
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryBlue,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(26),
            ),
            elevation: 4,
            shadowColor: AppColors.primaryBlue.withOpacity(0.3),
          ),
          child: Text(
            "Confirm Location",
            style: AppTextStyles.body.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
        ),
      ),
    );
  }
}

class _MockMapPainter extends CustomPainter {
  final double lat;
  final double lng;

  _MockMapPainter({required this.lat, required this.lng});

  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = const Color(0xFFE8ECEF);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    final roadPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14.0;

    final parkPaint = Paint()
      ..color = const Color(0xFFD4E6D6)
      ..style = PaintingStyle.fill;

    // Draw parks
    canvas.drawRect(Rect.fromLTWH(20, 20, 100, 80), parkPaint);
    canvas.drawRect(Rect.fromLTWH(size.width - 120, size.height - 110, 90, 80), parkPaint);

    // Draw roads grid
    final roadPath = Path();
    roadPath.moveTo(0, size.height * 0.3);
    roadPath.lineTo(size.width, size.height * 0.35);

    roadPath.moveTo(size.width * 0.3, 0);
    roadPath.lineTo(size.width * 0.35, size.height);

    roadPath.moveTo(0, size.height * 0.7);
    roadPath.cubicTo(size.width * 0.3, size.height * 0.75, size.width * 0.6, size.height * 0.55, size.width, size.height * 0.65);

    canvas.drawPath(roadPath, roadPaint);

    // Outline roads border (grey)
    final borderPaint = Paint()
      ..color = const Color(0xFFCBD3D8)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    canvas.drawPath(roadPath, borderPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

class _MapPulsePinPainter extends CustomPainter {
  final double progress;

  _MapPulsePinPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;

    // 1. Draw accuracy pulse rings
    final pulsePaint = Paint()
      ..color = AppColors.primaryBlue.withOpacity((1.0 - progress) * 0.3)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(cx, cy), 10 + progress * 30, pulsePaint);

    final pulseBorder = Paint()
      ..color = AppColors.primaryBlue.withOpacity((1.0 - progress) * 0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;
    canvas.drawCircle(Offset(cx, cy), 10 + progress * 30, pulseBorder);

    // 2. Base circle anchor
    final basePaint = Paint()
      ..color = AppColors.primaryBlue.withOpacity(0.3)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(cx, cy), 6.0, basePaint);

    // 3. Teardrop Pin Shape
    final pinPaint = Paint()
      ..color = AppColors.primaryBlue
      ..style = PaintingStyle.fill;

    final pinPath = Path();
    pinPath.moveTo(cx, cy);
    pinPath.cubicTo(cx - 15, cy - 20, cx - 15, cy - 38, cx, cy - 38);
    pinPath.cubicTo(cx + 15, cy - 38, cx + 15, cy - 20, cx, cy);
    pinPath.close();
    canvas.drawPath(pinPath, pinPaint);

    // 4. Pin center dot
    final centerDotPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(cx, cy - 26), 4.0, centerDotPaint);
  }

  @override
  bool shouldRepaint(covariant _MapPulsePinPainter oldDelegate) => oldDelegate.progress != progress;
}
