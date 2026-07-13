import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class OperatorDetailsPage extends StatelessWidget {
  final String operatorId;

  const OperatorDetailsPage({super.key, required this.operatorId});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: "Operator Details",
      subtitle: "ID: $operatorId",
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Operator profile header card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: AppColors.sierraTelColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.sierraTelColor.withOpacity(0.3)),
                  ),
                  alignment: Alignment.center,
                  child: const Text("Sierra Tel", style: TextStyle(color: AppColors.sierraTelColor, fontWeight: FontWeight.bold, fontSize: 10)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text("Sierra Tel", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary, fontSize: 16)),
                      SizedBox(height: 4),
                      Text("Overall Score: 82% · GOOD", style: TextStyle(color: AppColors.successGreen, fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 2. Performance metrics list
          _sectionHeader("Core Metrics KPI"),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              children: [
                _metricRow("Call Drop Rate", "2.12%", AppColors.successGreen),
                _metricRow("4G Coverage", "84%", AppColors.successGreen),
                _metricRow("Avg Data Throughput", "42.8 Mbps", AppColors.successGreen),
                _metricRow("Voice Quality (MOS)", "4.1 / 5", AppColors.successGreen),
                _metricRow("Network Availability", "99.45%", AppColors.successGreen),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 3. Sites summary
          _sectionHeader("Sites Summary"),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _sitesColumn("524", "Total Sites"),
                _sitesColumn("516", "Active"),
                _sitesColumn("8", "Inactive"),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 4. Coverage Map Thumbnail
          _sectionHeader("Operator Coverage Area"),
          Container(
            height: 120,
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  Icon(Icons.map_outlined, color: AppColors.primaryBlue, size: 24),
                  SizedBox(height: 4),
                  Text("View full coverage map footprint", style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // 5. 30-Day performance trend Sparkline
          _sectionHeader("30-Day Performance Index"),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: SizedBox(
              height: 60,
              width: double.infinity,
              child: CustomPaint(
                painter: _TrendSparklinePainter(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionHeader(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0, left: 4.0),
      child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textSecondary)),
    );
  }

  Widget _metricRow(String name, String value, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(name, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _sitesColumn(String val, String desc) {
    return Column(
      children: [
        Text(val, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        const SizedBox(height: 4),
        Text(desc, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.w500)),
      ],
    );
  }
}

class _TrendSparklinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.lightBlue
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    final path = Path()
      ..moveTo(0, size.height * 0.7)
      ..quadraticBezierTo(size.width * 0.2, size.height * 0.9, size.width * 0.4, size.height * 0.4)
      ..quadraticBezierTo(size.width * 0.6, size.height * 0.1, size.width * 0.8, size.height * 0.3)
      ..lineTo(size.width, size.height * 0.2);

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _TrendSparklinePainter oldDelegate) => false;
}
