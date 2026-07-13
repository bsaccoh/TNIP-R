import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../app/providers/state_providers.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../shared/charts/reusable_charts.dart';

class SpeedTestPage extends ConsumerWidget {
  const SpeedTestPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(speedTestProvider);
    final notifier = ref.read(speedTestProvider.notifier);

    return AppScaffold(
      showHeader: true,
      title: "Speed Test",
      subtitle: "Performance Throughput",
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Column(
          children: [
            // Server selector pill
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.language_rounded, size: 14, color: AppColors.primaryAccentBlue),
                  const SizedBox(width: 6),
                  Text(
                    "Auto Server (Freetown)",
                    style: TextStyle(
                      color: Theme.of(context).textTheme.bodyMedium?.color,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Speedometer gauge widget
            Center(
              child: SpeedGaugeWidget(
                value: state.currentSpeed,
                phase: state.phase,
              ),
            ),
            const SizedBox(height: 10),

            // Result cards row (Download, Upload, Ping)
            if (state.phase == "complete" || state.phase == "uploading" || state.phase == "downloading") ...[
              Row(
                children: [
                  Expanded(
                    child: _resultMetricCard(
                      context: context,
                      label: "DOWNLOAD",
                      value: state.downloadResult > 0 ? state.downloadResult.toStringAsFixed(1) : (state.phase == "downloading" ? state.currentSpeed.toStringAsFixed(1) : "0.0"),
                      unit: "Mbps",
                      icon: Icons.download_rounded,
                      iconColor: AppColors.successGreen,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _resultMetricCard(
                      context: context,
                      label: "UPLOAD",
                      value: state.uploadResult > 0 ? state.uploadResult.toStringAsFixed(1) : (state.phase == "uploading" ? state.currentSpeed.toStringAsFixed(1) : "0.0"),
                      unit: "Mbps",
                      icon: Icons.upload_rounded,
                      iconColor: AppColors.primaryAccentBlue,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _resultMetricCard(
                      context: context,
                      label: "PING",
                      value: state.pingResult > 0 ? "${state.pingResult}" : "--",
                      unit: "ms",
                      icon: Icons.network_ping_rounded,
                      iconColor: AppColors.warningAmber,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
            ],

            // Network Info strip
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _infoCol(context, "Carrier", "Orange SL"),
                  _infoCol(context, "Technology", "5G-NSA"),
                  _infoCol(context, "Target Server", "Orange Cache"),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Large circular action button
            GestureDetector(
              onTap: () {
                if (state.isRunning) {
                  notifier.stopTest();
                } else {
                  notifier.startTest();
                }
              },
              child: Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  color: state.isRunning 
                      ? AppColors.errorRed 
                      : (state.phase == "complete" ? AppColors.successGreen : AppColors.primaryAccentBlue),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: (state.isRunning ? AppColors.errorRed : AppColors.primaryAccentBlue).withOpacity(0.35),
                      blurRadius: 16,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: Icon(
                  state.isRunning 
                      ? Icons.stop_rounded 
                      : (state.phase == "complete" ? Icons.replay_rounded : Icons.play_arrow_rounded),
                  color: AppColors.textWhite,
                  size: 32,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              state.isRunning 
                  ? "STOP ACTIVE TEST" 
                  : (state.phase == "complete" ? "TEST COMPLETED (TAP TO RETEST)" : "START QoS THROUGHPUT"),
              style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold, letterSpacing: 0.8),
            ),
          ],
        ),
      ),
    );
  }

  Widget _resultMetricCard({
    required BuildContext context,
    required String label,
    required String value,
    required String unit,
    required IconData icon,
    required Color iconColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: iconColor),
              const SizedBox(width: 4),
              Text(label, style: const TextStyle(fontSize: 9, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            textBaseline: TextBaseline.alphabetic,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            children: [
              Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Theme.of(context).textTheme.bodyLarge?.color)),
              const SizedBox(width: 2),
              Text(unit, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
            ],
          )
        ],
      ),
    );
  }

  Widget _infoCol(BuildContext context, String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 9, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Theme.of(context).textTheme.bodyLarge?.color)),
      ],
    );
  }
}
