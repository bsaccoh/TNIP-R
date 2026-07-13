import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/theme/app_theme.dart';
import '../../app/providers/state_providers.dart';
import '../../core/models/app_models.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationsProvider);

    return Scaffold(
      backgroundColor: AppColors.dynamicBackground,
      appBar: AppBar(
        backgroundColor: AppColors.dynamicBackground,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
          onPressed: () => context.pop(),
        ),
        title: Text("Notifications", style: AppTextStyles.h3.copyWith(fontWeight: FontWeight.bold)),
        centerTitle: true,
        actions: [
          TextButton(
            onPressed: () {
              ref.read(notificationsProvider.notifier).markAllRead();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text("All notifications marked as read"),
                  backgroundColor: AppColors.primaryBlue,
                ),
              );
            },
            child: Text(
              "Mark all read",
              style: AppTextStyles.small.copyWith(
                color: AppColors.primaryBlue,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
      body: notifications.isEmpty
          ? _buildEmptyState()
          : ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: notifications.length,
              itemBuilder: (context, index) {
                final item = notifications[index];
                return _buildNotificationCard(item);
              },
            ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.notifications_off_outlined, size: 48, color: AppColors.textLight),
          const SizedBox(height: 12),
          Text(
            "No notifications yet.",
            style: AppTextStyles.body.copyWith(color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationCard(NotificationItem item) {
    final cardBg = item.isUnread
        ? (AppColors.isDark ? const Color(0xFF1F2943) : AppColors.blueLightBG)
        : AppColors.dynamicCard;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.dynamicBorder),
      ),
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Unread Left accent bar
            if (item.isUnread)
              Container(
                width: 3,
                decoration: const BoxDecoration(
                  color: AppColors.primaryBlue,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(12),
                    bottomLeft: Radius.circular(12),
                  ),
                ),
              ),
            
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Icon Circle
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: item.iconColor.withOpacity(0.15),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(item.icon, color: item.iconColor, size: 20),
                    ),
                    const SizedBox(width: 12),
                    // Content
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.title,
                            style: AppTextStyles.body.copyWith(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            item.body,
                            style: AppTextStyles.small.copyWith(color: AppColors.textSecondary, height: 1.4),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            item.time,
                            style: AppTextStyles.micro.copyWith(color: AppColors.textLight),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
