import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:placement_attendance_mobile/core/theme/app_theme.dart';
import 'package:placement_attendance_mobile/features/auth/domain/auth_state.dart';
import 'package:placement_attendance_mobile/features/auth/providers/auth_provider.dart';
import 'package:placement_attendance_mobile/features/calendar/domain/placement_drive_model.dart';
import 'package:placement_attendance_mobile/features/calendar/providers/placement_drives_provider.dart';
import 'package:placement_attendance_mobile/features/notifications/data/models/notification_model.dart';
import 'package:placement_attendance_mobile/features/notifications/data/repositories/notifications_repository.dart';
import 'package:placement_attendance_mobile/features/notifications/presentation/providers/notifications_provider.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/session_model.dart';
import 'package:placement_attendance_mobile/features/sessions/presentation/providers/sessions_provider.dart';
import 'package:placement_attendance_mobile/features/sessions/presentation/student_home_screen.dart';

void main() {
  const testStudentUser = UserIdentity(
    id: 'user-stu-123',
    email: 'sarathy@kahedu.edu.in',
    role: UserRole.student,
    status: 'ACTIVE',
    firstName: 'Sarathy',
    lastName: 'Subramanian',
  );

  final testDrive = PlacementDriveModel(
    id: 'drive-001',
    companyName: 'TCS Placement Drive',
    driveDate: DateTime(2026, 10, 25),
    venue: 'Campus Placement Hall A',
    description: 'TCS All India Recruitment Drive',
    status: DriveStatus.upcoming,
    attendanceEnabled: true,
    createdById: 'staff-001',
    createdBy: const {
      'id': 'staff-001',
      'firstName': 'Placement',
      'lastName': 'Officer',
      'staffId': 'PO001',
    },
    rounds: const [],
  );

  Widget createTestWidget({
    AuthState authState = const Authenticated(user: testStudentUser),
    AsyncValue<PlacementDriveModel?> nextDriveState = const AsyncValue.data(null),
    AsyncValue<List<PlacementDriveModel>> drivesState = const AsyncValue.data([]),
    AsyncValue<List<SessionModel>> sessionsState = const AsyncValue.data([]),
  }) {
    return ProviderScope(
      overrides: [
        notificationsRepositoryProvider.overrideWithValue(_DummyNotificationsRepo()),
        authNotifierProvider.overrideWith((ref) => _FakeAuthNotifier(authState)),
        placementDrivesListProvider(null).overrideWith((ref) {
          if (drivesState.isLoading) {
            return Completer<List<PlacementDriveModel>>().future;
          }
          if (drivesState.hasError) {
            return Future.error(drivesState.error!, drivesState.stackTrace);
          }
          return Future.value(drivesState.value ?? []);
        }),
        nextUpcomingDriveProvider.overrideWith((ref) {
          if (nextDriveState.isLoading) {
            return Completer<PlacementDriveModel?>().future;
          }
          if (nextDriveState.hasError) {
            return Future.error(nextDriveState.error!, nextDriveState.stackTrace);
          }
          return Future.value(nextDriveState.value);
        }),
        placementDrivesProvider.overrideWith((ref) {
          if (drivesState.isLoading) {
            return Completer<List<PlacementDriveModel>>().future;
          }
          if (drivesState.hasError) {
            return Future.error(drivesState.error!, drivesState.stackTrace);
          }
          return Future.value(drivesState.value ?? []);
        }),
        studentSessionsListProvider(null).overrideWith((ref) {
          if (sessionsState.isLoading) {
            return Completer<List<SessionModel>>().future;
          }
          if (sessionsState.hasError) {
            return Future.error(sessionsState.error!, sessionsState.stackTrace);
          }
          return Future.value(sessionsState.value ?? []);
        }),
        myAttendanceListProvider.overrideWith((ref) => Future.value([])),
      ],
      child: MaterialApp(
        theme: AppTheme.lightTheme,
        home: const StudentHomeScreen(),
      ),
    );
  }

  group('Student Home Dashboard Widget Tests', () {
    testWidgets('1. Student greeting and name render correctly', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.textContaining('Sarathy Subramanian'), findsOneWidget);
      expect(find.textContaining('University Placement Portal'), findsOneWidget);
    });

    testWidgets('2. Placement drive card renders when data exists', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(nextDriveState: AsyncValue.data(testDrive)));
      await tester.pumpAndSettle();

      expect(find.text('TCS Placement Drive'), findsOneWidget);
      expect(find.text('Campus Placement Hall A'), findsOneWidget);
      expect(find.text('Upcoming'), findsOneWidget);
      expect(find.text('Attendance Required'), findsOneWidget);
    });

    testWidgets('3. Empty drive state renders when no drive exists', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(nextDriveState: const AsyncValue.data(null)));
      await tester.pumpAndSettle();

      expect(find.text('No Upcoming Placement Drives'), findsOneWidget);
      expect(find.text('Browse Calendar'), findsOneWidget);
    });

    testWidgets('4. Session empty state renders cleanly', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('No Sessions Scheduled Today'), findsOneWidget);
    });

    testWidgets('5. Quick actions grid elements are visible', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('My Sessions'), findsOneWidget);
      expect(find.text('Placement Calendar'), findsOneWidget);
      expect(find.text('Notifications'), findsWidgets);
      expect(find.text('My Profile'), findsOneWidget);
    });

    testWidgets('6. Tab navigation changes bottom bar index', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Tap Profile tab item in BottomNavigationBar
      await tester.tap(find.text('Profile'));
      await tester.pumpAndSettle();

      // ProfileScreen details render
      expect(find.text('sarathy@kahedu.edu.in'), findsOneWidget);
    });

    testWidgets('7. Loading state renders when fetching next drive', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        nextDriveState: const AsyncValue.loading(),
      ));
      await tester.pump();

      expect(find.text('Loading upcoming drive...'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsWidgets);
    });

    testWidgets('8. Error state renders when drive fetch fails', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(
        nextDriveState: AsyncValue.error('Network failure', StackTrace.current),
      ));
      await tester.pumpAndSettle();

      expect(find.text('Failed to load placement drives'), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);
    });
  });
}

class _FakeAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  _FakeAuthNotifier(super.initialState);

  @override
  Future<void> restoreSession() async {}

  @override
  Future<bool> login(String email, String password) async => true;

  @override
  Future<bool> updateProfile(dynamic dto) async => true;

  @override
  Future<bool> changePassword(dynamic dto) async => true;

  @override
  Future<void> logout() async {}

  @override
  void onSessionExpired() {}
}

class _DummyNotificationsRepo implements INotificationsRepository {
  @override
  Future<List<NotificationModel>> getNotifications({int page = 1, int limit = 20, bool? unreadOnly}) async => [];

  @override
  Future<int> getUnreadCount() async => 0;

  @override
  Future<NotificationModel> markAsRead(String id) async => throw UnimplementedError();

  @override
  Future<int> markAllAsRead() async => 0;
}


