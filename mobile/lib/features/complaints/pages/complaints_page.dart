import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class ComplaintsPage extends StatefulWidget {
  const ComplaintsPage({super.key});

  @override
  State<ComplaintsPage> createState() => _ComplaintsPageState();
}

class _ComplaintsPageState extends State<ComplaintsPage> {
  String _activeTab = "All";

  final List<Map<String, dynamic>> _complaints = const [
    {
      "id": "CMP-2025-0248",
      "type": "Poor Coverage - No Signal",
      "operator": "Sierra Tel",
      "operatorColor": AppColors.sierraTelColor,
      "location": "Freetown, Western Area",
      "date": "Jul 11, 2025",
      "status": "Open",
      "statusColor": AppColors.errorRed,
      "openDays": "3 days open",
    },
    {
      "id": "CMP-2025-0247",
      "type": "Slow Data Download Speed",
      "operator": "Orange",
      "operatorColor": AppColors.orangeOperator,
      "location": "Kenema, Eastern Province",
      "date": "Jul 10, 2025",
      "status": "In Progress",
      "statusColor": AppColors.warningAmber,
      "openDays": "5 days open",
    },
    {
      "id": "CMP-2025-0246",
      "type": "Call Drops Frequently",
      "operator": "Africell",
      "operatorColor": AppColors.africellPurple,
      "location": "Bo, Southern Province",
      "date": "Jul 09, 2025",
      "status": "Resolved",
      "statusColor": AppColors.successGreen,
      "openDays": "Resolved",
    },
    {
      "id": "CMP-2025-0245",
      "type": "SMS Dispatch Failures",
      "operator": "Qcell",
      "operatorColor": AppColors.qcellPurple,
      "location": "Makeni, Northern Province",
      "date": "Jul 08, 2025",
      "status": "Open",
      "statusColor": AppColors.errorRed,
      "openDays": "8 days open",
    },
  ];

  @override
  Widget build(BuildContext context) {
    final filtered = _activeTab == "All"
        ? _complaints
        : _complaints.where((c) => c["status"] == _activeTab).toList();

    return AppScaffold(
      showHeader: true,
      title: "Complaints",
      subtitle: "Regulatory public complaints manager",
      headerActions: [
        IconButton(icon: const Icon(Icons.filter_alt_outlined), onPressed: () {}),
        IconButton(icon: const Icon(Icons.add_rounded), onPressed: () {}),
      ],
      body: Column(
        children: [
          // 1. Stats Row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: AppColors.cardWhite,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _miniStat("248", "Total Files"),
                _miniStat("42", "Open Alarms", AppColors.errorRed),
                _miniStat("206", "Resolved Logs", AppColors.successGreen),
              ],
            ),
          ),

          // 2. Filter tabs row
          Container(
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
            color: AppColors.primaryBackground,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: ["All", "Open", "In Progress", "Resolved"].map((tabName) {
                final active = tabName == _activeTab;
                return GestureDetector(
                  onTap: () => setState(() => _activeTab = tabName),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: active ? AppColors.primaryBlue : Colors.transparent,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: active ? AppColors.primaryBlue : AppColors.borderLight),
                    ),
                    child: Text(
                      tabName,
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

          // 3. Complaints list
          Expanded(
            child: filtered.isEmpty
                ? const Center(child: Text("No complaints match this status.", style: TextStyle(color: AppColors.textMuted)))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final item = filtered[index];
                      return GestureDetector(
                        onTap: () => context.push('/complaints/${item["id"]}'),
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
                                // Left colored accent status bar
                                Container(
                                  width: 4,
                                  decoration: BoxDecoration(
                                    color: item["statusColor"] as Color,
                                    borderRadius: const BorderRadius.only(topLeft: Radius.circular(12), bottomLeft: Radius.circular(12)),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                // Content details
                                Expanded(
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(item["id"] as String, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
                                        const SizedBox(height: 4),
                                        Text(item["type"] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                                        const SizedBox(height: 6),
                                        Row(
                                          children: [
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(color: (item["operatorColor"] as Color).withOpacity(0.12), borderRadius: BorderRadius.circular(4)),
                                              child: Text(item["operator"] as String, style: TextStyle(color: item["operatorColor"] as Color, fontSize: 8, fontWeight: FontWeight.bold)),
                                            ),
                                            const SizedBox(width: 8),
                                            const Icon(Icons.location_on_outlined, color: AppColors.textMuted, size: 10),
                                            const SizedBox(width: 4),
                                            Text(item["location"] as String, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                // Status badge / date
                                Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(color: (item["statusColor"] as Color).withOpacity(0.12), borderRadius: BorderRadius.circular(6)),
                                        child: Text(item["status"] as String, style: TextStyle(color: item["statusColor"] as Color, fontSize: 9, fontWeight: FontWeight.bold)),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(item["openDays"] as String, style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
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

  Widget _miniStat(String val, String desc, [Color color = AppColors.textPrimary]) {
    return Column(
      children: [
        Text(val, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 2),
        Text(desc, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
