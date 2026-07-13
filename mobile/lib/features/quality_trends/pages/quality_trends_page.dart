import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class QualityTrendsPage extends StatefulWidget {
  const QualityTrendsPage({super.key});

  @override
  State<QualityTrendsPage> createState() => _QualityTrendsPageState();
}

class _QualityTrendsPageState extends State<QualityTrendsPage> {
  String _activePeriod = "30D";
  String _activeMetric = "Network Quality";

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: "Quality Trends",
      subtitle: "Regulatory quality trends index suite",
      headerActions: [
        IconButton(icon: const Icon(Icons.download_rounded), onPressed: () {}),
      ],
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Period selectors
          _buildPeriodSelector(),
          const SizedBox(height: 14),

          // 2. Metric selector strip
          _buildMetricSelector(),
          const SizedBox(height: 16),

          // 3. Multi-line trends graph
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Operator Comparative $_activeMetric (%)", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                const SizedBox(height: 16),
                SizedBox(
                  height: 160,
                  width: double.infinity,
                  child: CustomPaint(
                    painter: _MultiLineTrendPainter(),
                  ),
                ),
                const SizedBox(height: 12),
                _buildOperatorsLegend(),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 4. Summary cards grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.4,
            children: [
              _statBox("Best Period", "Week 2", AppColors.successGreen),
              _statBox("Worst Period", "Week 4", AppColors.errorRed),
              _statBox("Overall Trend", "↑ Improving", AppColors.successGreen),
              _statBox("Avg Score", "76%", AppColors.accentBlue),
            ],
          ),
          const SizedBox(height: 20),

          // 5. Operators List
          const Text("Operator Performance Summary", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary)),
          const SizedBox(height: 10),
          _operatorTrendTile("Orange", "75%", "↓ -1%", AppColors.orangeOperator, false),
          _operatorTrendTile("Africell", "72%", "↑ +3%", AppColors.africellPurple, true),
          _operatorTrendTile("Qcell", "65%", "↓ -2%", AppColors.qcellPurple, false),
          _operatorTrendTile("Sierra Tel", "82%", "↑ +2%", AppColors.sierraTelColor, true),
        ],
      ),
    );
  }

  Widget _buildPeriodSelector() {
    final periods = ["7D", "30D", "90D", "1Y"];
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: periods.map((period) {
        final active = period == _activePeriod;
        return Expanded(
          child: GestureDetector(
            onTap: () => setState(() => _activePeriod = period),
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 4),
              height: 38,
              decoration: BoxDecoration(
                color: active ? AppColors.primaryBlue : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: active ? AppColors.primaryBlue : AppColors.borderLight),
              ),
              alignment: Alignment.center,
              child: Text(
                period,
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: active ? Colors.white : AppColors.textSecondary),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildMetricSelector() {
    final metrics = ["Network Quality", "Call Drop Rate", "4G Coverage", "Data Speed", "Voice Quality"];
    return SizedBox(
      height: 38,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: metrics.map((m) {
          final active = m == _activeMetric;
          return GestureDetector(
            onTap: () => setState(() => _activeMetric = m),
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: active ? AppColors.accentBlue : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: active ? AppColors.accentBlue : AppColors.borderLight),
              ),
              alignment: Alignment.center,
              child: Text(
                m,
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: active ? Colors.white : AppColors.textSecondary),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildOperatorsLegend() {
    final items = [
      {"name": "Sierra Tel", "color": AppColors.sierraTelColor},
      {"name": "Orange", "color": AppColors.orangeOperator},
      {"name": "Africell", "color": AppColors.africellPurple},
      {"name": "Qcell", "color": AppColors.qcellPurple},
    ];

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: items.map((item) {
        return Row(
          children: [
            Container(width: 8, height: 8, decoration: BoxDecoration(color: item["color"] as Color, shape: BoxShape.circle)),
            const SizedBox(width: 4),
            Text(item["name"] as String, style: const TextStyle(fontSize: 9, color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
          ],
        );
      }).toList(),
    );
  }

  Widget _statBox(String label, String val, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.cardWhite,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Text(val, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  Widget _operatorTrendTile(String name, String score, String change, Color color, bool upTrend) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.cardWhite,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
            ],
          ),
          Row(
            children: [
              Text(score, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
              const SizedBox(width: 10),
              Text(
                change,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: upTrend ? AppColors.successGreen : AppColors.errorRed,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MultiLineTrendPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double drawHeight = size.height - 20;

    final List<Color> colors = [
      AppColors.sierraTelColor,
      AppColors.orangeOperator,
      AppColors.africellPurple,
      AppColors.qcellPurple,
    ];

    final gridPaint = Paint()
      ..color = AppColors.borderLight
      ..strokeWidth = 1.0;

    // Grid lines
    for (double y = 0; y <= drawHeight; y += drawHeight / 3) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    // Sierra Tel (Green)
    final p1 = Paint()..color = colors[0]..style = PaintingStyle.stroke..strokeWidth = 2.0;
    canvas.drawPath(Path()..moveTo(0, drawHeight * 0.4)..lineTo(size.width * 0.3, drawHeight * 0.3)..lineTo(size.width * 0.6, drawHeight * 0.2)..lineTo(size.width, drawHeight * 0.18), p1);

    // Orange (Orange)
    final p2 = Paint()..color = colors[1]..style = PaintingStyle.stroke..strokeWidth = 2.0;
    canvas.drawPath(Path()..moveTo(0, drawHeight * 0.5)..lineTo(size.width * 0.3, drawHeight * 0.48)..lineTo(size.width * 0.6, drawHeight * 0.35)..lineTo(size.width, drawHeight * 0.4), p2);

    // Africell (Purple)
    final p3 = Paint()..color = colors[2]..style = PaintingStyle.stroke..strokeWidth = 2.0;
    canvas.drawPath(Path()..moveTo(0, drawHeight * 0.6)..lineTo(size.width * 0.3, drawHeight * 0.55)..lineTo(size.width * 0.6, drawHeight * 0.58)..lineTo(size.width, drawHeight * 0.48), p3);

    // Qcell (Red)
    final p4 = Paint()..color = colors[3]..style = PaintingStyle.stroke..strokeWidth = 2.0;
    canvas.drawPath(Path()..moveTo(0, drawHeight * 0.72)..lineTo(size.width * 0.3, drawHeight * 0.68)..lineTo(size.width * 0.6, drawHeight * 0.75)..lineTo(size.width, drawHeight * 0.7), p4);
  }

  @override
  bool shouldRepaint(covariant _MultiLineTrendPainter oldDelegate) => false;
}
