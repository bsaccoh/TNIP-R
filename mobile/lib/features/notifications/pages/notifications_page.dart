import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  String _activeTab = "All";

  final List<Map<String, dynamic>> _notifications = const [
    {
      "id": "N1",
      "group": "Today",
      "type": "Alert",
      "title": "Critical Alert: High Call Drop Rate",
      "desc": "Sierra Tel exceeded the standard CDR threshold limit in Freetown Area cell tower sector SL0012.",
      "time": "10 min ago",
      "unread": true,
      "icon": Icons.warning_amber_rounded,
      "color": AppColors.errorRed,
    },
    {
      "id": "N2",
      "group": "Today",
      "type": "Report",
      "title": "Report Ready: Weekly KPI Report",
      "desc": "Your scheduled regional quality performance audit summary is ready for download in PDF/CSV.",
      "time": "1 hr ago",
      "unread": true,
      "icon": Icons.description_outlined,
      "color": AppColors.primaryBlue,
    },
    {
      "id": "N3",
      "group": "Yesterday",
      "type": "Success",
      "title": "Drive Test Logging Saved",
      "desc": "Session test logging run S1 completed successfully and exported to regulatory logs database.",
      "time": "Yesterday, 02:14 PM",
      "unread": false,
      "icon": Icons.check_circle_outline_rounded,
      "color": AppColors.successGreen,
    },
    {
      "id": "N4",
      "group": "Yesterday",
      "type": "System",
      "title": "System Platform Update Completed",
      "desc": "NatCA Regulator application client has been successfully updated to version v2.1.0.",
      "time": "Yesterday, 09:00 AM",
      "unread": false,
      "icon": Icons.settings_outlined,
      "color": AppColors.textSecondary,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final filtered = _activeTab == "All"
        ? _notifications
        : _notifications.where((n) => n["type"] == _activeTab).toList();

    return AppScaffold(
      showHeader: true,
      title: "Notifications",
      subtitle: "Regulatory system status center",
      headerActions: [
        TextButton(
          onPressed: () {},
          child: const Text("Mark all read", style: TextStyle(color: AppColors.accentBlue, fontSize: 12, fontWeight: FontWeight.bold)),
        ),
      ],
      body: Column(
        children: [
          // 1. Filter pills row
          Container(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
            color: Colors.white,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: ["All", "Alert", "Report", "System"].map((tab) {
                final active = tab == _activeTab;
                return GestureDetector(
                  onTap: () => setState(() => _activeTab = tab),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: active ? AppColors.primaryBlue : Colors.transparent,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: active ? AppColors.primaryBlue : AppColors.borderLight),
                    ),
                    child: Text(
                      tab == "All" ? "All" : "${tab}s",
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: active ? Colors.white : AppColors.textSecondary,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 10),

          // 2. Notification list
          Expanded(
            child: filtered.isEmpty
                ? const Center(child: Text("No notifications match this filter.", style: TextStyle(color: AppColors.textMuted)))
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final item = filtered[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: item["unread"] as bool ? Colors.white : AppColors.surfaceGray.withOpacity(0.5),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.borderLight),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Left circle icon
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(color: (item["color"] as Color).withOpacity(0.12), shape: BoxShape.circle),
                              child: Icon(item["icon"] as IconData, color: item["color"] as Color, size: 18),
                            ),
                            const SizedBox(width: 12),
                            // Content description text block
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item["title"] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                                  const SizedBox(height: 4),
                                  Text(item["desc"] as String, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, height: 1.35)),
                                  const SizedBox(height: 6),
                                  Text(item["time"] as String, style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
                                ],
                              ),
                            ),
                            if (item["unread"] as bool)
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(color: AppColors.accentBlue, shape: BoxShape.circle),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
