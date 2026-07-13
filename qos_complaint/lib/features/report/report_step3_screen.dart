import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';
import '../../app/providers/state_providers.dart';

class ReportStep3Screen extends ConsumerWidget {
  const ReportStep3Screen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final draft = ref.watch(draftReportProvider);

    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      appBar: AppBar(
        backgroundColor: AppColors.dynamicBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
        title: Text("Review & Submit", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Step progress indicator
          const SizedBox(height: 10),
          _buildProgressIndicator(),
          const SizedBox(height: 16),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Issue Details Card
                  _buildDetailsCard(draft),
                  const SizedBox(height: 24),

                  // 2. Attachments Card
                  if (draft.attachments.isNotEmpty) ...[
                    Text("Attachments", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    _buildAttachmentsRow(draft.attachments),
                    const SizedBox(height: 24),
                  ],
                ],
              ),
            ),
          ),

          // Bottom Submit CTA Button
          _buildBottomCTA(context, ref, draft),
        ],
      ),
    );
  }

  Widget _buildProgressIndicator() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.textLight, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.textLight, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Container(width: 16, height: 8, decoration: BoxDecoration(color: AppColors.primaryBlue, borderRadius: BorderRadius.circular(4))),
      ],
    );
  }

  Widget _buildDetailsCard(DraftReport draft) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.dynamicCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.dynamicBorder),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Issue Details", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          _detailRow("Issue Type", draft.issueType),
          const Divider(height: 20, color: AppColors.border),

          _detailRow("Operator", draft.operatorName),
          const Divider(height: 20, color: AppColors.border),

          _detailRow("Location", "${draft.areaDetail}, ${draft.district}"),
          const Divider(height: 20, color: AppColors.border),

          _detailRow("Description", draft.description.isNotEmpty ? draft.description : "No description provided."),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTextStyles.small.copyWith(color: AppColors.textLight)),
        const SizedBox(height: 3),
        Text(
          value,
          style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600, color: AppColors.dynamicTextPrimary),
        ),
      ],
    );
  }

  Widget _buildAttachmentsRow(List<String> attachments) {
    return Row(
      children: List.generate(attachments.length > 3 ? 3 : attachments.length, (index) {
        final isLast = index == 2 && attachments.length > 3;
        return Expanded(
          child: Container(
            height: 80,
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              color: AppColors.dynamicBorder,
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: isLast
                ? Stack(
                    fit: StackFit.expand,
                    children: [
                      Container(
                        color: Colors.black.withOpacity(0.55),
                        alignment: Alignment.center,
                        child: Text(
                          "+${attachments.length - 2}",
                          style: AppTextStyles.h3.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  )
                : const Icon(Icons.insert_drive_file_outlined, color: AppColors.textSecondary),
          ),
        );
      }),
    );
  }

  Widget _buildBottomCTA(BuildContext context, WidgetRef ref, DraftReport draft) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      decoration: BoxDecoration(
        color: AppColors.dynamicCard,
        border: Border(top: BorderSide(color: AppColors.dynamicBorder)),
      ),
      child: SizedBox(
        width: double.infinity,
        height: 52,
        child: ElevatedButton(
          onPressed: () async {
            // Submit complaint to database/API
            await ref.read(complaintsProvider.notifier).submitNewComplaint(draft);
            
            // Clear current draft state
            ref.read(draftReportProvider.notifier).reset();

            // Notify user and pop back to dashboard with the complaints tab active
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text("Complaint submitted successfully and syncing..."),
                backgroundColor: AppColors.successGreen,
              ),
            );

            // Pop report flow screens back to index/dashboard page
            context.go('/dashboard?tab=3');
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryBlue,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(26),
            ),
            elevation: 4,
            shadowColor: AppColors.primaryBlue.withOpacity(0.3),
          ),
          child: Text(
            "Submit Complaint",
            style: AppTextStyles.body.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
        ),
      ),
    );
  }
}
