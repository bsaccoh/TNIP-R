import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class BenchmarkingPage extends StatefulWidget {
  const BenchmarkingPage({super.key});

  @override
  State<BenchmarkingPage> createState() => _BenchmarkingPageState();
}

class _BenchmarkingPageState extends State<BenchmarkingPage> {
  String _activePeriod = "30D";

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: "Benchmarking",
      subtitle: "Multi-operator performance benchmark rankings",
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Period Selector
          _buildPeriodSelector(),
          const SizedBox(height: 16),

          // 2. Rankings Table
          _sectionTitle("Operator Rankings"),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              children: [
                _tableHeader(),
                const Divider(color: AppColors.borderLight, height: 16),
                _tableRow("🥇", "Sierra Tel", "82%", "↑ +2%", AppColors.sierraTelColor),
                const Divider(color: AppColors.borderLight, height: 16),
                _tableRow("🥈", "Orange", "75%", "↓ -1%", AppColors.orangeOperator),
                const Divider(color: AppColors.borderLight, height: 16),
                _tableRow("🥉", "Africell", "72%", "↑ +3%", AppColors.africellPurple),
                const Divider(color: AppColors.borderLight, height: 16),
                _tableRow("4", "Qcell", "65%", "↓ -2%", AppColors.qcellPurple),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 3. Radar Chart representation
          _sectionTitle("Multi-KPI Comparison Radar"),
          Container(
            height: 160,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Center(
              child: CustomPaint(
                size: const Size(120, 120),
                painter: _SpiderRadarPainter(),
              ),
            ),
          ),
          const SizedBox(height: 20),

          // 4. Best/Worst cards row
          _sectionTitle("Highlight Categories"),
          Row(
            children: [
              Expanded(
                child: _highlightCard(
                  title: "Best Performer",
                  name: "Sierra Tel",
                  score: "82%",
                  color: AppColors.successGreen,
                  bg: const Color(0xFFE8F5E9),
                  icon: Icons.emoji_events_rounded,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _highlightCard(
                  title: "Needs Audit",
                  name: "Qcell",
                  score: "65%",
                  color: AppColors.errorRed,
                  bg: const Color(0xFFFEEBEE),
                  icon: Icons.warning_amber_rounded,
                ),
              ),
            ],
          ),
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

  Widget _sectionTitle(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0, left: 4.0),
      child: Text(text, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textSecondary)),
    );
  }

  Widget _tableHeader() {
    return Row(
      children: const [
        SizedBox(width: 40, child: Text("RANK", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textMuted, fontSize: 10))),
        Expanded(child: Text("OPERATOR", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textMuted, fontSize: 10))),
        SizedBox(width: 60, child: Text("SCORE", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textMuted, fontSize: 10))),
        SizedBox(width: 60, child: Text("CHANGE", style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textMuted, fontSize: 10))),
      ],
    );
  }

  Widget _tableRow(String rank, String name, String score, String change, Color opColor) {
    return Row(
      children: [
        SizedBox(
          width: 40,
          child: Text(rank, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
        ),
        Expanded(
          child: Row(
            children: [
              Container(width: 6, height: 6, decoration: BoxDecoration(color: opColor, shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.textPrimary)),
            ],
          ),
        ),
        SizedBox(
          width: 60,
          child: Text(score, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: opColor)),
        ),
        SizedBox(
          width: 60,
          child: Text(change, style: const TextStyle(fontSize: 11, color: AppColors.successGreen, fontWeight: FontWeight.w500)),
        ),
      ],
    );
  }

  Widget _highlightCard({required String title, required String name, required String score, required Color color, required Color bg, required IconData icon}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(title, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 4),
          Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          const SizedBox(height: 2),
          Text("Score: $score", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }
}

class _SpiderRadarPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;

    final linePaint = Paint()
      ..color = AppColors.borderLight
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    // Draw spider track concentric rings
    canvas.drawCircle(center, radius, linePaint);
    canvas.drawCircle(center, radius * 0.6, linePaint);
    canvas.drawCircle(center, radius * 0.3, linePaint);

    // Draw serving radar metrics polygon shape mock
    final radarPaint = Paint()
      ..color = AppColors.accentBlue.withOpacity(0.3)
      ..style = PaintingStyle.fill;

    final radarStroke = Paint()
      ..color = AppColors.accentBlue
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    final path = Path()
      ..moveTo(center.dx, center.dy - radius * 0.8) // Top CDR axis
      ..lineTo(center.dx + radius * 0.7, center.dy - radius * 0.4) // CSSR axis
      ..lineTo(center.dx + radius * 0.6, center.dy + radius * 0.5) // Data Speed axis
      ..lineTo(center.dx, center.dy + radius * 0.3) // Voice QoS axis
      ..lineTo(center.dx - radius * 0.5, center.dy + radius * 0.4) // Coverage axis
      ..close();

    canvas.drawPath(path, radarPaint);
    canvas.drawPath(path, radarStroke);
  }

  @override
  bool shouldRepaint(covariant _SpiderRadarPainter oldDelegate) => false;
}
