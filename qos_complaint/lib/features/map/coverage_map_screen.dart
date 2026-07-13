import 'package:flutter/material.dart';
import '../../app/theme/app_theme.dart';

class CoverageMapScreen extends StatefulWidget {
  const CoverageMapScreen({super.key});

  @override
  State<CoverageMapScreen> createState() => _CoverageMapScreenState();
}

class _CoverageMapScreenState extends State<CoverageMapScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _showClearIcon = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      body: Stack(
        children: [
          // 1. Full Screen Interactive Map Canvas
          Positioned.fill(
            child: InteractiveViewer(
              maxScale: 4.0,
              minScale: 0.5,
              child: CustomPaint(
                painter: _SierraLeoneHeatmapPainter(),
              ),
            ),
          ),

          // 2. Floating Top Bar
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top + 8, left: 16, right: 16, bottom: 12),
              decoration: BoxDecoration(
                color: AppColors.dynamicCard,
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
                boxShadow: const [
                  BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 3)),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text("Coverage Map", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
                  IconButton(
                    icon: const Icon(Icons.layers_outlined, color: AppColors.textPrimary, size: 24),
                    onPressed: () {},
                  ),
                ],
              ),
            ),
          ),

          // 3. Floating Search Bar
          Positioned(
            top: MediaQuery.of(context).padding.top + 70,
            left: 16,
            right: 16,
            child: Container(
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.dynamicCard,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.dynamicBorder),
                boxShadow: const [
                  BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2)),
                ],
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Row(
                children: [
                  const Icon(Icons.search, color: AppColors.textLight, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      style: AppTextStyles.body.copyWith(fontSize: 14),
                      decoration: InputDecoration(
                        hintText: "Search location...",
                        hintStyle: TextStyle(color: AppColors.textLight),
                        border: InputBorder.none,
                      ),
                      onChanged: (val) {
                        setState(() {
                          _showClearIcon = val.isNotEmpty;
                        });
                      },
                    ),
                  ),
                  if (_showClearIcon)
                    IconButton(
                      icon: const Icon(Icons.clear, color: AppColors.textLight, size: 18),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () {
                        _searchController.clear();
                        setState(() {
                          _showClearIcon = false;
                        });
                      },
                    ),
                ],
              ),
            ),
          ),

          // 4. Floating Action Buttons (Right side)
          Positioned(
            right: 16,
            bottom: 150,
            child: Column(
              children: [
                _floatingRoundButton(Icons.layers_rounded, () {}),
                const SizedBox(height: 8),
                _floatingRoundButton(Icons.my_location_rounded, () {}, color: AppColors.primaryBlue),
              ],
            ),
          ),

          // 5. Legend Card Overlay (Bottom fixed)
          Positioned(
            bottom: 16,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.dynamicCard,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.dynamicBorder),
                boxShadow: const [
                  BoxShadow(color: Colors.black26, blurRadius: 10, offset: Offset(0, -2)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text("Network Quality", style: AppTextStyles.small.copyWith(fontWeight: FontWeight.bold, color: AppColors.dynamicTextPrimary)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _legendItem(const Color(0xFF43A047), "Excellent"),
                      _legendItem(const Color(0xFF8BC34A), "Good"),
                      _legendItem(const Color(0xFFFFC107), "Fair"),
                      _legendItem(const Color(0xFFFF5722), "Poor"),
                      _legendItem(const Color(0xFF9E9E9E), "No Cov."),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _floatingRoundButton(IconData icon, VoidCallback onTap, {Color color = AppColors.textPrimary}) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: AppColors.dynamicCard,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.dynamicBorder),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2)),
        ],
      ),
      child: IconButton(
        icon: Icon(icon, color: color, size: 20),
        onPressed: onTap,
      ),
    );
  }

  Widget _legendItem(Color color, String label) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: AppTextStyles.micro.copyWith(color: AppColors.dynamicTextSecondary, fontSize: 11),
        ),
      ],
    );
  }
}

class _SierraLeoneHeatmapPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = const Color(0xFFDFE4E8);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    final boundaryPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;

    // Draw a stylized shape of Sierra Leone
    final slPath = Path();
    final cx = size.width / 2;
    final cy = size.height / 2;

    slPath.moveTo(cx - 100, cy - 60);
    slPath.quadraticBezierTo(cx - 30, cy - 120, cx + 50, cy - 100);
    slPath.quadraticBezierTo(cx + 120, cy - 40, cx + 110, cy + 30);
    slPath.quadraticBezierTo(cx + 70, cy + 110, cx - 10, cy + 90);
    slPath.quadraticBezierTo(cx - 80, cy + 100, cx - 110, cy + 40);
    slPath.quadraticBezierTo(cx - 130, cy - 10, cx - 100, cy - 60);
    slPath.close();

    canvas.drawPath(slPath, boundaryPaint);

    // Heatmap circles overlays
    final heatPaint = Paint()..style = PaintingStyle.fill;

    // Freetown (Excellent - Green)
    heatPaint.color = const Color(0xFF43A047).withOpacity(0.65);
    canvas.drawCircle(Offset(cx - 95, cy - 10), 45, heatPaint);

    // Bo (Good - Light Green)
    heatPaint.color = const Color(0xFF8BC34A).withOpacity(0.65);
    canvas.drawCircle(Offset(cx - 10, cy + 30), 55, heatPaint);

    // Makeni (Fair - Amber)
    heatPaint.color = const Color(0xFFFFC107).withOpacity(0.65);
    canvas.drawCircle(Offset(cx - 20, cy - 50), 50, heatPaint);

    // Kenema (Poor - Deep Orange)
    heatPaint.color = const Color(0xFFFF5722).withOpacity(0.65);
    canvas.drawCircle(Offset(cx + 60, cy + 20), 55, heatPaint);

    // Remote rural borders (Dark Red)
    heatPaint.color = const Color(0xFFB71C1C).withOpacity(0.65);
    canvas.drawCircle(Offset(cx + 80, cy - 50), 40, heatPaint);

    // Drawing City Pins
    _drawCityPin(canvas, Offset(cx - 95, cy - 10), "Freetown", const Color(0xFF43A047));
    _drawCityPin(canvas, Offset(cx - 20, cy - 50), "Makeni", const Color(0xFFFFC107));
    _drawCityPin(canvas, Offset(cx + 60, cy + 20), "Kenema", const Color(0xFFFF5722));
    _drawCityPin(canvas, Offset(cx - 10, cy + 30), "Bo", const Color(0xFF8BC34A));
  }

  void _drawCityPin(Canvas canvas, Offset pos, String name, Color dotColor) {
    // White card background
    final shadowPaint = Paint()
      ..color = Colors.black.withOpacity(0.2)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(pos.dx, pos.dy + 1), 6, shadowPaint);

    final outerPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    canvas.drawCircle(pos, 6, outerPaint);

    final innerPaint = Paint()
      ..color = dotColor
      ..style = PaintingStyle.fill;
    canvas.drawCircle(pos, 3, innerPaint);

    // Draw label pill below
    final textPainter = TextPainter(
      text: TextSpan(
        text: name,
        style: const TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.bold),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    final pillWidth = textPainter.width + 12;
    final pillHeight = textPainter.height + 6;
    final pillRect = Rect.fromCenter(center: Offset(pos.dx, pos.dy + 16), width: pillWidth, height: pillHeight);
    
    final rrect = RRect.fromRectAndRadius(pillRect, const Radius.circular(6));
    canvas.drawRRect(rrect, outerPaint);
    canvas.drawRRect(rrect, Paint()..color = Colors.black12..style = PaintingStyle.stroke);

    textPainter.paint(canvas, Offset(pos.dx - textPainter.width / 2, pos.dy + 16 - textPainter.height / 2));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
