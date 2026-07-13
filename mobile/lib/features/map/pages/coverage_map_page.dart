import 'dart:math';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class CoverageMapPage extends StatefulWidget {
  const CoverageMapPage({super.key});

  @override
  State<CoverageMapPage> createState() => _CoverageMapPageState();
}

class _CoverageMapPageState extends State<CoverageMapPage> {
  String _selectedLayer = "Terrain";
  bool _showLegend = true;

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      currentTabIndex: 1,
      showHeader: true,
      isFullScreen: true,
      title: "Coverage Map",
      subtitle: "Regulatory signal overview mapping",
      headerActions: [
        IconButton(
          icon: const Icon(Icons.tune_rounded, color: AppColors.textPrimary),
          onPressed: () => _showFilterSheet(context),
        ),
      ],
      body: Stack(
        children: [
          // 1. Map Canvas Painter Area (Interactive simulation)
          Positioned.fill(
            child: GestureDetector(
              onTapUp: (details) {
                // If user clicks near a mock site, navigate to details
                context.push('/site-details/SL001245');
              },
              child: CustomPaint(
                painter: _MapCanvasPainter(layerType: _selectedLayer),
              ),
            ),
          ),

          // 2. Search overlay at top
          Positioned(
            top: 12,
            left: 12,
            right: 12,
            child: Container(
              height: 48,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.borderLight),
                boxShadow: const [
                  BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2)),
                ],
              ),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: const [
                  Icon(Icons.search_rounded, color: AppColors.textMuted, size: 20),
                  SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      decoration: InputDecoration(
                        hintText: "Search location...",
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        fillColor: Colors.transparent,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                  Icon(Icons.filter_list_rounded, color: AppColors.accentBlue, size: 20),
                ],
              ),
            ),
          ),

          // 3. Map Control Buttons (Floating on the right)
          Positioned(
            right: 16,
            bottom: _showLegend ? 180 : 80,
            child: Column(
              children: [
                _mapControlBtn(Icons.my_location_rounded, () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Centering on Freetown location coordinates...")),
                  );
                }),
                const SizedBox(height: 8),
                _mapControlBtn(Icons.layers_outlined, () {
                  setState(() {
                    _selectedLayer = _selectedLayer == "Terrain" ? "Satellite" : "Terrain";
                  });
                }),
              ],
            ),
          ),

          // 4. Floating Legend Card at Bottom of Map
          if (_showLegend)
            Positioned(
              left: 12,
              right: 12,
              bottom: 12,
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.borderLight),
                  boxShadow: const [
                    BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, -2)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("Network Quality Legend", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                        GestureDetector(
                          onTap: () => setState(() => _showLegend = false),
                          child: const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.textMuted),
                        )
                      ],
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 12,
                      runSpacing: 6,
                      children: [
                        _legendRow(AppColors.lightBlue, "Excellent", "80-100%"),
                        _legendRow(AppColors.successGreen, "Good", "60-80%"),
                        _legendRow(AppColors.warningAmber, "Fair", "40-60%"),
                        _legendRow(AppColors.errorRed, "Poor", "0-40%"),
                      ],
                    ),
                  ],
                ),
              ),
            )
          else
            Positioned(
              left: 12,
              bottom: 12,
              child: GestureDetector(
                onTap: () => setState(() => _showLegend = true),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: Row(
                    children: const [
                      Text("Show Legend", style: TextStyle(color: AppColors.textPrimary, fontSize: 11, fontWeight: FontWeight.bold)),
                      Icon(Icons.keyboard_arrow_up_rounded, size: 16, color: AppColors.textPrimary),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _mapControlBtn(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.borderLight),
          boxShadow: const [
            BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2)),
          ],
        ),
        child: Icon(icon, color: AppColors.textPrimary, size: 20),
      ),
    );
  }

  Widget _legendRow(Color color, String name, String range) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text("$name ($range)", style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
      ],
    );
  }

  void _showFilterSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Map Filter Settings", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
            const SizedBox(height: 20),
            const Text("OPERATORS", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                _filterChip("All", true),
                _filterChip("Sierra Tel", false),
                _filterChip("Orange", false),
                _filterChip("Africell", false),
                _filterChip("Qcell", false),
              ],
            ),
            const SizedBox(height: 20),
            const Text("TECHNOLOGY", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textMuted)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                _filterChip("5G", true),
                _filterChip("4G LTE", true),
                _filterChip("3G / 2G", false),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primaryBlue, foregroundColor: Colors.white),
                child: const Text("Apply Filters"),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _filterChip(String label, bool active) {
    return ChoiceChip(
      label: Text(label),
      selected: active,
      onSelected: (_) {},
      selectedColor: AppColors.primaryBlue.withOpacity(0.12),
      labelStyle: TextStyle(
        color: active ? AppColors.primaryBlue : AppColors.textSecondary,
        fontWeight: active ? FontWeight.bold : FontWeight.normal,
        fontSize: 12,
      ),
    );
  }
}

