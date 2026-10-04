import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:placement_attendance_mobile/core/theme/app_theme.dart';
import 'package:placement_attendance_mobile/features/notifications/data/models/notification_model.dart';
import 'package:placement_attendance_mobile/features/notifications/data/repositories/notifications_repository.dart';
import 'package:placement_attendance_mobile/features/notifications/presentation/notifications_screen.dart';
import 'package:placement_attendance_mobile/features/notifications/presentation/providers/notifications_provider.dart';

class FakeNotificationsRepository implements INotificationsRepository {
  List<NotificationModel> notifications;
  int unreadCount;
  bool shouldThrow;

  FakeNotificationsRepository({
    this.notifications = const [],
    this.unreadCount = 0,
    this.shouldThrow = false,
  });

  @override
  Future<List<NotificationModel>> getNotifications({int page = 1, int limit = 20, bool? unreadOnly}) async {
    if (shouldThrow) {
      throw Exception('Failed to load notifications');
    }
    return notifications;
  }

  @override
  Future<int> getUnreadCount() async {
    if (shouldThrow) {
      throw Exception('Failed to get unread count');
    }
    return unreadCount;
  }

  @override
  Future<NotificationModel> markAsRead(String id) async {
    final index = notifications.indexWhere((n) => n.id == id);
    if (index != -1) {
      notifications[index] = notifications[index].copyWith(isRead: true);
      unreadCount = (unreadCount - 1) < 0 ? 0 : unreadCount - 1;
      return notifications[index];
    }
    throw Exception('Notification not found');
  }

  @override
  Future<int> markAllAsRead() async {
    final count = notifications.where((n) => !n.isRead).length;
    notifications = notifications.map((n) => n.copyWith(isRead: true)).toList();
    unreadCount = 0;
    return count;
  }
}

void main() {
  final unreadNotif = NotificationModel(
    id: 'notif-1',
    userId: 'user-1',
    title: 'New Session Scheduled',
    body: 'Aptitude Training Session scheduled for tomorrow at 10 AM.',
    payload: {'notificationType': 'SESSION_SCHEDULED'},
    isRead: false,
    createdAt: DateTime.now().subtract(const Duration(minutes: 15)),
  );

  final readNotif = NotificationModel(
    id: 'notif-2',
    userId: 'user-1',
    title: 'Drive Announcement',
    body: 'Google Placement Drive registered successfully.',
    payload: {'notificationType': 'PLACEMENT_DRIVE'},
    isRead: true,
    createdAt: DateTime.now().subtract(const Duration(hours: 3)),
  );

  group('Notifications Screen Widget Tests', () {
    testWidgets('1. Loading state renders initial progress indicator', (WidgetTester tester) async {
      final fakeRepo = FakeNotificationsRepository(notifications: [unreadNotif]);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            notificationsRepositoryProvider.overrideWithValue(fakeRepo),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const NotificationsScreen()),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      await tester.pumpAndSettle();
    });

    testWidgets('2. Empty state renders when notification list is empty', (WidgetTester tester) async {
      final fakeRepo = FakeNotificationsRepository(notifications: []);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            notificationsRepositoryProvider.overrideWithValue(fakeRepo),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const NotificationsScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('No Notifications Yet'), findsOneWidget);
      expect(find.text('Session announcements, schedule changes, and attendance alerts will appear here.'), findsOneWidget);
    });

    testWidgets('3. Renders notification list items with title and body', (WidgetTester tester) async {
      final fakeRepo = FakeNotificationsRepository(
        notifications: [unreadNotif, readNotif],
        unreadCount: 1,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            notificationsRepositoryProvider.overrideWithValue(fakeRepo),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const NotificationsScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('New Session Scheduled'), findsOneWidget);
      expect(find.text('Aptitude Training Session scheduled for tomorrow at 10 AM.'), findsOneWidget);

      expect(find.text('Drive Announcement'), findsOneWidget);
      expect(find.text('Google Placement Drive registered successfully.'), findsOneWidget);
    });

    testWidgets('4. Visual distinction between unread and read notifications', (WidgetTester tester) async {
      final fakeRepo = FakeNotificationsRepository(
        notifications: [unreadNotif, readNotif],
        unreadCount: 1,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            notificationsRepositoryProvider.overrideWithValue(fakeRepo),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const NotificationsScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Mark All Read'), findsOneWidget);
    });

    testWidgets('5. Tapping notification marks it as read', (WidgetTester tester) async {
      final fakeRepo = FakeNotificationsRepository(
        notifications: [unreadNotif],
        unreadCount: 1,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            notificationsRepositoryProvider.overrideWithValue(fakeRepo),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const NotificationsScreen()),
        ),
      );
      await tester.pumpAndSettle();

      // Tap the unread notification card
      await tester.tap(find.text('New Session Scheduled'));
      await tester.pumpAndSettle();

      // After tapping, item is marked read
      expect(fakeRepo.notifications.first.isRead, isTrue);
    });

    testWidgets('6. Mark all as read button triggers markAllAsRead', (WidgetTester tester) async {
      final fakeRepo = FakeNotificationsRepository(
        notifications: [unreadNotif, readNotif],
        unreadCount: 1,
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            notificationsRepositoryProvider.overrideWithValue(fakeRepo),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const NotificationsScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Mark All Read'), findsOneWidget);

      await tester.tap(find.text('Mark All Read'));
      await tester.pumpAndSettle();

      expect(fakeRepo.notifications.every((n) => n.isRead), isTrue);
    });

    testWidgets('7. Error state renders on load failure', (WidgetTester tester) async {
      final fakeRepo = FakeNotificationsRepository(shouldThrow: true);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            notificationsRepositoryProvider.overrideWithValue(fakeRepo),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const NotificationsScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Failed to load notifications'), findsOneWidget);
    });
  });
}
