import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      currentTabIndex: 0,
      showHeader: false, // dashboard page has custom top header
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Custom Header Greeting
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text("Welcome back,", style: AppTextStyles.welcomeText),
                    SizedBox(height: 2),
                    Text("Analyst", style: AppTextStyles.userName),
                  ],
                ),
                Row(
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(Icons.calendar_today_rounded, size: 12, color: AppColors.textMuted),
                        SizedBox(width: 4),
                        Text("Today, 11 Jul 2025", style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                      ],
                    ),
                    const SizedBox(width: 12),
                    GestureDetector(
                      onTap: () => context.push('/alerts'),
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: AppColors.cardWhite,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.borderLight),
                        ),
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            const Icon(Icons.notifications_none_rounded, color: AppColors.textPrimary, size: 22),
                            Positioned(
                              top: 10,
                              right: 10,
                              child: Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: AppColors.errorRed,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            )
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),

            // 2. Hero Overall Quality Card
            GestureDetector(
              onTap: () => context.push('/network-quality'),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [AppColors.mediumBlue, AppColors.lightBlue],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.mediumBlue.withOpacity(0.2),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Overall Network Quality",
                      style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            const Text("78%", style: TextStyle(fontSize: 48, fontWeight: FontWeight.w800, color: Colors.white)),
                            const SizedBox(width: 10),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: Colors.white24,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text("Good", style: TextStyle(color: AppColors.goodGreenLight, fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                        // Tiny sparkline painter
                        SizedBox(
                          width: 100,
                          height: 44,
                          child: CustomPaint(
                            painter: _SparklinePainter(),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: const [
                        Icon(Icons.arrow_upward_rounded, color: AppColors.goodGreenLight, size: 14),
                        SizedBox(width: 4),
                        Text(
                          "+ 8% vs yesterday",
                          style: TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // 3. Stats Grid (Responsive 2x2 or 4x1)
            LayoutBuilder(
              builder: (context, constraints) {
                final isTablet = constraints.maxWidth > 600;
                return GridView.count(
                  crossAxisCount: isTablet ? 4 : 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: isTablet ? 1.7 : 1.35,
                  children: [
                    _statsCard(context, Icons.cell_tower_rounded, AppColors.accentBlue, "Operators", "4", "Active", AppColors.successGreen, '/operators'),
                    _statsCard(context, Icons.settings_input_antenna_rounded, AppColors.successGreen, "Sites", "1,248", "Total", AppColors.textMuted, '/sites'),
                    _statsCard(context, Icons.analytics_outlined, AppColors.accentBlue, "Tests", "356", "Today", AppColors.textMuted, '/drive-test'),
                    _statsCard(context, Icons.warning_amber_rounded, AppColors.errorRed, "Alerts", "12", "Critical", AppColors.errorRed, '/alerts'),
                  ],
                );
              },
            ),
            const SizedBox(height: 20),

            // 3.5. Speed Test Quick Launch Banner
            GestureDetector(
              onTap: () => context.push('/tests/speed'),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFFE3F2FD), // light blue accent background
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.accentBlue.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(color: AppColors.accentBlue, shape: BoxShape.circle),
                      child: const Icon(Icons.speed_rounded, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text("Run Speed Test Diagnostics", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                          SizedBox(height: 2),
                          Text("Trigger stand-alone latency & download/upload QoS tests", style: TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: AppColors.accentBlue),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // 4. Bar Chart Section
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.cardWhite,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderLight),
                boxShadow: const [
                  BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text("Network Quality Overview", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                      GestureDetector(
                        onTap: () => context.push('/network-quality'),
                        child: const Text("View all", style: TextStyle(color: AppColors.accentBlue, fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  // Rounded bars painter widget
                  SizedBox(
                    height: 160,
                    width: double.infinity,
                    child: CustomPaint(
                      painter: _QualityBarChartPainter(),
                      child: Container(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Legend below chart
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _operatorLabel(AppColors.sierraTelColor, "Sierra Tel (82%)"),
                      _operatorLabel(AppColors.orangeOperator, "Orange (75%)"),
                      _operatorLabel(AppColors.africellPurple, "Africell (72%)"),
                      _operatorLabel(AppColors.qcellPurple, "Qcell (65%)"),
                    ],
                  )
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _statsCard(BuildContext context, IconData icon, Color iconBgColor, String label, String value, String subLabel, Color subColor, String route) {
    return GestureDetector(
      onTap: () => context.push(route),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.cardWhite,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.borderLight),
          boxShadow: const [
            BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 1)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(color: iconBgColor.withOpacity(0.1), shape: BoxShape.circle),
                  child: Icon(icon, size: 15, color: iconBgColor),
                ),
                const SizedBox(width: 8),
                Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textMuted, fontWeight: FontWeight.w500)),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                Text(subLabel, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: subColor)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _operatorLabel(Color dotColor, String label) {
    return Row(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 9, color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
      ],
    );
  }
}

class _SparklinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.goodGreenLight
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;

    final path = Path()
      ..moveTo(0, size.height * 0.7)
      ..quadraticBezierTo(size.width * 0.25, size.height * 0.8, size.width * 0.4, size.height * 0.4)
      ..quadraticBezierTo(size.width * 0.65, size.height * 0.1, size.width * 0.8, size.height * 0.3)
      ..lineTo(size.width, size.height * 0.1);

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _SparklinePainter oldDelegate) => false;
}

class _QualityBarChartPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = AppColors.borderLight
      ..strokeWidth = 1.0;

    // Draw horizontal grid lines
    for (double y = 0; y <= size.height; y += size.height / 4) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    final List<double> percentages = [0.82, 0.75, 0.72, 0.65];
    final List<Color> colors = [
      AppColors.sierraTelColor,
      AppColors.orangeOperator,
      AppColors.africellPurple,
      AppColors.qcellPurple,
    ];

    double barWidth = 32.0;
    double spacing = (size.width - (barWidth * 4)) / 5;

    for (int i = 0; i < 4; i++) {
      double pct = percentages[i];
      double barHeight = size.height * pct;
      double x = spacing + (i * (barWidth + spacing));
      double y = size.height - barHeight;

      final paint = Paint()
        ..color = colors[i]
        ..style = PaintingStyle.fill;

      // Draw rounded top bar
      final rect = RRect.fromRectAndCorners(
        Rect.fromLTWH(x, y, barWidth, barHeight),
        topLeft: const Radius.circular(6),
        topRight: const Radius.circular(6),
      );
      canvas.drawRRect(rect, paint);

      // Percentage text above bar
      final textPainter = TextPainter(
        text: TextSpan(
          text: "${(pct * 100).toInt()}%",
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 10, fontWeight: FontWeight.bold),
        ),
        textDirection: TextDirection.ltr,
      )..layout();

      textPainter.paint(
        canvas,
        Offset(x + (barWidth - textPainter.width) / 2, y - 14),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _QualityBarChartPainter oldDelegate) => false;
}
