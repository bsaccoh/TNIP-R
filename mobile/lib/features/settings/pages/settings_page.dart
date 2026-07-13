import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../app/providers/theme_provider.dart';

class SettingsPage extends ConsumerStatefulWidget {
  const SettingsPage({super.key});

  @override
  ConsumerState<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends ConsumerState<SettingsPage> {
  bool _pushNotifications = true;
  bool _emailReports = true;
  double _callDropThreshold = 2.0;

  @override
  Widget build(BuildContext context) {
    final themeMode = ref.watch(themeModeProvider);
    final isDark = themeMode == ThemeMode.dark;

    return AppScaffold(
      showHeader: true,
      title: "Settings",
      subtitle: "Dashboard console preferences",
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Profile section header card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(colors: [AppColors.primaryBlue, AppColors.accentBlue]),
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: const Text("EA", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("Analyst Ahmed", style: TextStyle(fontWeight: FontWeight.bold, color: Theme.of(context).textTheme.titleLarge?.color, fontSize: 15)),
                      const SizedBox(height: 2),
                      const Text("NatCA Regulatory Officer", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 2. Alert notifications section
          _sectionTitle("System Settings"),
          Container(
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Column(
              children: [
                SwitchListTile(
                  title: Text("Push Alerts Notifications", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Theme.of(context).textTheme.titleLarge?.color)),
                  subtitle: const Text("Receive instant critical alarm alerts.", style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                  value: _pushNotifications,
                  onChanged: (val) => setState(() => _pushNotifications = val),
                  activeColor: AppColors.accentBlue,
                ),
                const Divider(height: 1),
                SwitchListTile(
                  title: Text("Daily Summary Reports", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Theme.of(context).textTheme.titleLarge?.color)),
                  subtitle: const Text("Email performance digest logs daily.", style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                  value: _emailReports,
                  onChanged: (val) => setState(() => _emailReports = val),
                  activeColor: AppColors.accentBlue,
                ),
                const Divider(height: 1),
                SwitchListTile(
                  title: Text("Dark Theme Mode", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Theme.of(context).textTheme.titleLarge?.color)),
                  subtitle: const Text("Enable dark mode theme styling colors.", style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                  value: isDark,
                  onChanged: (val) {
                    ref.read(themeModeProvider.notifier).state = val ? ThemeMode.dark : ThemeMode.light;
                  },
                  activeColor: AppColors.accentBlue,
                ),
                const Divider(height: 1),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text("Call Drop Threshold Limit", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Theme.of(context).textTheme.titleLarge?.color)),
                          Text("${_callDropThreshold.toStringAsFixed(1)}%", style: const TextStyle(color: AppColors.errorRed, fontWeight: FontWeight.bold, fontSize: 13)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Slider(
                        value: _callDropThreshold,
                        min: 0.5,
                        max: 5.0,
                        divisions: 9,
                        label: "${_callDropThreshold.toStringAsFixed(1)}%",
                        activeColor: AppColors.accentBlue,
                        onChanged: (val) => setState(() => _callDropThreshold = val),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 3. Security Settings
          _sectionTitle("Security & Account"),
          Container(
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Column(
              children: [
                _settingsTile(Icons.lock_outline_rounded, "Change Account Password", () {}),
                const Divider(height: 1),
                _settingsTile(Icons.verified_user_outlined, "Two-Factor Authentication", () {}),
                const Divider(height: 1),
                _settingsTile(Icons.devices_outlined, "Session Management", () {}),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 4. About App
          _sectionTitle("About"),
          Container(
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Column(
              children: [
                _settingsTile(Icons.info_outline_rounded, "Application Version (v2.1.0)", null),
                const Divider(height: 1),
                _settingsTile(Icons.description_outlined, "Terms of Service", () {}),
                const Divider(height: 1),
                _settingsTile(Icons.privacy_tip_outlined, "Privacy Policy", () {}),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Logout Action
          SizedBox(
            width: double.infinity,
            height: 50,
            child: OutlinedButton(
              onPressed: () => context.go('/login'),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.errorRed),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text("Sign Out Account", style: TextStyle(color: AppColors.errorRed, fontWeight: FontWeight.bold)),
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

  Widget _settingsTile(IconData icon, String label, VoidCallback? onTap) {
    return ListTile(
      leading: Icon(icon, color: AppColors.textSecondary, size: 20),
      title: Text(label, style: TextStyle(fontSize: 13, color: Theme.of(context).textTheme.titleLarge?.color, fontWeight: FontWeight.w500)),
      trailing: onTap != null ? const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: AppColors.textMuted) : null,
      onTap: onTap,
      dense: true,
    );
  }
}
