import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class DriveTestHistoryPage extends StatefulWidget {
  const DriveTestHistoryPage({super.key});

  @override
  State<DriveTestHistoryPage> createState() => _DriveTestHistoryPageState();
}

class _DriveTestHistoryPageState extends State<DriveTestHistoryPage> {
  String _activeFilter = "All";

  final List<Map<String, dynamic>> _sessions = const [
    {
      "id": "S1",
      "date": "Jul 11, 2025",
      "time": "09:14 AM",
      "distance": "23.4 km",
      "duration": "1h 12m",
      "analyst": "Analyst A",
      "quality": "Good",
      "qualityColor": AppColors.successGreen,
      "operator": "Sierra Tel",
      "operatorColor": AppColors.sierraTelColor,
    },
    {
      "id": "S2",
      "date": "Jul 10, 2025",
      "time": "03:22 PM",
      "distance": "18.7 km",
      "duration": "52m",
      "analyst": "Analyst B",
      "quality": "Fair",
      "qualityColor": AppColors.warningAmber,
      "operator": "Orange",
      "operatorColor": AppColors.orangeOperator,
    },
    {
      "id": "S3",
      "date": "Jul 09, 2025",
      "time": "10:05 AM",
      "distance": "31.2 km",
      "duration": "1h 38m",
      "analyst": "Analyst A",
      "quality": "Good",
      "qualityColor": AppColors.successGreen,
      "operator": "Africell",
      "operatorColor": AppColors.africellPurple,
    },
    {
      "id": "S4",
      "date": "Jul 07, 2025",
      "time": "02:47 PM",
      "distance": "9.8 km",
      "duration": "28m",
      "analyst": "Analyst C",
      "quality": "Poor",
      "qualityColor": AppColors.errorRed,
      "operator": "Qcell",
      "operatorColor": AppColors.qcellPurple,
    },
  ];

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: "Test History",
      subtitle: "Regulatory logs of completed drive tests",
      headerActions: [
        IconButton(icon: const Icon(Icons.filter_list_rounded), onPressed: () {}),
        IconButton(icon: const Icon(Icons.download_rounded), onPressed: () {}),
      ],
      body: Column(
        children: [
          // 1. Stats summary strip
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.white,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _miniStat("48", "Total Tests"),
                _miniStat("12", "This Month"),
                _miniStat("76%", "Avg Quality"),
              ],
            ),
          ),

          // 2. Filter chips
          Container(
            height: 48,
            color: Colors.white,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: ["All", "This Week", "This Month", "By Operator"].map((filter) {
                final active = filter == _activeFilter;
                return GestureDetector(
                  onTap: () => setState(() => _activeFilter = filter),
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: active ? AppColors.primaryBlue : Colors.transparent,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: active ? AppColors.primaryBlue : AppColors.borderLight),
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
          const SizedBox(height: 10),

          // 3. Session List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              itemCount: _sessions.length,
              itemBuilder: (context, index) {
                final session = _sessions[index];
                return GestureDetector(
                  onTap: () => context.push('/session-report/${session["id"]}'),
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
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(session["date"] as String, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary)),
                                const SizedBox(height: 2),
                                Text(session["time"] as String, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(color: (session["qualityColor"] as Color).withOpacity(0.12), borderRadius: BorderRadius.circular(6)),
                              child: Text(
                                session["quality"] as String,
                                style: TextStyle(color: session["qualityColor"] as Color, fontSize: 9, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        const Divider(color: AppColors.borderLight, height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.navigation_outlined, size: 13, color: AppColors.textMuted),
                                const SizedBox(width: 4),
                                Text(session["distance"] as String, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
                                const SizedBox(width: 12),
                                const Icon(Icons.timer_outlined, size: 13, color: AppColors.textMuted),
                                const SizedBox(width: 4),
                                Text(session["duration"] as String, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
                              ],
                            ),
                            Row(
                              children: [
                                Container(width: 6, height: 6, decoration: BoxDecoration(color: session["operatorColor"] as Color, shape: BoxShape.circle)),
                                const SizedBox(width: 6),
                                Text(session["operator"] as String, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
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

  Widget _miniStat(String val, String label) {
    return Column(
      children: [
        Text(val, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
