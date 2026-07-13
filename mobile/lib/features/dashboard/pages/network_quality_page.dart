import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class NetworkQualityPage extends StatelessWidget {
  const NetworkQualityPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: "Overall Quality",
      subtitle: "National network performance details",
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Index Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("NATIONAL QUALITY INDEX", style: AppTextStyles.cardTitle),
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: const [
                    Text("78%", style: TextStyle(fontSize: 44, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                    SizedBox(width: 8),
                    Text("Out of 100", style: AppTextStyles.caption),
                  ],
                ),
                const SizedBox(height: 12),
                const Text("This metric is aggregated in real-time from active probe results and network quality tests conducted across Sierra Leone.", style: AppTextStyles.bodyText),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Regional Breakdown
          const Text("Regional Performance", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          const SizedBox(height: 12),
          _regionRow("Western Area (Freetown)", 0.85, AppColors.successGreen),
          _regionRow("Northern Province (Makeni)", 0.76, AppColors.successGreen),
          _regionRow("Southern Province (Bo City)", 0.72, AppColors.warningAmber),
          _regionRow("Eastern Province (Kenema)", 0.64, AppColors.warningAmber),
        ],
      ),
    );
  }

  Widget _regionRow(String name, double pct, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardWhite,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(name, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary, fontSize: 13)),
              Text("${(pct * 100).toInt()}%", style: TextStyle(fontWeight: FontWeight.bold, color: color, fontSize: 13)),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct,
              minHeight: 8,
              backgroundColor: AppColors.surfaceGray,
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
        ],
      ),
    );
  }
}
