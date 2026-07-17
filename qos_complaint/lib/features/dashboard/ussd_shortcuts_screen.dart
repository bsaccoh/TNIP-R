import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../app/theme/app_theme.dart';

class UssdShortcutsScreen extends StatelessWidget {
  const UssdShortcutsScreen({super.key});

  void _launchUssd(BuildContext context, String code) async {
    // USSD codes need the # character encoded as %23 for tel scheme
    final String encodedCode = code.replaceAll('#', '%23');
    final Uri uri = Uri(scheme: 'tel', path: encodedCode);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not launch dialer')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // National Emergency Codes
    final List<_EmergencyCode> emergencyCodes = [
      _EmergencyCode(
        title: "Health Emergency",
        description: "Ambulance & Medical Services",
        code: "117",
        icon: Icons.local_hospital_rounded,
        color: AppColors.errorRed,
      ),
      _EmergencyCode(
        title: "Customer Care",
        description: "Telecom Operator Assistance",
        code: "111",
        icon: Icons.headset_mic_rounded,
        color: AppColors.primaryBlue,
      ),
      _EmergencyCode(
        title: "Police Emergency",
        description: "Sierra Leone Police",
        code: "900", // Example code for Police, adjust if different
        icon: Icons.local_police_rounded,
        color: const Color(0xFF1A237E),
      ),
      _EmergencyCode(
        title: "Fire Force",
        description: "National Fire Authority",
        code: "300", // Example code
        icon: Icons.local_fire_department_rounded,
        color: AppColors.warningOrange,
      ),
      _EmergencyCode(
        title: "Disaster Response",
        description: "National Disaster Management Agency",
        code: "119", // Example code
        icon: Icons.warning_rounded,
        color: const Color(0xFFD84315),
      ),
      _EmergencyCode(
        title: "SL Armed Forces",
        description: "Republic of Sierra Leone Armed Forces",
        code: "123", // Example code
        icon: Icons.security_rounded,
        color: const Color(0xFF2E7D32),
      ),
    ];

    return Scaffold(
      backgroundColor: AppColors.isDark ? const Color(0xFF101424) : AppColors.background,
      appBar: AppBar(
        title: Text("Emergency Directory", style: AppTextStyles.h2.copyWith(fontWeight: FontWeight.bold, color: AppColors.dynamicTextPrimary)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.primaryBlue),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.primaryBlue.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.primaryBlue.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: AppColors.primaryBlue),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    "Tap any emergency code below to instantly open your phone's dialer. These numbers are toll-free across all networks.",
                    style: TextStyle(color: AppColors.isDark ? Colors.white70 : AppColors.textSecondary, fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Text("National Contacts", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: AppColors.dynamicCard,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.dynamicBorder),
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: emergencyCodes.length,
              separatorBuilder: (context, index) => const Divider(height: 1, color: AppColors.border),
              itemBuilder: (context, index) {
                final code = emergencyCodes[index];
                return ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: code.color.withOpacity(0.1), shape: BoxShape.circle),
                    child: Icon(code.icon, color: code.color, size: 24),
                  ),
                  title: Text(code.title, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 4),
                      Text(code.description, style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                      const SizedBox(height: 4),
                      Text(code.code, style: TextStyle(color: code.color, fontWeight: FontWeight.bold, fontSize: 16)),
                    ],
                  ),
                  trailing: Icon(Icons.call, color: AppColors.border, size: 20),
                  onTap: () => _launchUssd(context, code.code),
                );
              },
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _EmergencyCode {
  final String title;
  final String description;
  final String code;
  final IconData icon;
  final Color color;
  _EmergencyCode({
    required this.title,
    required this.description,
    required this.code,
    required this.icon,
    required this.color,
  });
}