class _MapCanvasPainter extends CustomPainter {
  final String layerType;

  _MapCanvasPainter({required this.layerType});

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Draw base terrain background
    final baseBg = Paint()
      ..color = layerType == "Terrain" ? const Color(0xFFE8F5E9) : const Color(0xFF1E3F20)
      ..style = PaintingStyle.fill;
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), baseBg);

    // 2. Draw mock coast/sea line representation (Sierra Leone coordinates approximation)
    final waterPaint = Paint()..color = const Color(0xFFBBDEFB)..style = PaintingStyle.fill;
    final path = Path()
      ..moveTo(0, size.height)
      ..lineTo(0, size.height * 0.4)
      ..quadraticBezierTo(size.width * 0.2, size.height * 0.5, size.width * 0.25, size.height * 0.8)
      ..quadraticBezierTo(size.width * 0.3, size.height * 0.95, size.width * 0.4, size.height)
      ..lineTo(0, size.height);
    canvas.drawPath(path, waterPaint);

    // 3. Draw Heatmap contour overlay zones (Semi-transparent blobs)
    _drawHeatmap(canvas, Offset(size.width * 0.45, size.height * 0.3), 70, AppColors.lightBlue); // Excellent Freetown outskirts
    _drawHeatmap(canvas, Offset(size.width * 0.35, size.height * 0.5), 110, AppColors.successGreen); // Good Freetown center
    _drawHeatmap(canvas, Offset(size.width * 0.65, size.height * 0.6), 85, AppColors.warningAmber); // Fair Southern Bo
    _drawHeatmap(canvas, Offset(size.width * 0.8, size.height * 0.4), 60, AppColors.errorRed); // Poor Kenema limits
    _drawHeatmap(canvas, Offset(size.width * 0.5, size.height * 0.75), 100, AppColors.successGreen); // Good

    // 4. Draw Site circular markers (with cell tower icon)
    _drawSiteMarker(canvas, Offset(size.width * 0.35, size.height * 0.48), "Freetown");
    _drawSiteMarker(canvas, Offset(size.width * 0.62, size.height * 0.58), "Bo City");
    _drawSiteMarker(canvas, Offset(size.width * 0.52, size.height * 0.32), "Makeni");
    _drawSiteMarker(canvas, Offset(size.width * 0.78, size.height * 0.42), "Kenema");
  }

  void _drawHeatmap(Canvas canvas, Offset center, double radius, Color color) {
    final heatPaint = Paint()
      ..color = color.withOpacity(0.42)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 20);
    canvas.drawCircle(center, radius, heatPaint);
  }

  void _drawSiteMarker(Canvas canvas, Offset position, String label) {
    // Outer blue circle
    final outerPaint = Paint()
      ..color = AppColors.primaryBlue.withOpacity(0.2)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(position, 16, outerPaint);

    // Inner marker dot
    final innerPaint = Paint()
      ..color = AppColors.primaryBlue
      ..style = PaintingStyle.fill;
    canvas.drawCircle(position, 6, innerPaint);

    // Label text below marker
    final textPainter = TextPainter(
      text: TextSpan(
        text: label,
        style: const TextStyle(color: AppColors.textPrimary, fontSize: 10, fontWeight: FontWeight.bold),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    textPainter.paint(canvas, Offset(position.dx - textPainter.width / 2, position.dy + 12));
  }

  @override
  bool shouldRepaint(covariant _MapCanvasPainter oldDelegate) => oldDelegate.layerType != layerType;
}
