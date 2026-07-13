import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class SitesPage extends StatefulWidget {
  const SitesPage({super.key});

  @override
  State<SitesPage> createState() => _SitesPageState();
}

class _SitesPageState extends State<SitesPage> {
  String _activeFilter = "All";

  final List<Map<String, dynamic>> _sites = const [
    {
      "id": "SL001245",
      "location": "Freetown, Western Area",
      "operator": "Sierra Tel",
      "operatorColor": AppColors.sierraTelColor,
      "status": "Active",
      "quality": "Good",
      "qualityColor": AppColors.successGreen,
      "updated": "5 min ago",
    },
    {
      "id": "SL002842",
      "location": "Bo City, Southern Area",
      "operator": "Orange",
      "operatorColor": AppColors.orangeOperator,
      "status": "Active",
      "quality": "Good",
      "qualityColor": AppColors.successGreen,
      "updated": "12 min ago",
    },
    {
      "id": "SL003498",
      "location": "Makeni, Northern Area",
      "operator": "Africell",
      "operatorColor": AppColors.africellPurple,
      "status": "Maintenance",
      "quality": "Fair",
      "qualityColor": AppColors.warningAmber,
      "updated": "1 hr ago",
    },
    {
      "id": "SL004112",
      "location": "Kenema, Eastern Area",
      "operator": "Qcell",
      "operatorColor": AppColors.qcellPurple,
      "status": "Inactive",
      "quality": "Poor",
      "qualityColor": AppColors.errorRed,
      "updated": "2 hr ago",
    },
  ];

  @override
  Widget build(BuildContext context) {
    final filtered = _activeFilter == "All"
        ? _sites
        : _sites.where((s) => s["status"] == _activeFilter).toList();

    return AppScaffold(
      showHeader: true,
      title: "Sites",
      subtitle: "Regulatory cell towers database",
      headerActions: [
        IconButton(icon: const Icon(Icons.map_outlined), onPressed: () => context.go('/map')),
        IconButton(icon: const Icon(Icons.filter_list_rounded), onPressed: () {}),
      ],
      body: Column(
        children: [
          // Filter Chips Scrollable Row
          Container(
            height: 52,
            color: Colors.white,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              children: ["All", "Active", "Inactive", "Maintenance"].map((filter) {
                final active = filter == _activeFilter;
                return GestureDetector(
                  onTap: () => setState(() => _activeFilter = filter),
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: active ? AppColors.primaryBlue : Colors.transparent,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: active ? AppColors.primaryBlue : AppColors.borderLight,
                      ),
                    ),
                    alignment: Alignment.center,
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

          // Scrollable Sites List
          Expanded(
            child: filtered.isEmpty
                ? const Center(child: Text("No sites match this filter.", style: TextStyle(color: AppColors.textMuted)))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final site = filtered[index];
                      return GestureDetector(
                        onTap: () => context.push('/site-details/${site["id"]}'),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.cardWhite,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.borderLight),
                            boxShadow: const [
                              BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 1)),
                            ],
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(color: AppColors.primaryBlue.withOpacity(0.1), shape: BoxShape.circle),
                                child: const Icon(Icons.cell_tower_rounded, color: AppColors.primaryBlue, size: 18),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text("Site ID: ${site["id"]}", style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary, fontSize: 13)),
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: site["operatorColor"].withOpacity(0.12),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(site["operator"], style: TextStyle(color: site["operatorColor"], fontSize: 8, fontWeight: FontWeight.bold)),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(site["location"], style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                                    const SizedBox(height: 2),
                                    Text("Updated ${site["updated"]}", style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: site["status"] == "Active"
                                          ? const Color(0xFFE8F5E9)
                                          : site["status"] == "Maintenance"
                                              ? const Color(0xFFFFF3E0)
                                              : const Color(0xFFFEEBEE),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      site["status"],
                                      style: TextStyle(
                                        color: site["status"] == "Active"
                                            ? AppColors.successGreen
                                            : site["status"] == "Maintenance"
                                                ? AppColors.warningAmber
                                                : AppColors.errorRed,
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      Container(width: 6, height: 6, decoration: BoxDecoration(color: site["qualityColor"], shape: BoxShape.circle)),
                                      const SizedBox(width: 4),
                                      Text(site["quality"], style: TextStyle(color: site["qualityColor"], fontSize: 11, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                ],
                              ),
                            ],
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
