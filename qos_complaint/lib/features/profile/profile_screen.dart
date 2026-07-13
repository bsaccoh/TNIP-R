import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../app/theme/app_theme.dart';
import '../../app/providers/state_providers.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = ref.watch(themeProvider);

    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(60),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Profile", style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // User Avatar Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.dynamicCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.dynamicBorder),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: AppColors.primaryBlue.withOpacity(0.15),
                    child: const Icon(Icons.person_outline_rounded, size: 36, color: AppColors.primaryBlue),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Mariama Kamara", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text("mariama.kamara@gov.sl", style: AppTextStyles.small),
                        const SizedBox(height: 2),
                        Text("Kenema, Sierra Leone", style: AppTextStyles.micro),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Settings options
            Container(
              decoration: BoxDecoration(
                color: AppColors.dynamicCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.dynamicBorder),
              ),
              child: Column(
                children: [
                  // Dark Mode Switch
                  ListTile(
                    leading: const Icon(Icons.dark_mode_outlined, color: AppColors.primaryBlue),
                    title: Text("Dark Display Theme", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600)),
                    trailing: Switch(
                      value: isDark,
                      activeColor: AppColors.primaryBlue,
                      onChanged: (val) {
                        ref.read(themeProvider.notifier).toggleTheme();
                      },
                    ),
                  ),
                  const Divider(height: 1, color: AppColors.border),
                  
                  // Language Selector
                  ListTile(
                    leading: const Icon(Icons.language_rounded, color: AppColors.accentGreen),
                    title: Text("Language", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600)),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text("English", style: AppTextStyles.small),
                        const Icon(Icons.chevron_right_rounded, color: AppColors.textLight),
                      ],
                    ),
                    onTap: () {},
                  ),
                  const Divider(height: 1, color: AppColors.border),

                  // Notifications preference
                  ListTile(
                    leading: const Icon(Icons.notifications_active_outlined, color: AppColors.warningOrange),
                    title: Text("Push Notifications", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600)),
                    trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textLight),
                    onTap: () {},
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Help section
            Container(
              decoration: BoxDecoration(
                color: AppColors.dynamicCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.dynamicBorder),
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.info_outline_rounded, color: AppColors.textSecondary),
                    title: Text("About NatCA QoS", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.w600)),
                    trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textLight),
                    onTap: () {},
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
