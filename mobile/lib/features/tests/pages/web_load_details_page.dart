import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class WebLoadDetailsPage extends StatelessWidget {
  const WebLoadDetailsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: "Web Load",
      subtitle: "QoE Page Loading Analysis",
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Column(
          children: [
            // Target URL input card
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: const Row(
                children: [
                  Icon(Icons.language_rounded, color: AppColors.primaryAccentBlue, size: 20),
                  SizedBox(width: 12),
                  Text("https://gov.sl/portal", style: TextStyle(color: AppColors.textWhite, fontSize: 13, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Total Load Time hero
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 20),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.border),
              ),
              child: const Column(
                children: [
                  Text("TOTAL PAGE LOAD TIME", style: TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
                  SizedBox(height: 6),
                  Text("1.24 s", style: TextStyle(fontSize: 48, fontWeight: FontWeight.w800, color: AppColors.primaryAccentBlue)),
                  SizedBox(height: 4),
                  Text("HTTP 200 OK • 1.4 MB RECEIVED", style: TextStyle(fontSize: 10, color: AppColors.successGreen, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Waterfall Timeline Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("WATERFALL STAGE BREAKDOWN", style: AppTextStyles.sectionLabel),
                  const SizedBox(height: 20),
                  _waterfallItem("DNS Lookup", "120 ms", 0.12, AppColors.purple5G),
                  _waterfallItem("TCP Connection", "180 ms", 0.18, AppColors.primaryAccentBlue),
                  _waterfallItem("TLS Handshake", "220 ms", 0.22, AppColors.tealAccent),
                  _waterfallItem("Time to First Byte (TTFB)", "380 ms", 0.38, AppColors.successGreen),
                  _waterfallItem("Content Page Load", "340 ms", 0.34, AppColors.warningAmber),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Server headers & metadata
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  _metaRow("Web server protocol", "HTTP/2 (TLS 1.3)"),
                  _metaRow("Total retries", "0"),
                  _metaRow("Content encoding", "gzip"),
                  _metaRow("Server IP address", "184.25.109.12"),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _waterfallItem(String label, String duration, double pct, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textWhite, fontWeight: FontWeight.bold)),
              Text(duration, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
            ],
          ),
          const SizedBox(height: 6),
          // Horizontal loading line bar
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: Container(
              height: 6,
              width: double.infinity,
              color: AppColors.border,
              child: Align(
                alignment: Alignment.centerLeft,
                child: FractionallySizedBox(
                  widthFactor: pct,
                  child: Container(color: color),
                ),
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _metaRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          Text(value, style: const TextStyle(color: AppColors.textWhite, fontSize: 12, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
