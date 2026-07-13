import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../app/providers/state_providers.dart';
import '../../../core/models/app_models.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../constants/mock_constants.dart';

class MapPage extends ConsumerStatefulWidget {
  const MapPage({super.key});

  @override
  ConsumerState<MapPage> createState() => _MapPageState();
}

class _MapPageState extends ConsumerState<MapPage> {
  String _selectedMetric = "RSRP";
  String _mapStyle = "Dark";
  bool _showStatsDrawer = false;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(dashboardProvider);
    
    // Fallback default points if not recording
    final points = state.recordedPoints.isNotEmpty 
        ? state.recordedPoints 
        : MOCK_HISTORY_SESSIONS[0].points;

    return AppScaffold(
      currentTabIndex: 2,
      showHeader: false, // Map is full-screen
      isFullScreen: true,
      body: Stack(
        children: [
          // 1. DYNAMIC VECTOR STYLIZED MAP CANVAS
          Positioned.fill(
            child: _VectorMapPainterWidget(
              points: points,
              metric: _selectedMetric,
              style: _mapStyle,
            ),
          ),

          // 2. BACK BUTTON (TOP LEFT)
          Positioned(
            top: 16,
            left: 16,
            child: GestureDetector(
              onTap: () => context.go('/dashboard'),
              child: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.secondaryBackground,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: const Icon(Icons.arrow_back_ios_new_rounded, size: 16, color: AppColors.textWhite),
              ),
            ),
          ),

          // 3. TOP METRIC SELECTOR PILL (TOP RIGHT)
          Positioned(
            top: 16,
            right: 16,
            child: GestureDetector(
              onTap: () => _showMetricFilterSheet(context),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.primaryAccentBlue,
                  borderRadius: BorderRadius.circular(999),
                  boxShadow: const [
                    BoxShadow(color: AppColors.blueGlow, blurRadius: 8),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      "$_selectedMetric ▾",
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textWhite),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // 4. RIGHT SIDE FLOATING BUTTONS
          Positioned(
            right: 16,
            top: 76,
            child: Column(
              children: [
                _FloatingMapControl(
                  icon: Icons.layers_outlined,
                  onTap: () => _showMapLayerSheet(context),
                ),
                const SizedBox(height: 8),
                _FloatingMapControl(
                  icon: Icons.speed_rounded,
                  onTap: () => context.push('/tests'),
                ),
                const SizedBox(height: 8),
                _FloatingMapControl(
                  icon: Icons.my_location_rounded,
                  onTap: () => ref.read(dashboardProvider.notifier).startRecording(), // recenter/restart simulation
                ),
              ],
            ),
          ),

          // 5. BOTTOM DRAGGABLE SUMMARY DRAWER
          Positioned(
            bottom: 12,
            left: 12,
            right: 12,
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _showStatsDrawer = !_showStatsDrawer;
                });
              },
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.secondaryBackground.withOpacity(0.92),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Handle
                    Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 12), decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _drawerStat("RSRP", "${state.liveMetric.rsrp} dBm", AppColors.successGreen),
                        _drawerStat("DISTANCE", "${state.distance.toStringAsFixed(1)} km", AppColors.textWhite),
                        _drawerStat("TIME", "${(state.duration ~/ 60)}m ${(state.duration % 60)}s", AppColors.textWhite),
                        _drawerStat("TECH", state.liveMetric.technology, AppColors.purple5G),
                      ],
                    ),
                    if (_showStatsDrawer) ...[
                      const SizedBox(height: 16),
                      const Divider(color: AppColors.border),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("GPS Latency", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                          Text("${state.liveMetric.ping} ms", style: const TextStyle(color: AppColors.textWhite, fontSize: 12, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("Throughput average", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                          Text("${state.liveMetric.speed.toStringAsFixed(1)} Mbps", style: const TextStyle(color: AppColors.textWhite, fontSize: 12, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text("GPS Locked satellites", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                          Text("${state.liveMetric.gpsSatellites} GNSS", style: const TextStyle(color: AppColors.textWhite, fontSize: 12, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ]
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _drawerStat(String label, String val, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
        const SizedBox(height: 2),
        Text(val, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }

  void _showMetricFilterSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.elevatedCard,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24))),
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Select Map Metric Overlay", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textWhite)),
            const SizedBox(height: 16),
            ...["RSRP", "SINR", "Speed", "Latency"].map((m) => ListTile(
              title: Text(m, style: const TextStyle(color: AppColors.textWhite)),
              trailing: _selectedMetric == m ? const Icon(Icons.check, color: AppColors.primaryAccentBlue) : null,
              onTap: () {
                setState(() {
                  _selectedMetric = m;
                });
                Navigator.pop(context);
              },
            )),
          ],
        ),
      ),
    );
  }

  void _showMapLayerSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.elevatedCard,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24))),
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("Map Style Overlay", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textWhite)),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.dark_mode_outlined, color: AppColors.textWhite),
              title: const Text("Dark Street Grid", style: TextStyle(color: AppColors.textWhite)),
              trailing: _mapStyle == "Dark" ? const Icon(Icons.check, color: AppColors.primaryAccentBlue) : null,
              onTap: () {
                setState(() => _mapStyle = "Dark");
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.wb_sunny_outlined, color: AppColors.textWhite),
              title: const Text("Street Map", style: TextStyle(color: AppColors.textWhite)),
              trailing: _mapStyle == "Street" ? const Icon(Icons.check, color: AppColors.primaryAccentBlue) : null,
              onTap: () {
                setState(() => _mapStyle = "Street");
                Navigator.pop(context);
              },
            ),
            ListTile(
              leading: const Icon(Icons.landscape_outlined, color: AppColors.textWhite),
              title: const Text("Heatmap Signal Quality", style: TextStyle(color: AppColors.textWhite)),
              onTap: () {
                Navigator.pop(context);
                context.push('/map/heatmap');
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _FloatingMapControl extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _FloatingMapControl({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: AppColors.secondaryBackground.withOpacity(0.9),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Icon(icon, size: 20, color: AppColors.textWhite),
      ),
    );
  }
}

