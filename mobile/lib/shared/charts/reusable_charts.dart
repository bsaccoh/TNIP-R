import 'dart:math';
import 'package:flutter/material.dart';
import '../../app/theme/app_colors.dart';

// ── 1. SPARKLINE CHART ────────────────────────────────────────────────────
class SparklineChart extends StatelessWidget {
  final List<int> data;
  final Color color;
  final double height;

  const SparklineChart({
    super.key,
    required this.data,
    this.color = AppColors.primaryAccentBlue,
    this.height = 40.0,
  });

  @override
  Widget build(BuildContext context) {
    if (data.length < 2) return SizedBox(height: height);

    return SizedBox(
      height: height,
      width: double.infinity,
      child: CustomPaint(
        painter: _SparklinePainter(data, color),
      ),
    );
  }
}

class _SparklinePainter extends CustomPainter {
  final List<int> data;
  final Color color;

  _SparklinePainter(this.data, this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final maxVal = data.reduce(max);
    final minVal = data.reduce(min);
    final range = maxVal - minVal == 0 ? 1 : maxVal - minVal;

    final paint = Paint()
      ..color = color
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final fillPaint = Paint()
      ..style = PaintingStyle.fill;

    final path = Path();
    final fillPath = Path();

    final stepX = size.width / (data.length - 1);
    
    double getY(int val) {
      final pct = (val - minVal) / range;
      return size.height - (pct * size.height);
    }

    path.moveTo(0, getY(data[0]));
    fillPath.moveTo(0, size.height);
    fillPath.lineTo(0, getY(data[0]));

    for (int i = 1; i < data.length; i++) {
      final x = i * stepX;
      final y = getY(data[i]);
      path.lineTo(x, y);
      fillPath.lineTo(x, y);
    }

    fillPath.lineTo(size.width, size.height);
    fillPath.close();

    // Draw gradient fill
    final shader = LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [color.withOpacity(0.2), color.withOpacity(0.0)],
    ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    fillPaint.shader = shader;
    canvas.drawPath(fillPath, fillPaint);
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _SparklinePainter oldDelegate) =>
      oldDelegate.data != data || oldDelegate.color != color;
}

// ── 2. SPEED DIAL GAUGE ──────────────────────────────────────────────────
class SpeedGaugeWidget extends StatelessWidget {
  final double value;
  final double maxSpeed;
  final String phase;

  const SpeedGaugeWidget({
    super.key,
    required this.value,
    this.maxSpeed = 30.0, // Scale maximum speed gauge indicator dynamically around 30 Mbps for Wi-Fi speed range
    required this.phase,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 220,
          height: 180,
          child: CustomPaint(
            painter: _SpeedGaugePainter(value, maxSpeed, isDark),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(height: 30),
                  Text(
                    value.toStringAsFixed(1),
                    style: TextStyle(
                      fontSize: 44,
                      fontWeight: FontWeight.w800,
                      color: Theme.of(context).textTheme.bodyLarge?.color,
                    ),
                  ),
                  const Text(
                    "MBPS",
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textMuted,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Text(
                      phase.toUpperCase(),
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: phase == 'downloading'
                            ? AppColors.primaryAccentBlue
                            : phase == 'uploading'
                                ? AppColors.purple5G
                                : AppColors.textMuted,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _SpeedGaugePainter extends CustomPainter {
  final double value;
  final double maxSpeed;
  final bool isDark;

  _SpeedGaugePainter(this.value, this.maxSpeed, this.isDark);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * 0.65);
    final radius = min(size.width / 2, size.height) - 15;
    
    // Draw background track arc
    final trackPaint = Paint()
      ..color = isDark ? const Color(0xFF1D2740) : const Color(0xFFE2E8F0)
      ..strokeWidth = 10.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -5 * pi / 4,
      3 * pi / 2,
      false,
      trackPaint,
    );

    // Draw active value fill arc
    final pct = min(1.0, max(0.0, value / maxSpeed));
    final activePaint = Paint()
      ..strokeWidth = 10.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final rect = Rect.fromCircle(center: center, radius: radius);
    final gradient = const LinearGradient(
      colors: [AppColors.primaryAccentBlue, AppColors.tealAccent, AppColors.successGreen],
    ).createShader(rect);
    activePaint.shader = gradient;

    canvas.drawArc(
      rect,
      -5 * pi / 4,
      3 * pi / 2 * pct,
      false,
      activePaint,
    );

    // Draw needle
    final needleAngle = -5 * pi / 4 + (3 * pi / 2 * pct);
    final needlePaint = Paint()
      ..color = isDark ? Colors.white : AppColors.textPrimary
      ..strokeWidth = 3.0
      ..style = PaintingStyle.stroke;

    final needleLength = radius - 12;
    final needleEnd = Offset(
      center.dx + needleLength * cos(needleAngle),
      center.dy + needleLength * sin(needleAngle),
    );

    canvas.drawLine(center, needleEnd, needlePaint);

    // Needle pin center
    final pinPaint = Paint()
      ..color = isDark ? Colors.white : AppColors.textPrimary
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, 6, pinPaint);
    canvas.drawCircle(center, 8, Paint()..color = AppColors.primaryAccentBlue..style = PaintingStyle.stroke..strokeWidth = 2.0);
  }

  @override
  bool shouldRepaint(covariant _SpeedGaugePainter oldDelegate) =>
      oldDelegate.value != value || oldDelegate.maxSpeed != maxSpeed || oldDelegate.isDark != isDark;
}

// ── 3. DONUT CHART ────────────────────────────────────────────────────────
class DonutChart extends StatelessWidget {
  final double val1;
  final String label1;
  final double val2;
  final String label2;

  const DonutChart({
    super.key,
    required this.val1,
    required this.label1,
    required this.val2,
    required this.label2,
  });

  @override
  Widget build(BuildContext context) {
    final sum = val1 + val2 == 0 ? 1.0 : val1 + val2;
    final p1 = val1 / sum * 100;

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        SizedBox(
          width: 90,
          height: 90,
          child: CustomPaint(
            painter: _DonutPainter(val1 / sum),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text("RAT", style: TextStyle(fontSize: 9, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
                  Text("${p1.toStringAsFixed(0)}%", style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textWhite)),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 20),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            _legendRow(AppColors.purple5G, "$label1 (${p1.toStringAsFixed(0)}%)"),
            const SizedBox(height: 8),
            _legendRow(AppColors.primaryAccentBlue, "$label2 (${(100 - p1).toStringAsFixed(0)}%)"),
          ],
        ),
      ],
    );
  }

