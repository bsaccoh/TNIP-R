import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../shared/charts/reusable_charts.dart';

class PingDetailsPage extends StatelessWidget {
  const PingDetailsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: "Ping Details",
      subtitle: "ICMP Latency Diagnostics",
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Column(
          children: [
            // Large ping metric hero
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 24),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.border),
              ),
              child: const Column(
                children: [
                  Text("CURRENT PING", style: TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
                  SizedBox(height: 6),
                  Text("29 ms", style: TextStyle(fontSize: 52, fontWeight: FontWeight.w800, color: AppColors.primaryAccentBlue)),
                  SizedBox(height: 4),
                  Text("±3 ms JITTER • 0% PACKET LOSS", style: TextStyle(fontSize: 10, color: AppColors.successGreen, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Latency stats grid
            GridView.count(
              crossAxisCount: 3,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 1.3,
              children: [
                _statBox("MINIMUM", "18 ms"),
                _statBox("MAXIMUM", "67 ms"),
                _statBox("AVERAGE", "31 ms"),
              ],
            ),
            const SizedBox(height: 24),

            // Live Latency trend chart
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("LATENCY OVER TIME", style: AppTextStyles.sectionLabel),
                  const SizedBox(height: 16),
                  const SparklineChart(
                    data: [29, 32, 28, 30, 24, 67, 31, 29, 28, 30, 25, 29],
                    color: AppColors.primaryAccentBlue,
                    height: 80,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Target config details card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  _configRow("Host target", "google.com"),
                  _configRow("Packet payload size", "32 bytes"),
                  _configRow("Ping Interval rate", "1000 ms"),
                  _configRow("Resolve address", "142.250.190.46"),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _statBox(String label, String value) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.secondaryBackground,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label, style: const TextStyle(fontSize: 8, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textWhite)),
        ],
      ),
    );
  }

  Widget _configRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          Text(value, style: const TextStyle(color: AppColors.textWhite, fontSize: 12, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
