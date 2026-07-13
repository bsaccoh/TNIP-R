import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'dashboard/dashboard_screen.dart';
import 'speed_test/speed_test_screen.dart';
import 'complaints/complaints_screen.dart';
import 'profile/profile_screen.dart';
import '../app/theme/app_theme.dart';

class MainScaffold extends StatefulWidget {
  final int initialTab;

  const MainScaffold({super.key, this.initialTab = 0});

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialTab;
  }

  void _onTabChanged(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    // Determine screen to render
    Widget activeBody;
    switch (_currentIndex) {
      case 1:
        activeBody = const SpeedTestScreen();
        break;
      case 3:
        activeBody = const ComplaintsScreen();
        break;
      case 4:
        activeBody = const ProfileScreen();
        break;
      default:
        activeBody = DashboardScreen(onTabChanged: _onTabChanged);
    }

    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      body: activeBody,
      bottomNavigationBar: Container(
        height: 64 + MediaQuery.of(context).padding.bottom,
        decoration: BoxDecoration(
          color: AppColors.dynamicCard,
          border: const Border(top: BorderSide(color: AppColors.border, width: 1.0)),
          boxShadow: const [
            BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, -2)),
          ],
        ),
        child: SafeArea(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildTabItem(0, Icons.home_outlined, Icons.home_rounded, "Home"),
              _buildTabItem(1, Icons.speed_outlined, Icons.speed_rounded, "Speed"),
              
              // 3. Center elevated report FAB
              _buildReportFAB(context),

              _buildTabItem(3, Icons.assignment_outlined, Icons.assignment_rounded, "Complaints"),
              _buildTabItem(4, Icons.person_outline_rounded, Icons.person_rounded, "Profile"),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTabItem(int index, IconData outlineIcon, IconData filledIcon, String label) {
    final isActive = _currentIndex == index;
    final iconColor = isActive ? AppColors.primaryBlue : AppColors.textLight;
    final textColor = isActive ? AppColors.primaryBlue : AppColors.textLight;

    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => _onTabChanged(index),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(isActive ? filledIcon : outlineIcon, color: iconColor, size: 22),
            const SizedBox(height: 4),
            Text(
              label,
              style: AppTextStyles.micro.copyWith(
                color: textColor,
                fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReportFAB(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => context.push('/report'),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Transform.translate(
              offset: const Offset(0, -12),
              child: Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: AppColors.primaryBlue,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryBlue.withOpacity(0.4),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                alignment: Alignment.center,
                child: const Icon(Icons.add_rounded, color: Colors.white, size: 26),
              ),
            ),
            Transform.translate(
              offset: const Offset(0, -6),
              child: Text(
                "Report",
                style: AppTextStyles.micro.copyWith(
                  color: AppColors.primaryBlue,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