  Widget _legendRow(Color color, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2)),
        ),
        const SizedBox(width: 8),
        Text(text, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textWhite)),
      ],
    );
  }
}

class _DonutPainter extends CustomPainter {
  final double pct1;

  _DonutPainter(this.pct1);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = min(size.width / 2, size.height / 2) - 8;
    final strokeWidth = 8.0;

    final paint1 = Paint()
      ..color = AppColors.primaryAccentBlue
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke;

    final paint2 = Paint()
      ..color = AppColors.purple5G
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final rect = Rect.fromCircle(center: center, radius: radius);

    // Section 1 background
    canvas.drawArc(rect, -pi / 2, 2 * pi, false, paint1);

    // Section 2 overlay
    canvas.drawArc(rect, -pi / 2, 2 * pi * pct1, false, paint2);
  }

  @override
  bool shouldRepaint(covariant _DonutPainter oldDelegate) =>
      oldDelegate.pct1 != pct1;
}

// ── 4. STACKED BAR CHART ──────────────────────────────────────────────────
class StackedBar extends StatelessWidget {
  final double excellent;
  final double good;
  final double fair;
  final double poor;

  const StackedBar({
    super.key,
    required this.excellent,
    required this.good,
    required this.fair,
    required this.poor,
  });

  @override
  Widget build(BuildContext context) {
    final sum = excellent + good + fair + poor == 0 ? 1.0 : excellent + good + fair + poor;
    final pExc = excellent / sum;
    final pGood = good / sum;
    final pFair = fair / sum;
    final pPoor = poor / sum;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: SizedBox(
            height: 12,
            width: double.infinity,
            child: Row(
              children: [
                if (pExc > 0) Expanded(flex: (pExc * 100).round(), child: Container(color: AppColors.successGreen)),
                if (pGood > 0) Expanded(flex: (pGood * 100).round(), child: Container(color: AppColors.goodGreen)),
                if (pFair > 0) Expanded(flex: (pFair * 100).round(), child: Container(color: AppColors.warningAmber)),
                if (pPoor > 0) Expanded(flex: (pPoor * 100).round(), child: Container(color: AppColors.errorRed)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _legendItem(AppColors.successGreen, "Exc (${(pExc * 100).toStringAsFixed(0)}%)"),
            _legendItem(AppColors.goodGreen, "Good (${(pGood * 100).toStringAsFixed(0)}%)"),
            _legendItem(AppColors.warningAmber, "Fair (${(pFair * 100).toStringAsFixed(0)}%)"),
            _legendItem(AppColors.errorRed, "Poor (${(pPoor * 100).toStringAsFixed(0)}%)"),
          ],
        )
      ],
    );
  }

  Widget _legendItem(Color color, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(text, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
      ],
    );
  }
}
