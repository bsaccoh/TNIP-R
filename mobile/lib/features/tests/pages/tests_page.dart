import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../app/providers/state_providers.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../shared/charts/reusable_charts.dart';

class TestsPage extends ConsumerWidget {
  const TestsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(dashboardProvider);
    final speedState = ref.watch(speedTestProvider);

    return AppScaffold(
      currentTabIndex: 3,
      showHeader: true,
      title: "Active Tests",
      subtitle: "QoS · QoE Suite Running",
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          children: [
            // Row for Ping Card and Download Card
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Ping Card
                Expanded(
                  child: GestureDetector(
                    onTap: () => context.push('/tests/ping'),
                    child: Container(
                      height: 155,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.secondaryBackground,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text("PING", style: AppTextStyles.sectionLabel),
                              Container(
                                width: 6,
                                height: 6,
                                decoration: const BoxDecoration(color: AppColors.successGreen, shape: BoxShape.circle),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            textBaseline: TextBaseline.alphabetic,
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            children: [
                              Text("${state.liveMetric.ping}", style: AppTextStyles.largeMetric),
                              const SizedBox(width: 4),
                              const Text("ms", style: AppTextStyles.unitLabel),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.fairBg,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: const Text("±3ms Jitter", style: TextStyle(color: AppColors.warningAmber, fontSize: 9, fontWeight: FontWeight.bold)),
                          ),
                          const Spacer(),
                          const SparklineChart(
                            data: [25, 29, 24, 28, 26, 31, 28, 29],
                            color: AppColors.successGreen,
                            height: 25,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                
                // Download Card
                Expanded(
                  child: GestureDetector(
                    onTap: () => context.push('/tests/speed'),
                    child: Container(
                      height: 155,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.secondaryBackground,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text("DOWNLOAD", style: AppTextStyles.sectionLabel),
                              Container(
                                width: 6,
                                height: 6,
                                decoration: const BoxDecoration(color: AppColors.successGreen, shape: BoxShape.circle),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          // Custom semi-circular gauge arc representation
                          Center(
                            child: SizedBox(
                              width: 80,
                              height: 42,
                              child: CustomPaint(
                                painter: _MiniGaugePainter(),
                              ),
                            ),
                          ),
                          const Spacer(),
                          Row(
                            textBaseline: TextBaseline.alphabetic,
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                speedState.downloadResult > 0 
                                    ? speedState.downloadResult.toStringAsFixed(0) 
                                    : "${state.liveMetric.speed.toStringAsFixed(0)}", 
                                style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.textWhite),
                              ),
                              const SizedBox(width: 2),
                              const Text("Mbps", style: AppTextStyles.unitLabel),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Web Load Card
            GestureDetector(
              onTap: () => context.push('/tests/webload'),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.secondaryBackground,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("WEB LOAD", style: AppTextStyles.sectionLabel),
                        const Text("1.24s total", style: TextStyle(color: AppColors.textWhite, fontSize: 13, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 14),
                    // Segmented waterfall bar
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: SizedBox(
                        height: 8,
                        child: Row(
                          children: [
                            Expanded(flex: 12, child: Container(color: AppColors.purple5G)), // DNS
                            Expanded(flex: 18, child: Container(color: AppColors.primaryAccentBlue)), // TCP
                            Expanded(flex: 22, child: Container(color: AppColors.tealAccent)), // TLS
                            Expanded(flex: 38, child: Container(color: AppColors.successGreen)), // TTFB
                            Expanded(flex: 34, child: Container(color: AppColors.warningAmber)), // Load
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: const [
                        Text("DNS", style: AppTextStyles.tinyCaption),
                        Text("TCP", style: AppTextStyles.tinyCaption),
                        Text("TLS", style: AppTextStyles.tinyCaption),
                        Text("TTFB", style: AppTextStyles.tinyCaption),
                        Text("Load", style: AppTextStyles.tinyCaption),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Video Stream Card
            GestureDetector(
              onTap: () => context.push('/tests/video'),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.secondaryBackground,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("VIDEO STREAM", style: AppTextStyles.sectionLabel),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.excellentBg,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text("1080P HD", style: TextStyle(color: AppColors.successGreen, fontSize: 10, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    // Video stream vertical bars representation
                    SizedBox(
                      height: 45,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          _videoBar(24), _videoBar(32), _videoBar(36), _videoBar(28),
                          _videoBar(42), _videoBar(45), _videoBar(38), _videoBar(42),
                          _videoBar(40), _videoBar(42), _videoBar(45), _videoBar(45),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Stats row below bars
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _videoStat("BUFFER", "0.2s"),
                        _videoStat("BITRATE", "4.2 Mbps"),
                        _videoStat("STALLS", "0", AppColors.successGreen),
                        _videoStat("CODEC", "H.264"),
                      ],
                    )
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _videoBar(double h) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 2),
        height: h,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(2),
          gradient: const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.primaryAccentBlue, Color(0xFF1D4ED8)],
          ),
        ),
      ),
    );
  }

  Widget _videoStat(String label, String value, [Color? color]) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 9, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color ?? AppColors.textWhite)),
      ],
    );
  }
}

class _MiniGaugePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height);
    final radius = size.width / 2 - 4;
    
    final pTrack = Paint()
      ..color = AppColors.border
      ..strokeWidth = 5.0
      ..style = PaintingStyle.stroke;

    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), -pi, pi, false, pTrack);

    final pFill = Paint()
      ..color = AppColors.successGreen
      ..strokeWidth = 5.0
      ..style = PaintingStyle.stroke;

    canvas.drawArc(Rect.fromCircle(center: center, radius: radius), -pi, pi * 0.72, false, pFill);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
