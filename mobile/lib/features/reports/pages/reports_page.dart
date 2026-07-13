import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class ReportsPage extends StatefulWidget {
  const ReportsPage({super.key});

  @override
  State<ReportsPage> createState() => _ReportsPageState();
}

class _ReportsPageState extends State<ReportsPage> {
  String _activeTab = "Overview";

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      currentTabIndex: 3,
      showHeader: true,
      title: "Reports",
      subtitle: "Regulatory analytics report suite",
      headerActions: [
        IconButton(
          icon: const Icon(Icons.download_rounded, color: AppColors.textPrimary),
          onPressed: () {},
        ),
      ],
      body: Column(
        children: [
          // Sub-tabs row
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: ["Overview", "KPI", "Performance", "Logs"].map((tabName) {
                final active = tabName == _activeTab;
                return GestureDetector(
                  onTap: () => setState(() => _activeTab = tabName),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      border: Border(bottom: BorderSide(color: active ? AppColors.lightBlue : Colors.transparent, width: 2)),
                    ),
                    child: Text(
                      tabName,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: active ? FontWeight.bold : FontWeight.w500,
                        color: active ? AppColors.lightBlue : AppColors.textMuted,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          // Date range selection strip
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: AppColors.surfaceGray,
            child: Row(
              children: const [
                Icon(Icons.calendar_today_rounded, size: 14, color: AppColors.textSecondary),
                SizedBox(width: 8),
                Text("04 Jul 2025 - 11 Jul 2025", style: TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
                Spacer(),
                Icon(Icons.tune_rounded, size: 14, color: AppColors.textSecondary),
              ],
            ),
          ),

          // Main body content
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // 1. Grid (2x2) of Metrics Cards
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                  childAspectRatio: 1.12,
                  children: [
                    _reportStatCard("Avg. Quality", "76%", "Good", "+12%", AppColors.successGreen, true),
                    _reportStatCard("Total Tests", "2,458", null, "+12%", AppColors.successGreen, false),
                    _reportStatCard("Call Drop Rate", "2.35%", null, "-8%", AppColors.successGreen, false),
                    _reportStatCard("4G Coverage", "68%", null, "+5%", AppColors.successGreen, false),
                  ],
                ),
                const SizedBox(height: 24),

                // 2. Top Issues Section
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: const [
                          Text("Top Issues", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary)),
                          Text("View all", style: TextStyle(color: AppColors.accentBlue, fontSize: 12, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _issueRow("Call Drop Rate", 0.23, AppColors.errorRed),
                      _issueRow("Low 4G Coverage", 0.18, AppColors.warningAmber),
                      _issueRow("High Latency", 0.12, AppColors.sierraTelColor),
                      _issueRow("SMS Failure", 0.08, AppColors.accentBlue),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _reportStatCard(String label, String value, String? badge, String change, Color changeColor, bool hasBadge) {
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
              Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w500)),
              if (badge != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(4)),
                  child: Text(badge, style: const TextStyle(color: AppColors.successGreen, fontSize: 8, fontWeight: FontWeight.bold)),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              const SizedBox(width: 6),
              // Trend indicator
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.arrow_upward_rounded, size: 10, color: changeColor),
                  Text(change, style: TextStyle(color: changeColor, fontSize: 9, fontWeight: FontWeight.bold)),
                ],
              )
            ],
          ),
          const SizedBox(height: 10),
          // Small sparkline representation
          SizedBox(
            height: 18,
            width: double.infinity,
            child: CustomPaint(
              painter: _ReportSparklinePainter(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _issueRow(String name, double progress, Color barColor) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(name, style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w500, fontSize: 13)),
              Text("${(progress * 100).toInt()}%", style: const TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 13)),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: AppColors.surfaceGray,
              valueColor: AlwaysStoppedAnimation<Color>(barColor),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReportSparklinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.successGreen
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8;

    final path = Path()
      ..moveTo(0, size.height * 0.8)
      ..lineTo(size.width * 0.2, size.height * 0.7)
      ..lineTo(size.width * 0.4, size.height * 0.9)
      ..lineTo(size.width * 0.6, size.height * 0.4)
      ..lineTo(size.width * 0.8, size.height * 0.5)
      ..lineTo(size.width, size.height * 0.2);

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _ReportSparklinePainter oldDelegate) => false;
}
