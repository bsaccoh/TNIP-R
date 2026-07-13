import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme/app_colors.dart';
import '../../../app/theme/app_text_styles.dart';
import '../../../app/providers/state_providers.dart';
import '../../../core/widgets/app_scaffold.dart';
import '../../../shared/widgets/telecom_animated_background.dart';

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(dashboardProvider);

    return Scaffold(
      backgroundColor: AppColors.primaryBackground,
      body: Stack(
        children: [
          // 1. Immersive Animated Background
          const Positioned.fill(
            child: TelecomAnimatedBackground(
              intensity: "home",
              showWifiArcs: true,
              showParticles: true,
              showDataStreams: true,
              showGrid: true,
            ),
          ),

          // 2. Main scrollable content
          SafeArea(
            child: Column(
              children: [
                // Top Simulated Status bar
                Container(
                  height: 38,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "09:14",
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textWhite),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text("5G-NSA", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.purple5G)),
                          const SizedBox(width: 6),
                          const Icon(Icons.signal_cellular_alt_rounded, size: 14, color: AppColors.textWhite),
                          const SizedBox(width: 6),
                          Container(
                            width: 18,
                            height: 9,
                            decoration: BoxDecoration(
                              border: Border.all(color: Colors.white38),
                              borderRadius: BorderRadius.circular(2.5),
                            ),
                            padding: const EdgeInsets.all(1),
                            child: Align(
                              alignment: Alignment.centerLeft,
                              child: Container(width: 12, height: double.infinity, color: AppColors.goodGreen),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Scroll body
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.only(left: 16, right: 16, bottom: 90),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header (Greeting + actions)
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: const [
                                  Text("Good Morning,", style: TextStyle(fontSize: 13, color: AppColors.textMuted, fontWeight: FontWeight.w500)),
                                  SizedBox(height: 2),
                                  Text("Engineer Ahmed", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textWhite)),
                                ],
                              ),
                            ),
                            // Notification bell
                            GestureDetector(
                              onTap: () => context.push('/alerts'),
                              child: Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: AppColors.secondaryBackground,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: Stack(
                                  alignment: Alignment.center,
                                  children: [
                                    const Icon(Icons.notifications_none_rounded, color: AppColors.textWhite, size: 20),
                                    Positioned(
                                      top: 10,
                                      right: 10,
                                      child: Container(
                                        width: 8,
                                        height: 8,
                                        decoration: const BoxDecoration(color: AppColors.errorRed, shape: BoxShape.circle),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            // User avatar
                            GestureDetector(
                              onTap: () => context.push('/settings'),
                              child: Container(
                                width: 40,
                                height: 40,
                                decoration: const BoxDecoration(
                                  gradient: LinearGradient(colors: [AppColors.primaryAccentBlue, AppColors.purple5G]),
                                  shape: BoxShape.circle,
                                ),
                                alignment: Alignment.center,
                                child: const Text("EA", style: TextStyle(color: AppColors.textWhite, fontWeight: FontWeight.bold, fontSize: 13)),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        // Network active strip card
                        ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(
                                color: AppColors.secondaryBackground.withOpacity(0.7),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: AppColors.border),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        width: 8,
                                        height: 8,
                                        decoration: const BoxDecoration(color: AppColors.successGreen, shape: BoxShape.circle),
                                      ),
                                      const SizedBox(width: 8),
                                      const Text("Network Active", style: TextStyle(color: AppColors.successGreen, fontSize: 12, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.purple5GBg,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text("5G-NSA", style: TextStyle(color: Color(0xFFB794FF), fontSize: 9, fontWeight: FontWeight.bold)),
                                  ),
                                  Row(
                                    children: [
                                      Container(width: 6, height: 6, decoration: const BoxDecoration(color: AppColors.warningAmber, shape: BoxShape.circle)),
                                      const SizedBox(width: 6),
                                      const Text("Orange SL", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                                    ],
                                  )
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Horizontal Quick Stats row
                        SizedBox(
                          height: 95,
                          child: ListView(
                            scrollDirection: Axis.horizontal,
                            children: [
                              _quickStatCard(context, Icons.signal_cellular_alt_rounded, "-81 dBm", "RSRP", AppColors.successGreen, '/cell-details'),
                              _quickStatCard(context, Icons.speed_rounded, "185 Mbps", "DOWNLOAD", AppColors.primaryAccentBlue, '/tests/speed'),
                              _quickStatCard(context, Icons.network_ping_rounded, "29 ms", "PING", AppColors.warningAmber, '/tests/ping'),
                            ],
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Services Section Header
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text("Services", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textWhite)),
                            GestureDetector(
                              onTap: () {},
                              child: const Text("View All", style: TextStyle(fontSize: 12, color: AppColors.primaryAccentBlue, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),

                        // Service Cards (2x4 Grid)
                        GridView.count(
                          crossAxisCount: 2,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          crossAxisSpacing: 12,
                          mainAxisSpacing: 12,
                          childAspectRatio: 1.15,
                          children: [
                            _serviceCard(context, Icons.directions_car_rounded, "Drive Test", "Start network logging", "Ready", AppColors.successGreen, '/dashboard'),
                            _serviceCard(context, Icons.map_outlined, "Live Map", "View coverage map", "Active", AppColors.primaryAccentBlue, '/map'),
                            _serviceCard(context, Icons.speed_rounded, "Speed Test", "Measure DL & UL speeds", "Tap to start", AppColors.textMuted, '/tests/speed'),
                            _serviceCard(context, Icons.analytics_outlined, "Active Tests", "QoS · QoE test suite", "Running", AppColors.warningAmber, '/tests'),
                            _serviceCard(context, Icons.cell_tower_rounded, "Cell Details", "Serving + Neighbors", "5G-NSA", AppColors.purple5G, '/cell-details'),
                            _serviceCard(context, Icons.history_rounded, "Test History", "View past logs history", "6 sessions", AppColors.textMuted, '/history'),
                            _serviceCard(context, Icons.layers_outlined, "Heatmap", "Coverage thermal blobs", "View coverage", AppColors.textMuted, '/map/heatmap'),
                            _serviceCard(context, Icons.notifications_none_rounded, "Alerts Feed", "Network events logs", "3 new alerts", AppColors.errorRed, '/alerts'),
                          ],
                        ),
                        const SizedBox(height: 24),

                        // Recent Activity Section
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text("Recent Activity", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textWhite)),
                            GestureDetector(
                              onTap: () => context.push('/history'),
                              child: const Text("See All", style: TextStyle(fontSize: 12, color: AppColors.primaryAccentBlue, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),

                        _activityRow(Icons.directions_car_rounded, AppColors.successGreen, "Drive Test Completed", "Jul 11 · 23.4 km · GOOD", "2h ago"),
                        _activityRow(Icons.speed_rounded, AppColors.primaryAccentBlue, "Speed Test Run", "185 Mbps DL · 42 Mbps UL", "3h ago"),
                        _activityRow(Icons.warning_amber_rounded, AppColors.warningAmber, "5G → 4G Handover", "Detected at 1.2km marker", "4h ago"),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        height: 72,
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.border, width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: 0, // Home active
          onTap: (index) {
            switch (index) {
              case 0:
                context.go('/home');
                break;
              case 1:
                context.go('/dashboard');
                break;
              case 2:
                context.go('/map');
                break;
              case 3:
                context.go('/tests');
                break;
              case 4:
                context.go('/history');
                break;
            }
          },
          type: BottomNavigationBarType.fixed,
          showUnselectedLabels: true,
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.home_outlined), label: "Home"),
            BottomNavigationBarItem(icon: Icon(Icons.radar_rounded), label: "Monitor"),
            BottomNavigationBarItem(icon: Icon(Icons.map_outlined), label: "Route"),
            BottomNavigationBarItem(icon: Icon(Icons.speed_rounded), label: "Tests"),
            BottomNavigationBarItem(icon: Icon(Icons.history_rounded), label: "Logs"),
          ],
        ),
      ),
    );
  }

  Widget _quickStatCard(BuildContext context, IconData icon, String value, String label, Color color, String route) {
    return GestureDetector(
      onTap: () => context.push(route),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
          child: Container(
            width: 112,
            margin: const EdgeInsets.only(right: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.secondaryBackground.withOpacity(0.8),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 16, color: color),
                const SizedBox(height: 6),
                Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textWhite)),
                Text(label, style: const TextStyle(fontSize: 8, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _serviceCard(BuildContext context, IconData icon, String title, String desc, String status, Color color, String route) {
    return GestureDetector(
      onTap: () => context.push(route),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.secondaryBackground.withOpacity(0.85),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(icon, size: 18, color: color == AppColors.textMuted ? AppColors.primaryAccentBlue : color),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(status, style: TextStyle(color: color == AppColors.textMuted ? AppColors.textMuted : color, fontSize: 9, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textWhite)),
                const SizedBox(height: 2),
                Text(desc, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 10, color: AppColors.textMuted)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _activityRow(IconData icon, Color color, String title, String subtitle, String time) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.secondaryBackground,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: color.withOpacity(0.12), shape: BoxShape.circle),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textWhite)),
                const SizedBox(height: 2),
                Text(subtitle, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
              ],
            ),
          ),
          Text(time, style: const TextStyle(fontSize: 10, color: AppColors.textDim)),
          const SizedBox(width: 4),
          const Icon(Icons.arrow_forward_ios_rounded, size: 10, color: AppColors.inactiveNavIcon),
        ],
      ),
    );
  }
}
