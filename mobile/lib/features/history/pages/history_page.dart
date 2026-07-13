import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../app/providers/state_providers.dart';
import '../../../core/models/app_models.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../core/widgets/status_pill.dart';

class HistoryPage extends ConsumerWidget {
  const HistoryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessions = ref.watch(historyProvider);

    return AppScaffold(
      currentTabIndex: 4,
      showHeader: true,
      title: "Test History",
      subtitle: "${sessions.length} sessions recorded",
      body: sessions.isEmpty
          ? const Center(
              child: Text(
                "No sessions recorded yet.",
                style: TextStyle(color: AppColors.textSecondary),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: sessions.length,
              itemBuilder: (context, index) {
                final session = sessions[index];
                return _SessionCard(session: session);
              },
            ),
    );
  }
}

class _SessionCard extends ConsumerWidget {
  final SessionItem session;

  const _SessionCard({required this.session});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () => context.push('/history/report/${session.id}'),
      onLongPress: () => _showActionSheet(context, ref),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.secondaryBackground,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            // Left: Mini route thumbnail
            Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                color: AppColors.primaryBackground,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: CustomPaint(
                painter: _MiniSnakePainter(session.points),
              ),
            ),
            const SizedBox(width: 16),

            // Right content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    session.testName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textWhite),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(session.date, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                      const SizedBox(width: 8),
                      Text(session.time, style: const TextStyle(fontSize: 11, color: AppColors.textDim)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 12, color: AppColors.textMuted),
                      const SizedBox(width: 2),
                      Text("${session.distance} km", style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                      const SizedBox(width: 12),
                      const Icon(Icons.access_time_rounded, size: 12, color: AppColors.textMuted),
                      const SizedBox(width: 2),
                      Text(session.duration, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      StatusPill(status: session.quality.toLowerCase()),
                      if (session.exported) ...[
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: () => context.push('/history/export/${session.id}'),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.blueGlow.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.primaryAccentBlue.withOpacity(0.3)),
                            ),
                            child: const Text(
                              "✓ Exported",
                              style: TextStyle(color: AppColors.primaryAccentBlue, fontSize: 9, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                      ]
                    ],
                  )
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showActionSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.elevatedCard,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(20))),
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 16), decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
            ListTile(
              leading: const Icon(Icons.analytics_outlined, color: AppColors.textWhite),
              title: const Text("View Analytics Report", style: TextStyle(color: AppColors.textWhite)),
              onTap: () {
                Navigator.pop(context);
                context.push('/history/report/${session.id}');
              },
            ),
            ListTile(
              leading: const Icon(Icons.share_outlined, color: AppColors.textWhite),
              title: const Text("Share Logs Session", style: TextStyle(color: AppColors.textWhite)),
              onTap: () {
                Navigator.pop(context);
                // Share action mock
              },
            ),
            ListTile(
              leading: const Icon(Icons.cloud_upload_outlined, color: AppColors.textWhite),
              title: const Text("Export Logs To Cloud / SFTP", style: TextStyle(color: AppColors.textWhite)),
              onTap: () {
                Navigator.pop(context);
                context.push('/history/export/${session.id}');
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline_rounded, color: AppColors.errorRed),
              title: const Text("Delete Session Logs", style: TextStyle(color: AppColors.errorRed)),
              onTap: () {
                ref.read(historyProvider.notifier).deleteSession(session.id);
                Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniSnakePainter extends CustomPainter {
  final List<RoutePoint> points;

  _MiniSnakePainter(this.points);

  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty) return;

    final p = Paint()
      ..color = AppColors.successGreen
      ..strokeWidth = 3.0
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final path = Path();
    
    // Scale local point offsets to thumbnail box coordinates
    double getX(double lng, double minLng, double maxLng) {
      double d = maxLng - minLng;
      if (d == 0) return size.width / 2;
      return 10 + ((lng - minLng) / d) * (size.width - 20);
    }

    double getY(double lat, double minLat, double maxLat) {
      double d = maxLat - minLat;
      if (d == 0) return size.height / 2;
      return 10 + ((maxLat - lat) / d) * (size.height - 20);
    }

    final lats = points.map((pt) => pt.lat).toList();
    final lngs = points.map((pt) => pt.lng).toList();

    double minLat = lats.reduce((a, b) => a < b ? a : b);
    double maxLat = lats.reduce((a, b) => a > b ? a : b);
    double minLng = lngs.reduce((a, b) => a < b ? a : b);
    double maxLng = lngs.reduce((a, b) => a > b ? a : b);

    path.moveTo(getX(points[0].lng, minLng, maxLng), getY(points[0].lat, minLat, maxLat));

    for (int i = 1; i < points.length; i++) {
      path.lineTo(getX(points[i].lng, minLng, maxLng), getY(points[i].lat, minLat, maxLat));
    }

    canvas.drawPath(path, p);
  }

  @override
  bool shouldRepaint(covariant _MiniSnakePainter oldDelegate) =>
      oldDelegate.points != points;
}
