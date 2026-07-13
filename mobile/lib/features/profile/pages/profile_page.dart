import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../app/providers/theme_provider.dart';

class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final isDark = themeMode == ThemeMode.dark;

    return AppScaffold(
      showHeader: true,
      title: "Profile",
      subtitle: "Regulatory account overview",
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Profile Hero Card
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1565C0), Color(0xFF1E88E5)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  alignment: Alignment.center,
                  child: const Text("AA", style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 12),
                const Text("Analyst Ahmed", style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                const Text("Senior Analyst · NatCA Freetown", style: TextStyle(color: Colors.white70, fontSize: 13)),
                const SizedBox(height: 20),
                const Divider(color: Colors.white24, height: 1),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _profileStat("48", "Tests Run"),
                    _profileStat("12", "Reports Logged"),
                    _profileStat("156", "Alerts Reviewed"),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 2. Monthly activity summary
          _sectionTitle("Monthly Activity stats"),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.5,
            children: [
              _activityCard("Drive Tests", "12", Icons.directions_car_filled_outlined, AppColors.primaryBlue),
              _activityCard("Reports Generated", "4", Icons.description_outlined, AppColors.successGreen),
              _activityCard("Alerts Handled", "48", Icons.warning_amber_rounded, AppColors.warningAmber),
              _activityCard("Sites Audited", "8", Icons.cell_tower_rounded, AppColors.accentBlue),
            ],
          ),
          const SizedBox(height: 20),

          // 3. Settings list
          _sectionTitle("Account Settings"),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              children: [
                _settingsTile(Icons.person_outline_rounded, "Personal Information", () {}),
                const Divider(color: AppColors.borderLight, height: 1),
                _settingsTile(Icons.lock_outline_rounded, "Change Security Password", () {}),
                const Divider(color: AppColors.borderLight, height: 1),
                ListTile(
                  leading: const Icon(Icons.dark_mode_outlined, color: AppColors.textSecondary, size: 20),
                  title: const Text("Dark Theme Mode", style: TextStyle(fontSize: 13, color: AppColors.textPrimary, fontWeight: FontWeight.w500)),
                  trailing: Switch(
                    value: isDark,
                    onChanged: (val) {
                      ref.read(themeModeProvider.notifier).state = val ? ThemeMode.dark : ThemeMode.light;
                    },
                    activeColor: AppColors.accentBlue,
                  ),
                  dense: true,
                ),
                const Divider(color: AppColors.borderLight, height: 1),
                _settingsTile(Icons.logout_rounded, "Sign Out Session", () => _showLogoutConfirmDialog(context), AppColors.errorRed),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _profileStat(String val, String label) {
    return Column(
      children: [
        Text(val, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 10)),
      ],
    );
  }

  Widget _sectionTitle(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0, left: 4.0),
      child: Text(text, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textSecondary)),
    );
  }

  Widget _activityCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
              Icon(icon, size: 16, color: color),
            ],
          ),
          const SizedBox(height: 6),
          Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  Widget _settingsTile(IconData icon, String label, VoidCallback onTap, [Color iconColor = AppColors.textSecondary]) {
    return ListTile(
      leading: Icon(icon, color: iconColor, size: 20),
      title: Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textPrimary, fontWeight: FontWeight.w500)),
      trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: AppColors.textMuted),
      onTap: onTap,
      dense: true,
    );
  }

  void _showLogoutConfirmDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.white,
        title: const Text("Sign Out Confirmation", style: TextStyle(fontWeight: FontWeight.bold)),
        content: const Text("Are you sure you want to end your active regulatory session on this device?", style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("CANCEL", style: TextStyle(color: AppColors.textSecondary))),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              context.go('/login');
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.errorRed, foregroundColor: Colors.white),
            child: const Text("SIGN OUT"),
          ),
        ],
      ),
    );
  }
}
