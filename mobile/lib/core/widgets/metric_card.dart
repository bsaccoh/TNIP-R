import 'package:flutter/material.dart';
import '../../app/theme/app_colors.dart';
import '../../app/theme/app_text_styles.dart';
import '../../shared/charts/reusable_charts.dart';
import 'status_pill.dart';

class MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final String? unit;
  final String? caption;
  final List<int>? trend;
  final Color? trendColor;
  final Color? borderAccentColor;
  final VoidCallback? onTap;

  const MetricCard({
    super.key,
    required this.label,
    required this.value,
    this.unit,
    this.caption,
    this.trend,
    this.trendColor,
    this.borderAccentColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.secondaryBackground,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label.toUpperCase(),
              style: AppTextStyles.sectionLabel,
            ),
            const SizedBox(height: 8),
            Row(
              textBaseline: TextBaseline.alphabetic,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              children: [
                Text(
                  value,
                  style: AppTextStyles.cardMetric,
                ),
                if (unit != null) ...[
                  const SizedBox(width: 4),
                  Text(
                    unit!,
                    style: AppTextStyles.unitLabel,
                  ),
                ],
              ],
            ),
            if (caption != null) ...[
              const SizedBox(height: 4),
              Text(
                caption!,
                style: AppTextStyles.tinyCaption,
              ),
            ],
            if (trend != null && trend!.isNotEmpty) ...[
              const SizedBox(height: 12),
              SparklineChart(
                data: trend!,
                color: trendColor ?? AppColors.primaryAccentBlue,
                height: 24,
              ),
            ],
            if (borderAccentColor != null) ...[
              const SizedBox(height: 8),
              Container(
                height: 3,
                width: 40,
                decoration: BoxDecoration(
                  color: borderAccentColor,
                  borderRadius: BorderRadius.circular(99),
                ),
              )
            ]
          ],
        ),
      ),
    );
  }
}
