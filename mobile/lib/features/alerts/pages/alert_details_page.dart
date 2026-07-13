import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class AlertDetailsPage extends StatelessWidget {
  final String alertId;

  const AlertDetailsPage({super.key, required this.alertId});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: "Alert Details",
      subtitle: "Event ID: $alertId",
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Severity Header Card
          Container(
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
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEEBEE),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text("CRITICAL", style: TextStyle(color: AppColors.errorRed, fontSize: 9, fontWeight: FontWeight.bold)),
                    ),
                    const Text("Status: Open", style: TextStyle(color: AppColors.errorRed, fontWeight: FontWeight.bold, fontSize: 12)),
                  ],
                ),
                const SizedBox(height: 10),
                const Text("High Call Drop Rate", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                const SizedBox(height: 6),
                const Text("Detected 10 minutes ago · 11 Jul 2025 09:04", style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 2. Affected area card
          _sectionTitle("Affected Area"),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              children: [
                _detailRow("Operator", "Sierra Tel"),
                _detailRow("Location", "Freetown Area (Western Area)"),
                _detailRow("Coordinates", "8.484, -13.229"),
                const SizedBox(height: 12),
                // Simulated mini map block
                Container(
                  height: 100,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: const Color(0xFFBBDEFB).withOpacity(0.3),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.map_outlined, color: AppColors.lightBlue, size: 24),
                        SizedBox(height: 4),
                        Text("Interactive location thumbnail outline", style: TextStyle(color: AppColors.textSecondary, fontSize: 10)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 3. Technical specifications
          _sectionTitle("Technical Diagnostics"),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              children: [
                _detailRow("KPI Breach Indicator", "Call Drop Rate"),
                _detailRow("Current Measured Value", "8.42%"),
                _detailRow("Regulatory Threshold", "< 2.0%"),
                _detailRow("Duration of Breach", "15 minutes continuous"),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 4. Incident Timeline
          _sectionTitle("Incident Timeline"),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              children: [
                _timelineStep("09:04", "Critical alarm triggered in Western Area cell tower sector SL0012"),
                _timelineStep("09:06", "Automatic regulatory warnings SMS dispatched to Sierra Tel network NOC"),
                _timelineStep("09:09", "Incident acknowledged by operator engineering desks"),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // 5. Actions CTA row
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.borderLight),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text("Escalate", style: TextStyle(color: AppColors.textSecondary)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Acknowledge status saved successfully!")),
                    );
                    Navigator.pop(context);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryBlue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text("Acknowledge"),
                ),
              ),
            ],
          )
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

  Widget _detailRow(String name, String val) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(name, style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
          Text(val, style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _timelineStep(String hour, String desc) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(hour, style: const TextStyle(color: AppColors.accentBlue, fontSize: 11, fontWeight: FontWeight.bold)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(desc, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11, height: 1.3)),
          ),
        ],
      ),
    );
  }
}