// ── VECTOR DIAL MAP CANVAS PAINTER ─────────────────────────────────────────
class _VectorMapPainterWidget extends StatelessWidget {
  final List<RoutePoint> points;
  final String metric;
  final String style;

  const _VectorMapPainterWidget({required this.points, required this.metric, required this.style});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: style == "Street" ? const Color(0xFF0F1B2F) : AppColors.primaryBackground,
      child: CustomPaint(
        painter: _MapPainter(points, metric, style),
      ),
    );
  }
}

class _MapPainter extends CustomPainter {
  final List<RoutePoint> points;
  final String metric;
  final String style;

  _MapPainter(this.points, this.metric, this.style);

  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = Colors.white.withOpacity(0.04)
      ..strokeWidth = 1.0;

    // Draw coordinate grids
    for (double i = 0; i < size.width; i += 40) {
      canvas.drawLine(Offset(i, 0), Offset(i, size.height), gridPaint);
    }
    for (double j = 0; j < size.height; j += 40) {
      canvas.drawLine(Offset(0, j), Offset(size.width, j), gridPaint);
    }

    // Draw stylized vector roads
    final roadPaint = Paint()
      ..color = style == "Street" ? Colors.white.withOpacity(0.12) : Colors.white.withOpacity(0.06)
      ..strokeWidth = 8.0
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    canvas.drawLine(Offset(40, 100), Offset(size.width - 40, 150), roadPaint);
    canvas.drawLine(Offset(size.width / 2, 20), Offset(size.width / 2 - 50, size.height - 40), roadPaint);
    canvas.drawLine(Offset(20, size.height - 180), Offset(size.width - 20, size.height - 180), roadPaint);

    if (points.isEmpty) return;

    // Scale coordinates to fit screen
    double getX(double lat, double lng) {
      // mapping simulation points center coordinates
      return size.width / 2 + (lng - (-13.234)) * 90000;
    }

    double getY(double lat, double lng) {
      return size.height / 2 - (lat - 8.484) * 90000;
    }

    // Draw route segments color coded
    for (int i = 0; i < points.length - 1; i++) {
      final p1 = points[i];
      final p2 = points[i + 1];

      final Color segColor;
      if (metric == "RSRP") {
        final r = p1.rsrp;
        if (r >= -80) segColor = AppColors.successGreen;
        else if (r >= -90) segColor = AppColors.goodGreen;
        else if (r >= -100) segColor = AppColors.warningAmber;
        else segColor = AppColors.errorRed;
      } else if (metric == "SINR") {
        final s = p1.sinr;
        if (s >= 15) segColor = AppColors.successGreen;
        else if (s >= 8) segColor = AppColors.goodGreen;
        else if (s >= 0) segColor = AppColors.warningAmber;
        else segColor = AppColors.errorRed;
      } else {
        final sp = p1.speed;
        if (sp >= 120) segColor = AppColors.successGreen;
        else if (sp >= 60) segColor = AppColors.goodGreen;
        else if (sp >= 20) segColor = AppColors.warningAmber;
        else segColor = AppColors.errorRed;
      }

      final paintSegment = Paint()
        ..color = segColor
        ..strokeWidth = 5.0
        ..strokeCap = StrokeCap.round
        ..style = PaintingStyle.stroke;

      canvas.drawLine(
        Offset(getX(p1.lat, p1.lng), getY(p1.lat, p1.lng)),
        Offset(getX(p2.lat, p2.lng), getY(p2.lat, p2.lng)),
        paintSegment,
      );
    }

    // Draw small data points
    final dotPaint = Paint()..style = PaintingStyle.fill;
    for (var pt in points) {
      final Color ptColor;
      final r = pt.rsrp;
      if (r >= -80) ptColor = AppColors.successGreen;
      else if (r >= -90) ptColor = AppColors.goodGreen;
      else if (r >= -100) ptColor = AppColors.warningAmber;
      else ptColor = AppColors.errorRed;

      dotPaint.color = ptColor;
      canvas.drawCircle(Offset(getX(pt.lat, pt.lng), getY(pt.lat, pt.lng)), 3.0, dotPaint);
    }

    // Draw location marker pulsing
    final last = points.last;
    final centerLoc = Offset(getX(last.lat, last.lng), getY(last.lat, last.lng));
    
    // Outer glow
    canvas.drawCircle(
      centerLoc,
      14.0,
      Paint()
        ..color = AppColors.primaryAccentBlue.withOpacity(0.18)
        ..style = PaintingStyle.fill,
    );
    // Core marker
    canvas.drawCircle(
      centerLoc,
      6.0,
      Paint()
        ..color = Colors.white
        ..style = PaintingStyle.fill,
    );
    canvas.drawCircle(
      centerLoc,
      4.0,
      Paint()
        ..color = AppColors.primaryAccentBlue
        ..style = PaintingStyle.fill,
    );
  }

  @override
  bool shouldRepaint(covariant _MapPainter oldDelegate) =>
      oldDelegate.points != points || oldDelegate.metric != metric || oldDelegate.style != style;
}
