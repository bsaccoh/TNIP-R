import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class RegionalAnalysisPage extends StatefulWidget {
  const RegionalAnalysisPage({super.key});

  @override
  State<RegionalAnalysisPage> createState() => _RegionalAnalysisPageState();
}

class _RegionalAnalysisPageState extends State<RegionalAnalysisPage> {
  String _activeRegion = "All Regions";

  final List<Map<String, dynamic>> _regions = const [
    {"name": "Western Area", "score": 0.82, "color": AppColors.successGreen, "ops": "4 operators", "sites": "342 sites"},
    {"name": "Southern Province", "score": 0.78, "color": AppColors.successGreen, "ops": "3 operators", "sites": "276 sites"},
    {"name": "Northern Province", "score": 0.71, "color": AppColors.warningAmber, "ops": "3 operators", "sites": "298 sites"},
    {"name": "Eastern Province", "score": 0.58, "color": AppColors.errorRed, "ops": "2 operators", "sites": "332 sites"},
  ];

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: "Regional Analysis",
      subtitle: "Sierra Leone geographical QoS breakdown",
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Selector
          _buildSelector(),
          const SizedBox(height: 16),

          // 2. Map Canvas area
          _sectionTitle("Geographical Quality Map"),
          Container(
            height: 180,
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            padding: const EdgeInsets.all(12),
            child: CustomPaint(
              painter: _SierraLeoneMiniMapPainter(),
            ),
          ),
          const SizedBox(height: 20),

          // 3. Region cards
          _sectionTitle("Performance Index by Province"),
          Column(
            children: _regions.map((r) => _regionCard(r)).toList(),
          ),
          const SizedBox(height: 20),

          // 4. Comparison Chart
          _sectionTitle("Region Comparison Index"),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              children: _regions.map((r) => _barChartRow(r)).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSelector() {
    final pills = ["All Regions", "Western Area", "Northern", "Southern", "Eastern"];
    return SizedBox(
      height: 38,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: pills.map((pill) {
          final active = pill == _activeRegion;
          return GestureDetector(
            onTap: () => setState(() => _activeRegion = pill),
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: active ? AppColors.primaryBlue : Colors.transparent,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: active ? AppColors.primaryBlue : AppColors.borderLight),
              ),
              alignment: Alignment.center,
              child: Text(
                pill,
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: active ? Colors.white : AppColors.textSecondary),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _sectionTitle(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0, left: 4.0),
      child: Text(text, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textSecondary)),
    );
  }

  Widget _regionCard(Map<String, dynamic> r) {
    final color = r["color"] as Color;
    final score = r["score"] as double;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
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
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(r["name"] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                  const SizedBox(height: 2),
                  Text("${r["ops"]} · ${r["sites"]}", style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
                ],
              ),
            ],
          ),
          Row(
            children: [
              Text("${(score * 100).toInt()}%", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: color)),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(4)),
                child: Text(score >= 0.75 ? "Good" : score >= 0.65 ? "Fair" : "Poor", style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _barChartRow(Map<String, dynamic> r) {
    final color = r["color"] as Color;
    final score = r["score"] as double;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(r["name"] as String, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
              Text("${(score * 100).toInt()}%", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: score,
              minHeight: 6,
              backgroundColor: AppColors.surfaceGray,
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
        ],
      ),
    );
  }
}

class _SierraLeoneMiniMapPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Fills simulated regional shapes
    final pGood = Paint()..color = AppColors.successGreen.withOpacity(0.4);
    final pFair = Paint()..color = AppColors.warningAmber.withOpacity(0.4);
    final pPoor = Paint()..color = AppColors.errorRed.withOpacity(0.4);

    final borderPaint = Paint()
      ..color = AppColors.borderLight
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    // Draw 4 squares representing provinces mock-up
    final double w = size.width / 2.2;
    final double h = size.height / 2.2;

    // Western Area
    canvas.drawRect(Rect.fromLTWH(8, 8, w, h), pGood);
    canvas.drawRect(Rect.fromLTWH(8, 8, w, h), borderPaint);

    // Northern
    canvas.drawRect(Rect.fromLTWH(w + 16, 8, w, h), pFair);
    canvas.drawRect(Rect.fromLTWH(w + 16, 8, w, h), borderPaint);

    // Southern
    canvas.drawRect(Rect.fromLTWH(8, h + 16, w, h), pGood);
    canvas.drawRect(Rect.fromLTWH(8, h + 16, w, h), borderPaint);

    // Eastern
    canvas.drawRect(Rect.fromLTWH(w + 16, h + 16, w, h), pPoor);
    canvas.drawRect(Rect.fromLTWH(w + 16, h + 16, w, h), borderPaint);
  }

  @override
  bool shouldRepaint(covariant _SierraLeoneMiniMapPainter oldDelegate) => false;
}
