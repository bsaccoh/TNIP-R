import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../app/providers/state_providers.dart';
import '../../../core/models/app_models.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../constants/mock_constants.dart';

class HeatmapPage extends ConsumerStatefulWidget {
  const HeatmapPage({super.key});

  @override
  ConsumerState<HeatmapPage> createState() => _HeatmapPageState();
}

class _HeatmapPageState extends ConsumerState<HeatmapPage> {
  String _selectedMetric = "RSRP";

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(dashboardProvider);
    final points = state.recordedPoints.isNotEmpty 
        ? state.recordedPoints 
        : MOCK_HISTORY_SESSIONS[0].points;

    return AppScaffold(
      showHeader: false,
      isFullScreen: true,
      body: Stack(
        children: [
          // 1. HEATMAP OVERLAY VISUALIZATION CANVAS
          Positioned.fill(
            child: _HeatmapCanvas(points: points, metric: _selectedMetric),
          ),

          // 2. BACK BUTTON
          Positioned(
            top: 16,
            left: 16,
            child: GestureDetector(
              onTap: () => context.pop(),
              child: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.secondaryBackground,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: const Icon(Icons.arrow_back_ios_new_rounded, size: 16, color: AppColors.textWhite),
              ),
            ),
          ),

          // 3. TOGGLE PILL: HEATMAP | PATH
          Positioned(
            top: 16,
            left: 70,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  GestureDetector(
                    onTap: () => context.go('/map'),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      child: const Text("PATH", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.primaryAccentBlue,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: const Text("HEATMAP", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textWhite)),
                  ),
                ],
              ),
            ),
          ),

          // 4. METRIC SELECTOR
          Positioned(
            top: 16,
            right: 16,
            child: GestureDetector(
              onTap: () => _showMetricFilterSheet(context),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.secondaryBackground,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: AppColors.border),
                ),
                child: Text(
                  "$_selectedMetric ▾",
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textWhite),
                ),
              ),
            ),
          ),

          // 5. LEGEND FLOATING CARD (BOTTOM LEFT)
          Positioned(
            bottom: 90,
            left: 16,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground.withOpacity(0.9),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  _legendItem(AppColors.successGreen, "Excellent"),
                  const SizedBox(height: 6),
                  _legendItem(AppColors.goodGreen, "Good"),
                  const SizedBox(height: 6),
                  _legendItem(AppColors.warningAmber, "Fair"),
                  const SizedBox(height: 6),
                  _legendItem(AppColors.errorRed, "Poor"),
                ],
              ),
            ),
          ),

          // 6. BOTTOM SUMMARY STRIP PANEL
          Positioned(
            bottom: 12,
            left: 12,
            right: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground.withOpacity(0.95),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _summaryCol("Avg Metric", "${state.liveMetric.rsrp} dBm"),
                  _summaryCol("Best Zone", "Central Freetown"),
                  _summaryCol("Worst Zone", "Kissy bypass"),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _legendItem(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 8),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textWhite, fontWeight: FontWeight.w600)),
      ],
    );
  }

  Widget _summaryCol(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textWhite)),
      ],
    );
  }

  void _showMetricFilterSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.elevatedCard,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24))),
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Select Heatmap Metric Overlay", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textWhite)),
            const SizedBox(height: 16),
            ...["RSRP", "SINR", "Speed"].map((m) => ListTile(
              title: Text(m, style: const TextStyle(color: AppColors.textWhite)),
              trailing: _selectedMetric == m ? const Icon(Icons.check, color: AppColors.primaryAccentBlue) : null,
              onTap: () {
                setState(() {
                  _selectedMetric = m;
                });
                Navigator.pop(context);
              },
            )),
          ],
        ),
      ),
    );
  }
}

// ── HEATMAP OVERLAY CANVAS PAINTER ─────────────────────────────────────────
class _HeatmapCanvas extends StatelessWidget {
  final List<RoutePoint> points;
  final String metric;

  const _HeatmapCanvas({required this.points, required this.metric});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.primaryBackground,
      child: CustomPaint(
        painter: _HeatmapPainter(points, metric),
      ),
    );
  }
}

class _HeatmapPainter extends CustomPainter {
  final List<RoutePoint> points;
  final String metric;

  _HeatmapPainter(this.points, this.metric);

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty) return;

    double getX(double lat, double lng) {
      return size.width / 2 + (lng - (-13.234)) * 90000;
    }

    double getY(double lat, double lng) {
      return size.height / 2 - (lat - 8.484) * 90000;
    }

    final Paint blurPaint = Paint()..style = PaintingStyle.fill;

    // Draw coordinate grid lines
    final gridPaint = Paint()..color = Colors.white.withOpacity(0.02);
    for (double i = 0; i < size.width; i += 45) {
      canvas.drawLine(Offset(i, 0), Offset(i, size.height), gridPaint);
    }

    // Render overlapping semi-transparent circles to simulate signal heatmap blooms
    for (var pt in points) {
      final Color color;
      if (metric == "RSRP") {
        final r = pt.rsrp;
        if (r >= -80) color = AppColors.successGreen;
        else if (r >= -90) color = AppColors.goodGreen;
        else if (r >= -100) color = AppColors.warningAmber;
        else color = AppColors.errorRed;
      } else {
        final s = pt.sinr;
        if (s >= 15) color = AppColors.successGreen;
        else if (s >= 8) color = AppColors.goodGreen;
        else if (s >= 0) color = AppColors.warningAmber;
        else color = AppColors.errorRed;
      }

      final center = Offset(getX(pt.lat, pt.lng), getY(pt.lat, pt.lng));

      // Draw standard inner circles
      blurPaint.color = color.withOpacity(0.18);
      canvas.drawCircle(center, 28.0, blurPaint);

      blurPaint.color = color.withOpacity(0.08);
      canvas.drawCircle(center, 44.0, blurPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _HeatmapPainter oldDelegate) =>
      oldDelegate.points != points || oldDelegate.metric != metric;
}
