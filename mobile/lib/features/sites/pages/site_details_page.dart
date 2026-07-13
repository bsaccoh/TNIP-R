import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';

class SiteDetailsPage extends StatefulWidget {
  final String siteId;

  const SiteDetailsPage({super.key, required this.siteId});

  @override
  State<SiteDetailsPage> createState() => _SiteDetailsPageState();
}

class _SiteDetailsPageState extends State<SiteDetailsPage> {
  String _activeTab = "Overview";

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: "Site Details",
      subtitle: "Regulatory ID: ${widget.siteId}",
      headerActions: [
        IconButton(icon: const Icon(Icons.more_vert_rounded), onPressed: () {}),
      ],
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 1. Site Info card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(color: AppColors.primaryBlue.withOpacity(0.1), shape: BoxShape.circle),
                  child: const Icon(Icons.cell_tower_rounded, color: AppColors.primaryBlue, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("Site ID: ${widget.siteId}", style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary, fontSize: 14)),
                      const SizedBox(height: 2),
                      const Text("Freetown, Western Area", style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(6)),
                  child: const Text("Active", style: TextStyle(color: AppColors.successGreen, fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 2. Tab Bar Row
          _buildTabBar(),
          const SizedBox(height: 16),

          // 3. Signal Strength Section (Value, badge, and sparkline chart)
          _sectionTitle("Signal Strength"),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.cardWhite,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: const [
                        Text("-75", style: TextStyle(fontSize: 38, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                        SizedBox(width: 4),
                        Text("dBm", style: AppTextStyles.caption),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(6)),
                      child: const Text("Good", style: TextStyle(color: AppColors.successGreen, fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Smooth line chart trend
                const Text("Last 24h Signal Quality Trend:", style: TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Container(
                  height: 80,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: AppColors.successGreen.withOpacity(0.06),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  padding: const EdgeInsets.all(4),
                  child: CustomPaint(
                    painter: _SiteTrendSparklinePainter(),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 4. Metrics Grid Row
          Row(
            children: [
              _metricBox("RSRP", "-75 dBm"),
              const SizedBox(width: 10),
              _metricBox("RSRQ", "-9 dB"),
              const SizedBox(width: 10),
              _metricBox("SINR", "18 dB"),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar() {
    final tabs = ["Overview", "Performance", "Details", "History"];
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: tabs.map((tab) {
        final active = tab == _activeTab;
        return GestureDetector(
          onTap: () => setState(() => _activeTab = tab),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: active ? AppColors.lightBlue : Colors.transparent, width: 2)),
            ),
            child: Text(
              tab,
              style: TextStyle(
                color: active ? AppColors.lightBlue : AppColors.textMuted,
                fontWeight: active ? FontWeight.bold : FontWeight.w500,
                fontSize: 13,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _sectionTitle(String label) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0, left: 4.0),
      child: Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textSecondary)),
    );
  }

  Widget _metricBox(String label, String value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.borderLight),
        ),
        child: Column(
          children: [
            Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          ],
        ),
      ),
    );
  }
}

class _SiteTrendSparklinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.successGreen
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    final path = Path()
      ..moveTo(0, size.height * 0.6)
      ..lineTo(size.width * 0.2, size.height * 0.4)
      ..lineTo(size.width * 0.4, size.height * 0.5)
      ..lineTo(size.width * 0.6, size.height * 0.3)
      ..lineTo(size.width * 0.8, size.height * 0.2)
      ..lineTo(size.width, size.height * 0.1);

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _SiteTrendSparklinePainter oldDelegate) => false;
}
