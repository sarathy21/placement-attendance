import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/widgets.dart';
import '../../sessions/presentation/session_detail_screen.dart';
import '../data/models/notification_model.dart';
import 'providers/notifications_provider.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(unreadCountNotifierProvider.notifier).fetchUnreadCount();
    });
  }

  void _handleNotificationTap(NotificationModel notification) {
    if (!notification.isRead) {
      ref.read(notificationsNotifierProvider.notifier).markAsRead(notification.id);
    }

    // Payload Navigation Safety Validation
    final sessionId = notification.sessionId;
    if (sessionId != null && sessionId.isNotEmpty) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => SessionDetailScreen(sessionId: sessionId),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final notificationsAsync = ref.watch(notificationsNotifierProvider);
    final unreadCount = ref.watch(unreadCountNotifierProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          if (unreadCount > 0)
            TextButton.icon(
              onPressed: () {
                ref.read(notificationsNotifierProvider.notifier).markAllAsRead();
              },
              icon: const Icon(Icons.done_all_rounded, color: Colors.white, size: 18),
              label: const Text(
                'Mark All Read',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ),
        ],
      ),
      body: notificationsAsync.when(
        loading: () => const LoadingState(message: 'Loading notifications...'),
        error: (err, stack) => ErrorState(
          message: 'Failed to load notifications',
          onRetry: () {
            ref.read(notificationsNotifierProvider.notifier).fetchNotifications();
          },
        ),
        data: (notifications) {
          if (notifications.isEmpty) {
            return RefreshIndicator(
              onRefresh: () async {
                await ref.read(notificationsNotifierProvider.notifier).fetchNotifications();
              },
              color: AppColors.primary,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: SizedBox(
                  height: MediaQuery.of(context).size.height * 0.6,
                  child: const EmptyState(
                    icon: Icons.notifications_none_outlined,
                    title: 'No Notifications Yet',
                    description: 'Session announcements, schedule changes, and attendance alerts will appear here.',
                  ),
                ),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              await ref.read(notificationsNotifierProvider.notifier).fetchNotifications();
            },
            color: AppColors.primary,
            child: ListView.builder(
              padding: const EdgeInsets.all(16.0),
              itemCount: notifications.length,
              itemBuilder: (context, index) {
                final notification = notifications[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10.0),
                  child: NotificationCard(
                    title: notification.title,
                    message: notification.body,
                    timestamp: notification.timeAgo,
                    isRead: notification.isRead,
                    type: notification.type,
                    onTap: () => _handleNotificationTap(notification),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
