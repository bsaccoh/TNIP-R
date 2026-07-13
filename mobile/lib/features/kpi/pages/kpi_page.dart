import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class KpiPage extends StatelessWidget {
  const KpiPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: "KPI Monitor",
      subtitle: "Regulatory benchmark indicators",
      headerActions: [
        IconButton(icon: const Icon(Icons.date_range_rounded), onPressed: () {}),
        IconButton(icon: const Icon(Icons.download_rounded), onPressed: () {}),
      ],
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Grid of KPI cards
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.3,
            children: [
              _kpiCard("Call Drop Rate", "2.35%", "Target: < 2.0%", AppColors.errorRed, true),
              _kpiCard("4G Coverage", "68%", "Target: > 60%", AppColors.successGreen, false),
              _kpiCard("Data Throughput", "45 Mbps", "Target: > 10 Mbps", AppColors.successGreen, false),
              _kpiCard("Voice Quality", "4.2 MOS", "Target: > 3.8 MOS", AppColors.successGreen, false),
              _kpiCard("Availability", "99.2%", "Target: > 99.0%", AppColors.successGreen, false),
              _kpiCard("Handover Success", "94.5%", "Target: > 95.0%", AppColors.warningAmber, true),
            ],
          ),
          const SizedBox(height: 20),

          // 2. Grouped bar chart operator comparison
          const Text("Operator Comparison", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary)),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Quality Score index breakdown", style: AppTextStyles.caption),
                const SizedBox(height: 20),
                SizedBox(
                  height: 140,
                  width: double.infinity,
                  child: CustomPaint(
                    painter: _GroupedBarChartPainter(),
                  ),
                ),
                const SizedBox(height: 12),
                // Legend
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _legendItem(AppColors.sierraTelColor, "Sierra Tel"),
                    _legendItem(AppColors.orangeOperator, "Orange"),
                    _legendItem(AppColors.africellPurple, "Africell"),
                    _legendItem(AppColors.qcellPurple, "Qcell"),
                  ],
                )
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _kpiCard(String title, String value, String threshold, Color color, bool isAlert) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
              ),
              if (isAlert)
                Icon(Icons.warning_amber_rounded, size: 14, color: color)
              else
                Icon(Icons.check_circle_outline_rounded, size: 14, color: color),
            ],
          ),
          const SizedBox(height: 6),
          Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 4),
          Text(threshold, style: const TextStyle(fontSize: 9, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _legendItem(Color color, String label) {
    return Row(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 9, color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
      ],
    );
  }
}

class _GroupedBarChartPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double drawHeight = size.height - 24;

    final gridPaint = Paint()
      ..color = AppColors.borderLight
      ..strokeWidth = 1.0;

    // Draw horizontal grid lines
    for (double y = 0; y <= drawHeight; y += drawHeight / 3) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    final List<List<double>> operatorMetrics = [
      [0.85, 0.72, 0.90], // Sierra Tel (Voice, Data, Coverage)
      [0.78, 0.81, 0.75], // Orange
      [0.70, 0.65, 0.82], // Africell
      [0.60, 0.70, 0.65], // Qcell
    ];

    final List<Color> colors = [
      AppColors.sierraTelColor,
      AppColors.orangeOperator,
      AppColors.africellPurple,
      AppColors.qcellPurple,
    ];

    double groupWidth = size.width / 3;
    double barWidth = 8.0;
    double barSpacing = 2.0;
    double clusterWidth = (4 * barWidth) + (3 * barSpacing);

    for (int group = 0; group < 3; group++) {
      double groupX = group * groupWidth;
      double offset = (groupWidth - clusterWidth) / 2;
      double startX = groupX + offset;

      for (int op = 0; op < 4; op++) {
        double val = operatorMetrics[op][group];
        double barHeight = drawHeight * val;
        double x = startX + op * (barWidth + barSpacing);
        double y = drawHeight - barHeight;

        final paint = Paint()
          ..color = colors[op]
          ..style = PaintingStyle.fill;

        canvas.drawRect(Rect.fromLTWH(x, y, barWidth, barHeight), paint);
      }

      // Group labels centered below the bars cluster
      String label = group == 0 ? "Voice QoS" : group == 1 ? "Data Speed" : "Coverage";
      final textPainter = TextPainter(
        text: TextSpan(
          text: label,
          style: const TextStyle(color: AppColors.textMuted, fontSize: 9, fontWeight: FontWeight.bold),
        ),
        textDirection: TextDirection.ltr,
      )..layout();

      double centerX = groupX + groupWidth / 2;
      textPainter.paint(
        canvas,
        Offset(centerX - textPainter.width / 2, drawHeight + 6),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _GroupedBarChartPainter oldDelegate) => false;
}
