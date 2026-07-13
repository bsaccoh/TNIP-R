import 'package:flutter/material.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../shared/charts/reusable_charts.dart';

class VideoStreamDetailsPage extends StatelessWidget {
  const VideoStreamDetailsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      showHeader: true,
      title: "Video Stream",
      subtitle: "QoE Adaptive Video Streaming",
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Column(
          children: [
            // Video stream quality banner card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.excellentBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.video_library_rounded, color: AppColors.successGreen),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text("ACTIVE STREAMING QUALITY", style: TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
                        SizedBox(height: 4),
                        Text("1080p Full HD", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textWhite)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.excellentBg,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.successGreen.withOpacity(0.3)),
                    ),
                    child: const Text("EXCELLENT", style: TextStyle(color: AppColors.successGreen, fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // QoE Core stats grid
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.4,
              children: [
                _qoeBox("STARTUP DELAY", "1.12 s", Icons.play_arrow_rounded, AppColors.primaryAccentBlue),
                _qoeBox("BUFFERING LEVEL", "8.2 s", Icons.hourglass_empty_rounded, AppColors.successGreen),
                _qoeBox("STREAM BITRATE", "4.2 Mbps", Icons.trending_up_rounded, AppColors.tealAccent),
                _qoeBox("STALL COUNT", "0 events", Icons.error_outline_rounded, AppColors.errorRed),
              ],
            ),
            const SizedBox(height: 24),

            // Video stream bit rate trend
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
                  const Text("ADAPTIVE BITRATE TIMELINE (Mbps)", style: AppTextStyles.sectionLabel),
                  const SizedBox(height: 16),
                  const SparklineChart(
                    data: [2, 3, 4, 3, 5, 4, 5, 5, 4, 5, 4, 5],
                    color: AppColors.purple5G,
                    height: 80,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Technical details card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.secondaryBackground,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  _rowItem("Video Stream Codec", "H.264 / AVC High Profile"),
                  _rowItem("Endpoint CDN node", "Freetown - Akamai Cache"),
                  _rowItem("Resolution upgrades", "2 events (480p -> 720p -> 1080p)"),
                  _rowItem("MIME packet type", "video/mp4; codecs=\"avc1.64002a\""),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _qoeBox(String label, String value, IconData icon, Color color) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.secondaryBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 6),
              Text(label, style: const TextStyle(fontSize: 8, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textWhite)),
        ],
      ),
    );
  }

  Widget _rowItem(String label, String value) {
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
