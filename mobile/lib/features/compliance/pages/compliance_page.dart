import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class CompliancePage extends StatelessWidget {
  const CompliancePage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: "Compliance",
      subtitle: "Regulatory framework standards compliance tracker",
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Overview Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1565C0), Color(0xFF1E88E5)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("OVERALL COMPLIANCE SCORE", style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.8)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: Colors.amber.shade700, borderRadius: BorderRadius.circular(6)),
                      child: const Text("Fair Status", style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Text("72%", style: TextStyle(fontSize: 42, fontWeight: FontWeight.bold, color: Colors.white)),
                const SizedBox(height: 10),
                const Text("Q2 2025 · 3 active compliance violations detected", style: TextStyle(color: Colors.white70, fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 2. Operator compliance levels
          _sectionTitle("Compliance by Operator"),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              children: [
                _operatorCompliance("Sierra Tel", 0.85, AppColors.sierraTelColor, "Compliant", AppColors.successGreen),
                const Divider(color: AppColors.borderLight, height: 24),
                _operatorCompliance("Orange", 0.78, AppColors.orangeOperator, "At Risk", AppColors.warningAmber),
                const Divider(color: AppColors.borderLight, height: 24),
                _operatorCompliance("Africell", 0.72, AppColors.africellPurple, "At Risk", AppColors.warningAmber),
                const Divider(color: AppColors.borderLight, height: 24),
                _operatorCompliance("Qcell", 0.61, AppColors.qcellPurple, "Non-Compliant", AppColors.errorRed),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 3. Active Violations
          _sectionTitle("Active Violations"),
          _violationCard("Call Drop Rate Exceeded", "Qcell Sierra Leone", "CDR Measured: 3.18% (Target: < 2.0%)", "12 days open", AppColors.errorRed),
          _violationCard("High Latency Threshold Breach", "Africell", "RTT Latency: 185ms (Target: < 150ms)", "5 days open", AppColors.warningAmber),
          const SizedBox(height: 20),

          // 4. Deadlines Timeline
          _sectionTitle("Upcoming Regulatory Deadlines"),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              children: [
                _deadlineRow("Q2 KPI Report Submission", "5 days remaining", AppColors.errorRed),
                const Divider(color: AppColors.borderLight, height: 20),
                _deadlineRow("Freetown Cellular Coverage Audit", "18 days remaining", AppColors.warningAmber),
                const Divider(color: AppColors.borderLight, height: 20),
                _deadlineRow("Annual QoS Obligation Meeting", "25 days remaining", AppColors.successGreen),
              ],
            ),
          ),
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

  Widget _operatorCompliance(String name, double val, Color color, String status, Color statusColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(color: statusColor.withOpacity(0.12), borderRadius: BorderRadius.circular(4)),
              child: Text(status, style: TextStyle(color: statusColor, fontSize: 9, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(3),
                child: LinearProgressIndicator(
                  value: val,
                  minHeight: 6,
                  backgroundColor: AppColors.surfaceGray,
                  valueColor: AlwaysStoppedAnimation<Color>(color),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Text("${(val * 100).toInt()}%", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: color)),
          ],
        ),
      ],
    );
  }

  Widget _violationCard(String title, String operator, String desc, String time, Color severityColor) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.cardWhite,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 1)),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: severityColor.withOpacity(0.12), shape: BoxShape.circle),
            child: Icon(Icons.warning_amber_rounded, color: severityColor, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                const SizedBox(height: 2),
                Text(operator, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
                const SizedBox(height: 4),
                Text(desc, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
              ],
            ),
          ),
          Text(time, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _deadlineRow(String title, String remain, Color labelColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
        ),
        Text(remain, style: TextStyle(color: labelColor, fontSize: 11, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
