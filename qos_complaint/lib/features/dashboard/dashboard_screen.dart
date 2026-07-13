import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';
import '../../app/providers/state_providers.dart';
import '../../core/models/app_models.dart';

class DashboardScreen extends ConsumerWidget {
  final Function(int) onTabChanged;

  const DashboardScreen({super.key, required this.onTabChanged});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final complaints = ref.watch(complaintsProvider);
    final notifications = ref.watch(notificationsProvider);
    final unreadCount = notifications.where((n) => n.isUnread).length;

    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(70),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text("Hello, Mariama 👋", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  Text("Let's improve our network together", style: AppTextStyles.small),
                ],
              ),
              Stack(
                children: [
                  IconButton(
                    icon: const Icon(Icons.notifications_none_rounded, color: AppColors.textPrimary, size: 26),
                    onPressed: () => context.push('/notifications'),
                  ),
                  if (unreadCount > 0)
                    Positioned(
                      right: 12,
                      top: 12,
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: AppColors.errorRed,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero Banner Card
            _buildHeroCard(context),
            const SizedBox(height: 24),

            // Quick Actions
            Text("Quick Actions", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                _quickActionItem(context, Icons.map_outlined, "Check Coverage", AppColors.primaryBlue, () => onTabChanged(1)),
                const SizedBox(width: 10),
                _quickActionItem(context, Icons.analytics_outlined, "Network Status", AppColors.accentGreen, () => context.push('/network-status')),
                const SizedBox(width: 10),
                _quickActionItem(context, Icons.assignment_outlined, "My Complaints", AppColors.warningOrange, () => onTabChanged(3)),
                const SizedBox(width: 10),
                _quickActionItem(context, Icons.help_outline_rounded, "Help Center", AppColors.closedGrey, () {}),
              ],
            ),
            const SizedBox(height: 24),

            // Network Status Card (Your Area)
            _buildNetworkStatusCard(context),
            const SizedBox(height: 24),

            // Recent Complaints Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("Recent Complaints", style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold)),
                TextButton(
                  onPressed: () => onTabChanged(3),
                  child: Text("View all \u203a", style: AppTextStyles.small.copyWith(color: AppColors.primaryBlue, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Recent items list
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: complaints.length > 2 ? 2 : complaints.length,
              itemBuilder: (context, index) {
                final complaint = complaints[index];
                return _buildComplaintCard(context, complaint);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeroCard(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 140,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF1A3C8F), Color(0xFF2451B3)],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryBlue.withOpacity(0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Background signal waves overlay illustration
          Positioned(
            right: -10,
            top: 0,
            bottom: 0,
            child: Opacity(
              opacity: 0.16,
              child: CustomPaint(
                size: const Size(130, 130),
                painter: _HeroWavesPainter(),
              ),
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  "Report Network Issue",
                  style: AppTextStyles.h3.copyWith(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),
                Text(
                  "Facing call drops, slow internet,\nor no signal? Let us know.",
                  style: AppTextStyles.micro.copyWith(color: Colors.white.withOpacity(0.85), fontSize: 12),
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () => context.push('/report'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AppColors.primaryBlue,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                  child: Text(
                    "Report Now",
                    style: AppTextStyles.small.copyWith(
                      color: AppColors.primaryBlue,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _quickActionItem(BuildContext context, IconData icon, String label, Color color, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
          decoration: BoxDecoration(
            color: AppColors.dynamicCard,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.dynamicBorder),
            boxShadow: const [
              BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 2)),
            ],
          ),
          child: Column(
            children: [
              Icon(icon, size: 28, color: color),
              const SizedBox(height: 8),
              Text(
                label,
                style: AppTextStyles.micro.copyWith(
                  color: AppColors.textSecondary,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNetworkStatusCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.dynamicCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.dynamicBorder),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 3)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Network Status (Your Area)",
                style: AppTextStyles.small.copyWith(fontWeight: FontWeight.bold, color: AppColors.dynamicTextPrimary),
              ),
              Text("Updated 10:30 AM", style: AppTextStyles.micro.copyWith(color: AppColors.textLight)),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const Icon(Icons.location_on_outlined, size: 14, color: AppColors.textSecondary),
              const SizedBox(width: 4),
              Text("Kenema District, Sierra Leone", style: AppTextStyles.small),
            ],
          ),
          const Divider(height: 20, color: AppColors.border),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Overall Network Quality", style: AppTextStyles.micro),
                    const SizedBox(height: 2),
                    Text(
                      "Fair",
                      style: AppTextStyles.h3.copyWith(color: AppColors.warningOrange, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      "2.9 / 5",
                      style: AppTextStyles.h1.copyWith(fontSize: 36, fontWeight: FontWeight.bold, height: 1.0),
                    ),
                    Text("Avg. Quality Score", style: AppTextStyles.micro),
                  ],
                ),
              ),
              SizedBox(
                width: 140,
                height: 70,
                child: CustomPaint(
                  painter: _SparklinePainter(),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Operator scores
          Row(
            children: [
              _operatorMiniScore("Africell", "2.6/5", const Color(0xFF7B1FA2)),
              const SizedBox(width: 8),
              _operatorMiniScore("Orange", "3.1/5", const Color(0xFFF5A623)),
              const SizedBox(width: 8),
              _operatorMiniScore("Sierra Tel", "2.8/5", const Color(0xFF1A3C8F)),
              const SizedBox(width: 8),
              _operatorMiniScore("Qcell", "2.7/5", const Color(0xFFE53935)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _operatorMiniScore(String name, String score, Color barColor) {
    double scorePct = (double.tryParse(score.split('/')[0]) ?? 2.5) / 5.0;
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            name,
            style: AppTextStyles.micro.copyWith(fontSize: 10, overflow: TextOverflow.ellipsis),
          ),
          const SizedBox(height: 2),
          Text(score, style: AppTextStyles.small.copyWith(fontWeight: FontWeight.bold, color: AppColors.dynamicTextPrimary)),
          const SizedBox(height: 4),
          Container(
            height: 4,
            width: double.infinity,
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(2),
            ),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: scorePct.clamp(0.0, 1.0),
              child: Container(
                decoration: BoxDecoration(
                  color: barColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildComplaintCard(BuildContext context, ComplaintItem complaint) {
    final statusColor = _getStatusColor(complaint.status);
    return Card(
      color: AppColors.dynamicCard,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.dynamicBorder),
        ),
        child: InkWell(
          onTap: () => context.push('/complaint-details', extra: complaint),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.dynamicBackground,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.cell_tower_rounded, color: AppColors.textLight, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      complaint.issueType,
                      style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 2),
                    Text("Operator: ${complaint.operatorName}", style: AppTextStyles.micro),
                    Text(complaint.areaDetail, style: AppTextStyles.micro),
                    const SizedBox(height: 4),
                    Text(complaint.createdAt, style: AppTextStyles.micro.copyWith(color: AppColors.textLight)),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _getStatusLabel(complaint.status),
                      style: AppTextStyles.micro.copyWith(
                        color: statusColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Icon(Icons.chevron_right_rounded, color: AppColors.textLight, size: 18),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'IN_PROGRESS': return AppColors.progressYellow;
      case 'RESOLVED': return AppColors.successGreen;
      case 'CLOSED': return AppColors.closedGrey;
      default: return AppColors.primaryBlue;
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'IN_PROGRESS': return "In Progress";
      case 'RESOLVED': return "Resolved";
      case 'CLOSED': return "Closed";
      default: return "Open";
    }
  }
}

class _HeroWavesPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    final cx = size.width;
    final cy = size.height / 2;

    canvas.drawArc(Rect.fromCircle(center: Offset(cx, cy), radius: 30), -pi, pi, false, paint);
    canvas.drawArc(Rect.fromCircle(center: Offset(cx, cy), radius: 60), -pi, pi, false, paint);
    canvas.drawArc(Rect.fromCircle(center: Offset(cx, cy), radius: 90), -pi, pi, false, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _SparklinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.warningOrange
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;

    final path = Path();
    final points = [
      Offset(0, size.height * 0.7),
      Offset(size.width * 0.15, size.height * 0.4),
      Offset(size.width * 0.3, size.height * 0.6),
      Offset(size.width * 0.45, size.height * 0.3),
      Offset(size.width * 0.6, size.height * 0.5),
      Offset(size.width * 0.75, size.height * 0.2),
      Offset(size.width * 0.9, size.height * 0.4),
      Offset(size.width, size.height * 0.35),
    ];

    path.moveTo(points[0].dx, points[0].dy);
    for (int i = 0; i < points.length - 1; i++) {
      final xc = (points[i].dx + points[i + 1].dx) / 2;
      final yc = (points[i].dy + points[i + 1].dy) / 2;
      path.quadraticBezierTo(points[i].dx, points[i].dy, xc, yc);
    }
    path.lineTo(points.last.dx, points.last.dy);
    canvas.drawPath(path, paint);

    // Draw dots at peaks (high values = low Y)
    final dotPaint = Paint()
      ..color = AppColors.warningOrange
      ..style = PaintingStyle.fill;
    
    // Draw dot at index 5 which represents highest peak
    canvas.drawCircle(points[5], 4.0, dotPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
