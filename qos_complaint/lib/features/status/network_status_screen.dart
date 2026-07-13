import 'dart:math';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';
import '../../core/models/app_models.dart';

class NetworkStatusScreen extends StatelessWidget {
  const NetworkStatusScreen({super.key});

  final List<OperatorScore> _operators = const [
    OperatorScore(name: "Orange", score: 3.1, quality: "Fair", color: Color(0xFFF5A623)),
    OperatorScore(name: "Sierra Tel", score: 2.8, quality: "Fair", color: Color(0xFF1A3C8F)),
    OperatorScore(name: "Qcell", score: 2.7, quality: "Poor", color: Color(0xFFE53935)),
    OperatorScore(name: "Africell", score: 2.6, quality: "Poor", color: Color(0xFF7B1FA2)),
  ];

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
        title: Text("Network Status", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Overall Quality Card
            _buildOverallCard(),
            const SizedBox(height: 24),

            // 2. By Operator Header
            Text("By Operator", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),

            // Operator cards list
            Column(
              children: _operators.map((op) => _buildOperatorCard(op)).toList(),
            ),
            const SizedBox(height: 24),

            // 3. Data Source Note Card
            _buildDataSourceCard(context),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildOverallCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.dynamicCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.dynamicBorder),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2)),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Overall Network Quality", style: AppTextStyles.small.copyWith(color: AppColors.textLight)),
                const SizedBox(height: 4),
                Text(
                  "Fair",
                  style: AppTextStyles.h3.copyWith(color: AppColors.warningOrange, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  "2.9 / 5",
                  style: AppTextStyles.h1.copyWith(fontSize: 40, fontWeight: FontWeight.bold, height: 1.0),
                ),
                const SizedBox(height: 2),
                Text("Avg. Quality Score", style: AppTextStyles.micro.copyWith(color: AppColors.textLight)),
              ],
            ),
          ),
          SizedBox(
            width: 150,
            height: 70,
            child: CustomPaint(
              painter: _FilledSparklinePainter(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOperatorCard(OperatorScore op) {
    final badgeColor = op.quality == "Fair" ? AppColors.warningOrange : AppColors.errorRed;
    final badgeBG = op.quality == "Fair" ? AppColors.orangeLightBG : AppColors.redLightBG;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.dynamicCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.dynamicBorder),
      ),
      child: Row(
        children: [
          // Logo circle
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: op.color.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(
              op.name.substring(0, 1),
              style: TextStyle(color: op.color, fontWeight: FontWeight.bold, fontSize: 14),
            ),
          ),
          const SizedBox(width: 12),
          // Operator Name
          Expanded(
            child: Text(
              op.name,
              style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold),
            ),
          ),
          // Score details
          Text(
            "${op.score} / 5",
            style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: badgeBG,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              op.quality,
              style: AppTextStyles.micro.copyWith(
                color: badgeColor,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: 8),
          const Icon(Icons.chevron_right_rounded, color: AppColors.textLight, size: 18),
        ],
      ),
    );
  }

  Widget _buildDataSourceCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.isDark ? const Color(0xFF2C2C2C) : const Color(0xFFF5F7FA),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline_rounded, size: 20, color: AppColors.textSecondary),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Data from user reports in your area",
                  style: AppTextStyles.small.copyWith(fontWeight: FontWeight.bold, color: AppColors.dynamicTextPrimary),
                ),
                const SizedBox(height: 2),
                Text(
                  "Help us improve accuracy by reporting issues.",
                  style: AppTextStyles.small.copyWith(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 10),
                GestureDetector(
                  onTap: () => context.push('/report'),
                  child: Text(
                    "Report an Issue",
                    style: AppTextStyles.small.copyWith(color: AppColors.primaryBlue, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FilledSparklinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final linePaint = Paint()
      ..color = AppColors.warningOrange
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;

    final fillPaint = Paint()
      ..color = AppColors.warningOrange.withOpacity(0.15)
      ..style = PaintingStyle.fill;

    final path = Path();
    final points = [
      Offset(0, size.height * 0.75),
      Offset(size.width * 0.15, size.height * 0.45),
      Offset(size.width * 0.3, size.height * 0.65),
      Offset(size.width * 0.45, size.height * 0.35),
      Offset(size.width * 0.6, size.height * 0.55),
      Offset(size.width * 0.75, size.height * 0.25),
      Offset(size.width * 0.9, size.height * 0.45),
      Offset(size.width, size.height * 0.4),
    ];

    path.moveTo(points[0].dx, points[0].dy);
    for (int i = 0; i < points.length - 1; i++) {
      final xc = (points[i].dx + points[i + 1].dx) / 2;
      final yc = (points[i].dy + points[i + 1].dy) / 2;
      path.quadraticBezierTo(points[i].dx, points[i].dy, xc, yc);
    }
    path.lineTo(points.last.dx, points.last.dy);

    // Create fill path
    final fillPath = Path.from(path);
    fillPath.lineTo(size.width, size.height);
    fillPath.lineTo(0, size.height);
    fillPath.close();

    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, linePaint);

    // Draw peak point dot
    canvas.drawCircle(points[5], 4.5, Paint()..color = AppColors.warningOrange..style = PaintingStyle.fill);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
