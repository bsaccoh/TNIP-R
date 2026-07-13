import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class AlertsPage extends StatefulWidget {
  const AlertsPage({super.key});

  @override
  State<AlertsPage> createState() => _AlertsPageState();
}

class _AlertsPageState extends State<AlertsPage> {
  String _activeFilter = "All";

  final List<Map<String, dynamic>> _alerts = [
    {
      "id": "A1",
      "title": "High Call Drop Rate",
      "operator": "Sierra Tel",
      "operatorColor": AppColors.sierraTelColor,
      "location": "Freetown Area",
      "time": "10 min ago",
      "severity": "Critical",
      "color": AppColors.errorRed,
      "icon": Icons.error_outline_rounded,
    },
    {
      "id": "A2",
      "title": "Low 4G Coverage",
      "operator": "Africell",
      "operatorColor": AppColors.africellPurple,
      "location": "Kenema District",
      "time": "25 min ago",
      "severity": "Major",
      "color": AppColors.warningAmber,
      "icon": Icons.warning_amber_rounded,
    },
    {
      "id": "A3",
      "title": "High Latency Detected",
      "operator": "Qcell",
      "operatorColor": AppColors.qcellPurple,
      "location": "Bo City",
      "time": "1 hr ago",
      "severity": "Minor",
      "color": AppColors.sierraTelColor,
      "icon": Icons.info_outline_rounded,
    },
    {
      "id": "A4",
      "title": "SMS Delivery Failure",
      "operator": "Orange Sierra Leone",
      "operatorColor": AppColors.orangeOperator,
      "location": "Western Area",
      "time": "2 hr ago",
      "severity": "Info",
      "color": AppColors.accentBlue,
      "icon": Icons.info_outline_rounded,
    },
  ];

  @override
  Widget build(BuildContext context) {
    // Filter logic
    final filteredAlerts = _activeFilter == "All"
        ? _alerts
        : _alerts.where((a) => a["severity"] == _activeFilter).toList();

    return AppScaffold(
      showHeader: true,
      title: "Alerts",
      subtitle: "Regulatory system events feed",
      headerActions: [
        IconButton(
          icon: const Icon(Icons.filter_alt_outlined, color: AppColors.textPrimary),
          onPressed: () {},
        ),
      ],
      body: Column(
        children: [
          // Filter tabs row
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
            color: AppColors.primaryBackground,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: ["All", "Critical", "Major", "Minor"].map((filter) {
                final active = filter == _activeFilter;
                return GestureDetector(
                  onTap: () => setState(() => _activeFilter = filter),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: active ? AppColors.primaryBlue : Colors.transparent,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: active ? AppColors.primaryBlue : AppColors.borderLight,
                      ),
                    ),
                    child: Text(
                      filter,
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

          // Scrollable alerts list
          Expanded(
            child: filteredAlerts.isEmpty
                ? const Center(
                    child: Text("No alerts found matching this filter.", style: TextStyle(color: AppColors.textMuted)),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filteredAlerts.length,
                    itemBuilder: (context, index) {
                      final alert = filteredAlerts[index];
                      return GestureDetector(
                        onTap: () => context.push('/alert-details/${alert["id"]}'),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: AppColors.cardWhite,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.borderLight),
                            boxShadow: const [
                              BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 1)),
                            ],
                          ),
                          child: IntrinsicHeight(
                            child: Row(
                              children: [
                                // Left accent border bar color
                                Container(
                                  width: 4,
                                  decoration: BoxDecoration(
                                    color: alert["color"],
                                    borderRadius: const BorderRadius.only(topLeft: Radius.circular(12), bottomLeft: Radius.circular(12)),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                // Icon circle
                                Container(
                                  width: 38,
                                  height: 38,
                                  decoration: BoxDecoration(
                                    color: alert["color"].withOpacity(0.1),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(alert["icon"], color: alert["color"], size: 18),
                                ),
                                const SizedBox(width: 12),
                                // Content
                                Expanded(
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text(alert["title"], style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary, fontSize: 14)),
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            Container(width: 6, height: 6, decoration: BoxDecoration(color: alert["operatorColor"], shape: BoxShape.circle)),
                                            const SizedBox(width: 6),
                                            Text(alert["operator"], style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                                          ],
                                        ),
                                        const SizedBox(height: 2),
                                        Row(
                                          children: [
                                            const Icon(Icons.location_on_outlined, color: AppColors.textMuted, size: 10),
                                            const SizedBox(width: 4),
                                            Text(alert["location"], style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                // Time & badge right
                                Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: alert["color"].withOpacity(0.12),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(alert["severity"], style: TextStyle(color: alert["color"], fontSize: 9, fontWeight: FontWeight.bold)),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(alert["time"], style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
                                    ],
                                  ),
                                )
                              ],
                            ),
                          ),
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
