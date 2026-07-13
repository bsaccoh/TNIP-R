import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../app/providers/state_providers.dart';
import '../../../core/models/app_models.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../shared/charts/reusable_charts.dart';
import '../../../constants/mock_constants.dart';

class SessionReportPage extends ConsumerWidget {
  final String sessionId;

  const SessionReportPage({super.key, required this.sessionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessions = ref.watch(historyProvider);
    final session = sessions.firstWhere(
      (s) => s.id == sessionId,
      orElse: () => MOCK_HISTORY_SESSIONS[0],
    );

    return AppScaffold(
      showHeader: true,
      title: "Session Report",
      subtitle: "${session.date} • ${session.time}",
      headerActions: [
        IconButton(
          icon: const Icon(Icons.share_outlined, color: AppColors.textWhite),
          onPressed: () {},
        ),
      ],
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Overall Score Hero Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: AppColors.primaryAccentBlue.withOpacity(0.4), width: 1.5),
                boxShadow: [
                  BoxShadow(color: AppColors.blueGlow.withOpacity(0.1), blurRadius: 10),
                ],
              ),
              child: Column(
                children: [
                  const Text("OVERALL QUALITY SCORE", style: TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold, letterSpacing: 0.8)),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: const [
                      Text("87", style: TextStyle(fontSize: 56, fontWeight: FontWeight.w800, color: AppColors.textWhite)),
                      Text("/100", style: TextStyle(fontSize: 16, color: AppColors.textMuted)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.excellentBg,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text("GOOD QUALITY", style: TextStyle(color: AppColors.successGreen, fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(height: 16),
                  const Divider(color: AppColors.border),
                  const SizedBox(height: 12),
                  // Row of stats
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _heroStat("Coverage", "94%"),
                      _heroStat("Avg Speed", "88 Mbps"),
                      _heroStat("Latency", "29 ms"),
                      _heroStat("Drops", "0", AppColors.successGreen),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // 2. Map route thumbnail
            const Text("DRIVE PATH MAP", style: AppTextStyles.sectionLabel),
            const SizedBox(height: 8),
            Container(
              height: 150,
              width: double.infinity,
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: CustomPaint(
                  painter: _ReportRoutePainter(session.points),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // 3. Distribution stacked bar
            const Text("SIGNAL STRENGTH DISTRIBUTION", style: AppTextStyles.sectionLabel),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: const StackedBar(
                excellent: 42,
                good: 38,
                fair: 15,
                poor: 5,
              ),
            ),
            const SizedBox(height: 20),

            // 4. Technology Donut Chart
            const Text("RADIO ACCESS TECHNOLOGY (RAT)", style: AppTextStyles.sectionLabel),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: const DonutChart(
                val1: 78,
                label1: "5G NR NSA",
                val2: 22,
                label2: "4G LTE",
              ),
            ),
            const SizedBox(height: 20),

            // 5. Timeline Sparklines
            const Text("TIMELINE ANALYSIS", style: AppTextStyles.sectionLabel),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("RSRP (dBm)", style: TextStyle(color: AppColors.textWhite, fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  SparklineChart(
                    data: session.points.isNotEmpty ? session.points.map((pt) => pt.rsrp).toList() : [-81, -82, -80, -85, -82, -81],
                    color: AppColors.successGreen,
                    height: 40,
                  ),
                  const SizedBox(height: 16),
                  const Text("Throughput (Mbps)", style: TextStyle(color: AppColors.textWhite, fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  SparklineChart(
                    data: session.points.isNotEmpty ? session.points.map((pt) => pt.speed.round()).toList() : [120, 140, 185, 110, 150, 130],
                    color: AppColors.primaryAccentBlue,
                    height: 40,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // 6. Action buttons row
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => context.push('/history/export/${session.id}'),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.border),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text("Export KML", style: TextStyle(color: AppColors.textWhite, fontSize: 12)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => context.push('/history/export/${session.id}'),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.border),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text("Export CSV", style: TextStyle(color: AppColors.textWhite, fontSize: 12)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => context.push('/history/export/${session.id}'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryAccentBlue,
                      foregroundColor: AppColors.textWhite,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text("Upload Cloud", style: TextStyle(fontSize: 12)),
                  ),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }

  Widget _heroStat(String label, String value, [Color? color]) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 9, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: color ?? AppColors.textWhite)),
      ],
    );
  }
}

class _ReportRoutePainter extends CustomPainter {
  final List<RoutePoint> points;

  _ReportRoutePainter(this.points);

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty) return;

    final p = Paint()
      ..color = AppColors.successGreen
      ..strokeWidth = 4.0
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final path = Path();

    double getX(double lng, double minLng, double maxLng) {
      double d = maxLng - minLng;
      if (d == 0) return size.width / 2;
      return 20 + ((lng - minLng) / d) * (size.width - 40);
    }

    double getY(double lat, double minLat, double maxLat) {
      double d = maxLat - minLat;
      if (d == 0) return size.height / 2;
      return 20 + ((maxLat - lat) / d) * (size.height - 40);
    }

    final lats = points.map((pt) => pt.lat).toList();
    final lngs = points.map((pt) => pt.lng).toList();

    double minLat = lats.reduce((a, b) => a < b ? a : b);
    double maxLat = lats.reduce((a, b) => a > b ? a : b);
    double minLng = lngs.reduce((a, b) => a < b ? a : b);
    double maxLng = lngs.reduce((a, b) => a > b ? a : b);

    path.moveTo(getX(points[0].lng, minLng, maxLng), getY(points[0].lat, minLat, maxLat));

    for (int i = 1; i < points.length; i++) {
      path.lineTo(getX(points[i].lng, minLng, maxLng), getY(points[i].lat, minLat, maxLat));
    }

    // Grid lines background
    final grid = Paint()..color = Colors.white.withOpacity(0.02);
    for (double i = 0; i < size.width; i += 30) {
      canvas.drawLine(Offset(i, 0), Offset(i, size.height), grid);
    }

    canvas.drawPath(path, p);
  }

  @override
  bool shouldRepaint(covariant _ReportRoutePainter oldDelegate) =>
      oldDelegate.points != points;
}
