import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';
import '../../app/providers/state_providers.dart';

class ReportStep1Screen extends ConsumerStatefulWidget {
  const ReportStep1Screen({super.key});

  @override
  ConsumerState<ReportStep1Screen> createState() => _ReportStep1ScreenState();
}

class _ReportStep1ScreenState extends ConsumerState<ReportStep1Screen> {
  final TextEditingController _explainController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final draft = ref.read(draftReportProvider);
      _explainController.text = draft.description;
    });
  }

  @override
  void dispose() {
    _explainController.dispose();
    super.dispose();
  }

  final List<Map<String, dynamic>> _issueTypes = [
    {"label": "No Signal", "icon": Icons.signal_cellular_connected_no_internet_0_bar_rounded},
    {"label": "Call Drops", "icon": Icons.phone_missed_rounded},
    {"label": "Slow Internet", "icon": Icons.speed_rounded},
    {"label": "No Internet", "icon": Icons.wifi_off_rounded},
    {"label": "SMS Not Sending", "icon": Icons.sms_failed_rounded},
    {"label": "Billing Dispute", "icon": Icons.receipt_long_rounded},
    {"label": "Mobile Money", "icon": Icons.account_balance_wallet_rounded},
    {"label": "Other Issue", "icon": Icons.more_horiz_rounded},
  ];

  final List<Map<String, dynamic>> _operators = [
    {"id": 3, "name": "Africell", "color": Color(0xFF7B1FA2), "logo": "A"},
    {"id": 2, "name": "Orange", "color": Color(0xFFF5A623), "logo": "O"},
    {"id": 1, "name": "Sierra Tel", "color": Color(0xFF1A3C8F), "logo": "S"},
    {"id": 4, "name": "Qcell", "color": Color(0xFFE53935), "logo": "Q"},
  ];

  @override
  Widget build(BuildContext context) {
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
        title: Text("Report an Issue", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Progress Dot Indicator
          const SizedBox(height: 10),
          _buildProgressIndicator(),
          const SizedBox(height: 16),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Issue Type Section
                  Text("What type of issue are you facing?", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                      mainAxisExtent: 90,
                    ),
                    itemCount: _issueTypes.length,
                    itemBuilder: (context, index) {
                      final item = _issueTypes[index];
                      final isSelected = draft.issueType == item['label'];
                      return GestureDetector(
                        onTap: () {
                          ref.read(draftReportProvider.notifier).updateIssueType(item['label']);
                        },
                        child: Container(
                          decoration: BoxDecoration(
                            color: isSelected ? AppColors.blueLightBG : AppColors.dynamicCard,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isSelected ? AppColors.primaryBlue : AppColors.dynamicBorder,
                              width: 1.5,
                            ),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                item['icon'],
                                size: 28,
                                color: isSelected ? AppColors.primaryBlue : AppColors.textSecondary,
                              ),
                              const SizedBox(height: 6),
                              Text(
                                item['label'],
                                style: AppTextStyles.micro.copyWith(
                                  color: isSelected ? AppColors.primaryBlue : AppColors.textSecondary,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 24),

                  // 2. Select Operator
                  Text("Select Operator (Optional)", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 38,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _operators.length,
                      itemBuilder: (context, index) {
                        final op = _operators[index];
                        final isSelected = draft.operatorId == op['id'];
                        final Color opColor = op['color'];

                        return GestureDetector(
                          onTap: () {
                            ref.read(draftReportProvider.notifier).updateOperator(op['id'], op['name']);
                          },
                          child: Container(
                            margin: const EdgeInsets.only(right: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            decoration: BoxDecoration(
                              color: isSelected ? opColor.withOpacity(0.15) : AppColors.dynamicCard,
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                color: opColor.withOpacity(isSelected ? 0.8 : 0.3),
                                width: 1.5,
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 18,
                                  height: 18,
                                  decoration: BoxDecoration(
                                    color: opColor,
                                    shape: BoxShape.circle,
                                  ),
                                  alignment: Alignment.center,
                                  child: Text(
                                    op['logo'],
                                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  op['name'],
                                  style: AppTextStyles.small.copyWith(
                                    color: isSelected ? opColor : AppColors.dynamicTextSecondary,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 24),

                  // 3. Explain the Issue
                  Text("Explain the issue", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.dynamicCard,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.dynamicBorder),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        TextField(
                          controller: _explainController,
                          maxLines: 4,
                          maxLength: 250,
                          style: AppTextStyles.body,
                          decoration: InputDecoration(
                            hintText: "Please describe the issue in detail...",
                            hintStyle: TextStyle(color: AppColors.textLight),
                            border: InputBorder.none,
                            counterText: "",
                          ),
                          onChanged: (val) {
                            ref.read(draftReportProvider.notifier).updateDescription(val);
                          },
                        ),
                        // Character count indicator
                        AnimatedBuilder(
                          animation: _explainController,
                          builder: (context, child) {
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 8.0),
                              child: Text(
                                "${_explainController.text.length}/250",
                                style: AppTextStyles.micro.copyWith(color: AppColors.textLight),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // 4. Media Attachments Section
                  Text("Add Photos or Video (Optional)", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _mediaCard(Icons.camera_alt_outlined, "Camera", () {
                        ref.read(draftReportProvider.notifier).addAttachment("photo1.jpg");
                      }),
                      const SizedBox(width: 10),
                      _mediaCard(Icons.image_outlined, "Gallery", () {
                        ref.read(draftReportProvider.notifier).addAttachment("photo2.jpg");
                      }),
                      const SizedBox(width: 10),
                      _mediaCard(Icons.videocam_outlined, "Video", () {
                        ref.read(draftReportProvider.notifier).addAttachment("video1.mp4");
                      }),
                    ],
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            ),
          ),

          // Bottom CTA Card
          _buildBottomCTA(context),
        ],
      ),
    );
  }

  Widget _buildProgressIndicator() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(width: 16, height: 8, decoration: BoxDecoration(color: AppColors.primaryBlue, borderRadius: BorderRadius.circular(4))),
        const SizedBox(width: 6),
        Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.textLight, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.textLight, shape: BoxShape.circle)),
      ],
    );
  }

  Widget _mediaCard(IconData icon, String label, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          height: 72,
          decoration: BoxDecoration(
            color: AppColors.dynamicBackground,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.dynamicBorder, style: BorderStyle.solid),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 24, color: AppColors.textSecondary),
              const SizedBox(height: 6),
              Text(label, style: AppTextStyles.small.copyWith(color: AppColors.textSecondary)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBottomCTA(BuildContext context) {
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
          onPressed: () {
            // Commit text description details
            ref.read(draftReportProvider.notifier).updateDescription(_explainController.text);
            // Route billing/mobile money complaints through billing details form
            final draft = ref.read(draftReportProvider);
            if (draft.isBillingType) {
              context.push('/report/billing-details');
            } else {
              context.push('/report/location');
            }
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
            "Next",
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
