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
import 'package:placement_attendance_mobile/features/notifications/presentation/providers/notifications_provider.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/session_model.dart';
import 'package:placement_attendance_mobile/features/sessions/presentation/providers/sessions_provider.dart';
import 'package:placement_attendance_mobile/features/sessions/presentation/staff_home_screen.dart';

void main() {
  const testStaffUser = UserIdentity(
    id: 'user-staff-100',
    email: 'anita@kahedu.edu.in',
    role: UserRole.staff,
    status: 'ACTIVE',
    firstName: 'Anita',
    lastName: 'Raman',
  );

  final now = DateTime.now();

  final activeSession = SessionModel(
    id: 'sess-active-1',
    title: 'Python Technical Workshop',
    sessionDate: now,
    startTime: now.subtract(const Duration(minutes: 30)),
    endTime: now.add(const Duration(hours: 1)),
    status: SessionLifecycleStatus.inProgress,
    subject: const SessionSubjectModel(id: 'sub-1', code: 'MCA301', title: 'Python Programming'),
    venue: const SessionVenueModel(id: 'ven-1', name: 'Lab 1', building: 'Block A'),
    staff: const SessionStaffModel(id: 'stf-1', firstName: 'Anita', lastName: 'Raman'),
  );

  final scheduledSession = SessionModel(
    id: 'sess-sched-2',
    title: 'Aptitude Mock Test',
    sessionDate: now.add(const Duration(days: 1)),
    startTime: now.add(const Duration(days: 1, hours: 2)),
    endTime: now.add(const Duration(days: 1, hours: 4)),
    status: SessionLifecycleStatus.scheduled,
    subject: const SessionSubjectModel(id: 'sub-2', code: 'MCA302', title: 'Aptitude & Reasoning'),
    venue: const SessionVenueModel(id: 'ven-2', name: 'Auditorium', building: 'Block B'),
    staff: const SessionStaffModel(id: 'stf-1', firstName: 'Anita', lastName: 'Raman'),
  );

  final testDrive = PlacementDriveModel(
    id: 'drive-staff-1',
    companyName: 'Infosys Placement Drive',
    driveDate: now.add(const Duration(days: 10)),
    venue: 'Main Campus Auditorium',
    description: 'Infosys Systems Engineer Campus Recruitment',
    status: DriveStatus.upcoming,
    attendanceEnabled: true,
    createdById: 'staff-100',
    createdBy: const {
      'id': 'staff-100',
      'firstName': 'Anita',
      'lastName': 'Raman',
    },
    rounds: const [],
  );

  Widget createTestWidget({
    AuthState authState = const Authenticated(user: testStaffUser),
    AsyncValue<PlacementDriveModel?> nextDriveState = const AsyncValue.data(null),
    AsyncValue<List<SessionModel>> sessionsState = const AsyncValue.data([]),
  }) {
    return ProviderScope(
      overrides: [
        notificationsNotifierProvider.overrideWith((ref) => _FakeNotificationsNotifier()),
        unreadCountNotifierProvider.overrideWith((ref) => _FakeUnreadNotifier(0)),
        authNotifierProvider.overrideWith((ref) => _FakeAuthNotifier(authState)),
        placementDrivesListProvider(null).overrideWith((ref) => Future.value([])),
        placementDrivesProvider.overrideWith((ref) => Future.value([])),
        staffSessionsListProvider(null).overrideWith((ref) {
          if (sessionsState.isLoading) {
            return Completer<List<SessionModel>>().future;
          }
          if (sessionsState.hasError) {
            return Future.error(sessionsState.error!, sessionsState.stackTrace);
          }
          return Future.value(sessionsState.value ?? []);
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
      ],
      child: MaterialApp(theme: AppTheme.lightTheme, home: const StaffHomeScreen()),
    );
  }

  group('Staff Home Dashboard Widget Tests', () {
    testWidgets('1. Renders authenticated staff name and dynamic greeting', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      expect(find.text('Anita Raman'), findsOneWidget);
      expect(find.textContaining('Placement Staff'), findsOneWidget);
    });

    testWidgets('2. Displays active session when IN_PROGRESS session exists', (WidgetTester tester) async {
      await tester.pumpWidget(
        createTestWidget(sessionsState: AsyncValue.data([activeSession, scheduledSession])),
      );
      await tester.pumpAndSettle();

      expect(find.text('Python Technical Workshop'), findsOneWidget);
      expect(find.text('In Progress'), findsWidgets);
    });

    testWidgets('3. Displays next scheduled session when SCHEDULED session exists', (WidgetTester tester) async {
      await tester.pumpWidget(
        createTestWidget(sessionsState: AsyncValue.data([scheduledSession])),
      );
      await tester.pumpAndSettle();

      expect(find.text('Aptitude Mock Test'), findsOneWidget);
      expect(find.text('SCHEDULED'), findsOneWidget);
    });

    testWidgets('4. Displays empty state when no active or scheduled session exists', (WidgetTester tester) async {
      await tester.pumpWidget(createTestWidget(sessionsState: const AsyncValue.data([])));
      await tester.pumpAndSettle();

      expect(find.text('No Active Sessions'), findsOneWidget);
      expect(find.text('No Upcoming Scheduled Sessions'), findsOneWidget);
    });

    testWidgets('5. Displays upcoming placement drive when available', (WidgetTester tester) async {
      await tester.pumpWidget(
        createTestWidget(nextDriveState: AsyncValue.data(testDrive)),
      );
      await tester.pumpAndSettle();

      expect(find.text('Infosys Placement Drive'), findsOneWidget);
    });

    testWidgets('6. Loading state renders loading indicators when fetching data', (WidgetTester tester) async {
      await tester.pumpWidget(
        createTestWidget(
          sessionsState: const AsyncValue.loading(),
          nextDriveState: const AsyncValue.loading(),
        ),
      );
      await tester.pump();

      expect(find.text('Calculating session metrics...'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsWidgets);
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

class _FakeUnreadNotifier extends StateNotifier<int> implements UnreadCountNotifier {
  _FakeUnreadNotifier(super.count);

  @override
  Future<void> fetchUnreadCount() async {}

  @override
  void decrement(int count) {}

  @override
  void reset() {}
}

class _FakeNotificationsNotifier extends StateNotifier<AsyncValue<List<NotificationModel>>>
    implements NotificationsNotifier {
  _FakeNotificationsNotifier() : super(const AsyncValue.data([]));

  @override
  Future<void> fetchNotifications() async {}

  @override
  Future<void> markAsRead(String id) async {}

  @override
  Future<void> markAllAsRead() async {}
}
