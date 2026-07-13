import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class FieldInspectionPage extends StatefulWidget {
  const FieldInspectionPage({super.key});

  @override
  State<FieldInspectionPage> createState() => _FieldInspectionPageState();
}

class _FieldInspectionPageState extends State<FieldInspectionPage> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: "Field Inspection",
      subtitle: "Regulatory physical tower site audit logs",
      headerActions: [
        IconButton(
          icon: const Icon(Icons.add_rounded, color: AppColors.textPrimary),
          onPressed: () {},
        ),
      ],
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Active banner card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFE3F2FD),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.accentBlue),
            ),
            child: Row(
              children: [
                ScaleTransition(
                  scale: Tween<double>(begin: 0.8, end: 1.2).animate(
                    CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
                  ),
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(color: AppColors.errorRed, shape: BoxShape.circle),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text("Inspection in Progress", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primaryBlue)),
                      SizedBox(height: 2),
                      Text("Site ID: SL001245 · Freetown Area", style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                    ],
                  ),
                ),
                const Text("Continue →", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.accentBlue)),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 2. Scheduled inspections list
          _sectionTitle("Scheduled Inspections"),
          _scheduledCard("SL002842", "Bo City, Southern Province", "Orange", AppColors.orangeOperator, "Analyst B", "8/12 items verified", 0.66),
          _scheduledCard("SL003498", "Makeni, Northern Province", "Africell", AppColors.africellPurple, "Analyst C", "4/12 items verified", 0.33),
          const SizedBox(height: 20),

          // 3. Completed inspections list
          _sectionTitle("Recent Completed Inspections"),
          _completedCard("SL004112", "Kenema, Eastern Province", "Qcell", AppColors.qcellPurple, "92% Compliance score", "View Report"),
        ],
      ),
    );
  }

  Widget _sectionTitle(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0, left: 4.0),
      child: Text(text, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textSecondary)),
    );
  }

  Widget _scheduledCard(String id, String loc, String op, Color opColor, String analyst, String progressText, double progressValue) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Site ID: $id", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: opColor.withOpacity(0.12), borderRadius: BorderRadius.circular(4)),
                child: Text(op, style: TextStyle(color: opColor, fontSize: 8, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(loc, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
          Text("Assigned: $analyst", style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: LinearProgressIndicator(
                    value: progressValue,
                    minHeight: 6,
                    backgroundColor: AppColors.surfaceGray,
                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.accentBlue),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(progressText, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _completedCard(String id, String loc, String op, Color opColor, String scoreText, String actionLabel) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text("Site ID: $id", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(color: opColor.withOpacity(0.12), borderRadius: BorderRadius.circular(4)),
                    child: Text(op, style: TextStyle(color: opColor, fontSize: 8, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(loc, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
              const SizedBox(height: 2),
              Text(scoreText, style: const TextStyle(fontSize: 10, color: AppColors.successGreen, fontWeight: FontWeight.bold)),
            ],
          ),
          Text(actionLabel, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.accentBlue)),
        ],
      ),
    );
  }
}
