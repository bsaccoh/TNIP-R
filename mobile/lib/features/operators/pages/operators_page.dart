import 'dart:math';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class OperatorsPage extends StatelessWidget {
  const OperatorsPage({super.key});

  final List<Map<String, dynamic>> _operators = const [
    {
      "id": "OP2",
      "name": "Orange Sierra Leone",
      "logoText": "Orange",
      "logoColor": AppColors.orangeOperator,
      "performance": "Good Performance",
      "perfColor": AppColors.successGreen,
      "score": 0.75,
    },
    {
      "id": "OP3",
      "name": "Africell Sierra Leone",
      "logoText": "Africell",
      "logoColor": AppColors.africellPurple,
      "performance": "Fair Performance",
      "perfColor": AppColors.warningAmber,
      "score": 0.72,
    },
    {
      "id": "OP4",
      "name": "Qcell Sierra Leone",
      "logoText": "Qcell",
      "logoColor": AppColors.qcellPurple,
      "performance": "Fair Performance",
      "perfColor": AppColors.warningAmber,
      "score": 0.65,
    },
    {
      "id": "OP1",
      "name": "Sierra Tel",
      "logoText": "Sierra Tel",
      "logoColor": AppColors.sierraTelColor,
      "performance": "Good Performance",
      "perfColor": AppColors.successGreen,
      "score": 0.82,
    },
  ];

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: "Operators",
      subtitle: "National telecommunications providers",
      headerActions: [
        IconButton(icon: const Icon(Icons.search_rounded), onPressed: () {}),
        IconButton(icon: const Icon(Icons.add_rounded), onPressed: () {}),
      ],
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _operators.length,
        itemBuilder: (context, index) {
          final op = _operators[index];
          return GestureDetector(
            onTap: () => context.push('/operators/${op["id"]}'),
            child: Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.cardWhite,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.borderLight),
                boxShadow: const [
                  BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 1)),
                ],
              ),
              child: Row(
                children: [
                  // Operator stylized logo representation
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: op["logoColor"].withOpacity(0.12),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: op["logoColor"].withOpacity(0.3)),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      op["logoText"],
                      style: TextStyle(color: op["logoColor"], fontWeight: FontWeight.bold, fontSize: 10),
                    ),
                  ),
                  const SizedBox(width: 14),
                  // Content
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(op["name"], style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary, fontSize: 14)),
                        const SizedBox(height: 4),
                        Text(op["performance"], style: TextStyle(color: op["perfColor"], fontSize: 12, fontWeight: FontWeight.w500)),
                      ],
                    ),
                  ),
                  // Performance Circular Progress Ring
                  SizedBox(
                    width: 52,
                    height: 52,
                    child: CustomPaint(
                      painter: _PerformanceRingPainter(
                        score: op["score"],
                        color: op["perfColor"],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _PerformanceRingPainter extends CustomPainter {
  final double score; // e.g. 0.82
  final Color color;

  _PerformanceRingPainter({required this.score, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = min(size.width, size.height) / 2 - 4;

    // Track
    final trackPaint = Paint()
      ..color = AppColors.surfaceGray
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4.0;
    canvas.drawCircle(center, radius, trackPaint);

    // Active score indicator arc
    final scorePaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4.0
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -pi / 2,
      2 * pi * score,
      false,
      scorePaint,
    );

    // Score text in center
    final textPainter = TextPainter(
      text: TextSpan(
        text: "${(score * 100).toInt()}%",
        style: const TextStyle(color: AppColors.textPrimary, fontSize: 12, fontWeight: FontWeight.bold),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    textPainter.paint(
      canvas,
      Offset(center.dx - textPainter.width / 2, center.dy - textPainter.height / 2),
    );
  }

  @override
  bool shouldRepaint(covariant _PerformanceRingPainter oldDelegate) => oldDelegate.score != score;
}
