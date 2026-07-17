import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';

class KnowledgeBaseScreen extends StatelessWidget {
  const KnowledgeBaseScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      appBar: AppBar(
        backgroundColor: AppColors.dynamicBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.textPrimary, size: 20),
          onPressed: () => context.pop(),
        ),
        title: Text("Consumer Rights", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildInfoCard(
            "Your Rights as a Telecom Consumer",
            "As a mobile subscriber in Sierra Leone, you have rights protected by the National Telecommunications Commission (NatCA).",
          ),
          const SizedBox(height: 20),
          _buildFaqSection(
            "Billing & Tariffs",
            "What are the maximum tariff caps?",
            "NatCA regulates the maximum price operators can charge for voice calls and SMS. Operators cannot exceed these ceiling tariffs without regulatory approval.",
          ),
          _buildFaqSection(
            "SIM Registration",
            "Why must I register my SIM?",
            "It is a legal requirement to register your SIM card using a valid national ID. This helps prevent fraud and secures your mobile money transactions.",
          ),
          _buildFaqSection(
            "Quality of Service (QoS)",
            "What if my internet is always slow?",
            "Operators are required to maintain minimum quality standards. Use the Speed Test feature in this app to log evidence, and report persistent issues through the 'Report Issue' tab.",
          ),
          _buildFaqSection(
            "Complaint Escalation",
            "How do I escalate an unresolved issue?",
            "First, report the issue to your operator. If it is not resolved within the expected timeframe (usually 48 hours for billing issues), you can escalate it directly to NatCA using this application.",
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard(String title, String description) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.primaryBlue.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primaryBlue.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.gavel_rounded, color: AppColors.primaryBlue, size: 24),
              const SizedBox(width: 8),
              Expanded(child: Text(title, style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold, color: AppColors.primaryBlue))),
            ],
          ),
          const SizedBox(height: 8),
          Text(description, style: AppTextStyles.small.copyWith(color: AppColors.textPrimary)),
        ],
      ),
    );
  }

  Widget _buildFaqSection(String category, String question, String answer) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.dynamicCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.dynamicBorder),
      ),
      child: Theme(
        data: ThemeData(dividerColor: Colors.transparent),
        child: ExpansionTile(
          title: Text(question, style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600)),
          subtitle: Text(category, style: AppTextStyles.micro.copyWith(color: AppColors.primaryBlue)),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          children: [
            Text(answer, style: AppTextStyles.small.copyWith(height: 1.5)),
          ],
        ),
      ),
    );
  }
}
