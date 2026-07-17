import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';

class NewsItem {
  final String title;
  final String date;
  final String summary;
  final String category;
  final Color categoryColor;

  NewsItem({
    required this.title,
    required this.date,
    required this.summary,
    required this.category,
    required this.categoryColor,
  });
}

class LatestNewsScreen extends StatelessWidget {
  const LatestNewsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final List<NewsItem> news = [
      NewsItem(
        title: "New Tariff Change Approved",
        date: "15 Jul 2026",
        summary: "NatCA has approved a new ceiling tariff for voice and SMS services across all operators to standardize rates and protect consumers.",
        category: "Regulation",
        categoryColor: AppColors.primaryBlue,
      ),
      NewsItem(
        title: "Orange Deploys New Site at Waterloo",
        date: "12 Jul 2026",
        summary: "Orange Sierra Leone has successfully commissioned a new 4G+ macro site at Waterloo, expected to drastically improve connectivity in the peninsula.",
        category: "Network Update",
        categoryColor: AppColors.warningOrange,
      ),
      NewsItem(
        title: "Africell Expands Fiber Network in Kenema",
        date: "08 Jul 2026",
        summary: "Africell announces the completion of Phase 1 of its Kenema metropolitan fiber ring, boosting internet speeds for broadband users.",
        category: "Network Update",
        categoryColor: AppColors.errorRed,
      ),
      NewsItem(
        title: "QoS Compliance Report Q2 Released",
        date: "01 Jul 2026",
        summary: "NatCA has published the latest Quality of Service compliance report for Q2 2026. View the detailed breakdown of operator performance on the portal.",
        category: "Official Report",
        categoryColor: AppColors.accentGreen,
      ),
    ];

    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      appBar: AppBar(
        backgroundColor: AppColors.dynamicBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.textPrimary, size: 20),
          onPressed: () => context.pop(),
        ),
        title: Text("Latest News", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: news.length,
        itemBuilder: (context, index) {
          final item = news[index];
          return Container(
            margin: const EdgeInsets.only(bottom: 16),
            decoration: BoxDecoration(
              color: AppColors.dynamicCard,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.dynamicBorder),
              boxShadow: const [
                BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 3)),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: item.categoryColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          item.category,
                          style: AppTextStyles.micro.copyWith(
                            color: item.categoryColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Text(item.date, style: AppTextStyles.micro.copyWith(color: AppColors.textMuted)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    item.title,
                    style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    item.summary,
                    style: AppTextStyles.small.copyWith(color: AppColors.textSecondary, height: 1.4),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
