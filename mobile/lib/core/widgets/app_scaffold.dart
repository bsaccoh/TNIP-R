import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_colors.dart';
import '../../app/theme/app_text_styles.dart';

class AppScaffold extends StatefulWidget {
  final Widget body;
  final String? title;
  final String? subtitle;
  final int? currentTabIndex; // 0: Home, 1: Map, 2: Test (center), 3: Reports, 4: More (opens drawer)
  final bool showHeader;
  final List<Widget>? headerActions;
  final bool isFullScreen;

  const AppScaffold({
    super.key,
    required this.body,
    this.title,
    this.subtitle,
    this.currentTabIndex,
    this.showHeader = true,
    this.headerActions,
    this.isFullScreen = false,
  });

  @override
  State<AppScaffold> createState() => _AppScaffoldState();
}

class _AppScaffoldState extends State<AppScaffold> {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.surfaceGray,
      // 1. NatCA Dark Navy Side Drawer
      drawer: _buildDrawer(context),
      body: SafeArea(
        child: Column(
          children: [
            // 2. TOP SIMULATED STATUS BAR (Light Theme compliance)
            Container(
              height: 38,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              color: AppColors.primaryBackground,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    "09:14",
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        "LTE",
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: AppColors.lightBlue,
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Icon(Icons.signal_cellular_alt_rounded, size: 14, color: AppColors.textPrimary),
                      const SizedBox(width: 6),
                      Container(
                        width: 18,
                        height: 9,
                        decoration: BoxDecoration(
                          border: Border.all(color: AppColors.textSecondary.withOpacity(0.5)),
                          borderRadius: BorderRadius.circular(2.5),
                        ),
                        padding: const EdgeInsets.all(1),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Container(
                            width: 12,
                            height: double.infinity,
                            color: AppColors.successGreen,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // 3. NAV HEADER (Light Theme custom header)
            if (widget.showHeader && (widget.title != null || widget.currentTabIndex == null))
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.primaryBackground,
                  border: const Border(
                    bottom: BorderSide(color: AppColors.borderLight, width: 1),
                  ),
                ),
                child: Row(
                  children: [
                    if (widget.currentTabIndex == null) ...[
                      GestureDetector(
                        onTap: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go('/dashboard');
                          }
                        },
                        child: const Icon(
                          Icons.arrow_back_ios_new_rounded,
                          size: 20,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(width: 12),
                    ],
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.title ?? '',
                            style: AppTextStyles.screenTitle.copyWith(fontSize: 20),
                          ),
                          if (widget.subtitle != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              widget.subtitle!,
                              style: AppTextStyles.caption,
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (widget.headerActions != null) ...widget.headerActions!,
                    if (widget.headerActions == null && widget.currentTabIndex != null) ...[
                      IconButton(
                        icon: const Icon(Icons.notifications_none_rounded, color: AppColors.textPrimary),
                        onPressed: () => context.push('/alerts'),
                      ),
                    ]
                  ],
                ),
              ),

            // 4. PAGE BODY
            Expanded(
              child: widget.isFullScreen
                  ? widget.body
                  : Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 850),
                        child: widget.body,
                      ),
                    ),
            ),
          ],
        ),
      ),

      // 5. PERSISTENT BOTTOM NAVIGATION BAR WITH ELEVATED CENTER FAB
      bottomNavigationBar: widget.currentTabIndex != null
          ? Container(
              height: 72,
              decoration: BoxDecoration(
                color: AppColors.primaryBackground,
                boxShadow: const [
                  BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, -2)),
                ],
                border: const Border(
                  top: BorderSide(color: AppColors.borderLight, width: 1),
                ),
              ),
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  // Standard bottom row tabs
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildNavItem(context, 0, Icons.home_outlined, Icons.home_rounded, "Home", '/dashboard'),
                      _buildNavItem(context, 1, Icons.map_outlined, Icons.map_rounded, "Map", '/map'),
                      // Center space gap for elevated center FAB
                      const SizedBox(width: 60),
                      _buildNavItem(context, 3, Icons.analytics_outlined, Icons.analytics_rounded, "Reports", '/reports'),
                      // More tab opens side drawer
                      _buildMoreNavItem(4, Icons.menu_rounded, "More"),
                    ],
                  ),
                  // Center elevated signal FAB button
                  Positioned(
                    top: -18,
                    left: MediaQuery.of(context).size.width / 2 - 28,
                    child: GestureDetector(
                      onTap: () => context.go('/drive-test'),
                      child: Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: AppColors.accentBlue,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.accentBlue.withOpacity(0.35),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.cell_tower_rounded,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            )
          : null,
    );
  }

  Widget _buildNavItem(BuildContext context, int index, IconData outlineIcon, IconData solidIcon, String label, String route) {
    final isActive = widget.currentTabIndex == index;
    final color = isActive ? AppColors.lightBlue : AppColors.textMuted;
    return GestureDetector(
      onTap: () => context.go(route),
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 60,
        height: 72,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(isActive ? solidIcon : outlineIcon, color: color, size: 22),
            const SizedBox(height: 4),
            Text(
              label,
              style: AppTextStyles.bottomNavLabel.copyWith(
                color: color,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMoreNavItem(int index, IconData icon, String label) {
    final isActive = widget.currentTabIndex == index;
    final color = isActive ? AppColors.lightBlue : AppColors.textMuted;
    return GestureDetector(
      onTap: () {
        _scaffoldKey.currentState?.openDrawer();
      },
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 60,
        height: 72,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 4),
            Text(
              label,
              style: AppTextStyles.bottomNavLabel.copyWith(
                color: color,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawer(BuildContext context) {
    return Drawer(
      width: 280,
      backgroundColor: AppColors.primaryBlue,
      child: Column(
        children: [
          // Drawer Header
          Container(
            padding: const EdgeInsets.only(top: 60, left: 24, right: 16, bottom: 24),
            decoration: const BoxDecoration(
              color: Color(0xFF131B60), // slightly darker navy accent
              border: Border(bottom: BorderSide(color: Colors.white12)),
            ),
            child: Row(
              children: [
                // Cell tower white line icon
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white30, width: 1.5),
                  ),
                  alignment: Alignment.center,
                  child: const Icon(Icons.cell_tower_rounded, color: Colors.white, size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        "NatCA",
                        style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 1.0),
                      ),
                      SizedBox(height: 2),
                      Text(
                        "Regulator Dashboard",
                        style: TextStyle(color: Colors.white70, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Drawer Body Menu Options
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              children: [
                _buildDrawerItem(context, Icons.dashboard_outlined, "Dashboard", '/dashboard'),
                _buildDrawerItem(context, Icons.map_outlined, "Coverage Map", '/map'),
                _buildDrawerItem(context, Icons.cell_tower_rounded, "Drive Test", '/drive-test'),
                _buildDrawerItem(context, Icons.speed_rounded, "Speed Test", '/tests/speed'),
                _buildDrawerItem(context, Icons.notifications_none_rounded, "Alerts", '/alerts'),
                _buildDrawerItem(context, Icons.analytics_outlined, "Reports", '/reports'),
                _buildDrawerItem(context, Icons.legend_toggle_rounded, "KPI Monitor", '/kpi'),
                _buildDrawerItem(context, Icons.corporate_fare_rounded, "Operators", '/operators'),
                _buildDrawerItem(context, Icons.dns_outlined, "Sites", '/sites'),
                const Divider(color: Colors.white12, height: 24),
                _buildDrawerItem(context, Icons.settings_outlined, "Settings", '/settings'),
                _buildDrawerItem(context, Icons.help_outline_rounded, "Help & Support", '/settings'),
                _buildDrawerItem(context, Icons.logout_rounded, "Logout", '/login'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerItem(BuildContext context, IconData icon, String label, String route) {
    // Basic route highlight logic
    final isSelected = false; // We can add dynamic path checks
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: isSelected ? AppColors.accentBlue : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
      ),
      child: ListTile(
        leading: Icon(icon, color: Colors.white70, size: 20),
        title: Text(
          label,
          style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500),
        ),
        onTap: () {
          Navigator.pop(context); // Close Drawer
          context.go(route);
        },
        horizontalTitleGap: 8,
        visualDensity: const VisualDensity(vertical: -2),
      ),
    );
  }
}
