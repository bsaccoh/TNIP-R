import 'package:flutter/material.dart';
import '../../app/theme/app_colors.dart';

class StatusPill extends StatelessWidget {
  final String status;

  const StatusPill({
    super.key,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    final String label = status.toUpperCase();
    final Color textColor;
    final Color bgColor;

    switch (status.toLowerCase()) {
      case 'excellent':
        textColor = AppColors.successGreen;
        bgColor = AppColors.excellentBg;
        break;
      case 'good':
        textColor = AppColors.goodGreen;
        bgColor = AppColors.goodBg;
        break;
      case 'fair':
        textColor = AppColors.warningAmber;
        bgColor = AppColors.fairBg;
        break;
      case 'poor':
      default:
        textColor = AppColors.errorRed;
        bgColor = AppColors.poorBg;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: textColor.withOpacity(0.3), width: 1),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: textColor,
          fontSize: 10,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.6,
        ),
      ),
    );
  }
}
