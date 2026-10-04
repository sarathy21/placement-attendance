import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:placement_attendance_mobile/core/errors/failures.dart';
import 'package:placement_attendance_mobile/core/theme/app_theme.dart';
import 'package:placement_attendance_mobile/features/auth/domain/auth_state.dart';
import 'package:placement_attendance_mobile/features/auth/providers/auth_provider.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/my_attendance_model.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/qr_token_model.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/session_model.dart';
import 'package:placement_attendance_mobile/features/sessions/data/repositories/sessions_repository.dart';
import 'package:placement_attendance_mobile/features/sessions/presentation/providers/sessions_provider.dart';
import 'package:placement_attendance_mobile/features/sessions/presentation/session_detail_screen.dart';

import 'package:placement_attendance_mobile/features/sessions/data/models/attendance_roster_model.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/scan_attendance_result_model.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/create_session_dto.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/session_reference_models.dart';

class MockSessionsRepo implements ISessionsRepository {
  SessionModel? sessionToReturn;
  String? lastUpdatedStatus;
  bool updateStatusCalled = false;
  bool cancelSessionCalled = false;
  Failure? errorToThrow;

  @override
  Future<SessionModel> createSession(CreateSessionDto dto) async => throw UnimplementedError();

  @override
  Future<List<SubjectReferenceModel>> getSubjects() async => [];

  @override
  Future<List<VenueReferenceModel>> getVenues() async => [];

  @override
  Future<List<DepartmentReferenceModel>> getDepartments() async => [];

  @override
  Future<ScanAttendanceResultModel> scanQrToken(String rawToken) async => throw UnimplementedError();

  @override
  Future<AttendanceRosterResponseModel> getSessionAttendance(String sessionId) async => throw UnimplementedError();

  @override
  Future<SessionModel> getSessionDetail(String id) async {
    if (errorToThrow != null && !updateStatusCalled && !cancelSessionCalled) throw errorToThrow!;
    return sessionToReturn!;
  }

  @override
  Future<List<SessionModel>> getMySessions({String? status}) async =>
      [?sessionToReturn];

  @override
  Future<QrTokenModel> generateQrToken(String sessionId) async =>
      QrTokenModel(rawToken: 'tok', expiresAt: DateTime.now(), ttlSeconds: 300);

  @override
  Future<List<MyAttendanceModel>> getMyAttendance() async => [];

  @override
  Future<SessionModel> updateSessionStatus(String sessionId, String status) async {
    updateStatusCalled = true;
    lastUpdatedStatus = status;
    if (errorToThrow != null) throw errorToThrow!;
    final newStatus = status == 'IN_PROGRESS'
        ? SessionLifecycleStatus.inProgress
        : SessionLifecycleStatus.completed;
    return SessionModel(
      id: sessionToReturn!.id,
      title: sessionToReturn!.title,
      sessionDate: sessionToReturn!.sessionDate,
      startTime: sessionToReturn!.startTime,
      endTime: sessionToReturn!.endTime,
      status: newStatus,
      subject: sessionToReturn!.subject,
      venue: sessionToReturn!.venue,
      staff: sessionToReturn!.staff,
    );
  }

  @override
  Future<SessionModel> cancelSession(String sessionId) async {
    cancelSessionCalled = true;
    if (errorToThrow != null) throw errorToThrow!;
    return SessionModel(
      id: sessionToReturn!.id,
      title: sessionToReturn!.title,
      sessionDate: sessionToReturn!.sessionDate,
      startTime: sessionToReturn!.startTime,
      endTime: sessionToReturn!.endTime,
      status: SessionLifecycleStatus.cancelled,
      subject: sessionToReturn!.subject,
      venue: sessionToReturn!.venue,
      staff: sessionToReturn!.staff,
    );
  }
}

class _FakeAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  _FakeAuthNotifier(super.initialState);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  final scheduledSession = SessionModel(
    id: 's-001',
    title: 'Aptitude & Technical Orientation',
    sessionDate: DateTime(2026, 10, 1),
    startTime: DateTime(2026, 10, 1, 10, 0),
    endTime: DateTime(2026, 10, 1, 12, 0),
    status: SessionLifecycleStatus.scheduled,
    subject: const SessionSubjectModel(id: 'sub-1', code: 'MCA301', title: 'Aptitude'),
    venue: const SessionVenueModel(id: 'ven-1', name: 'Auditorium A', building: 'Block 1'),
    staff: const SessionStaffModel(id: 'stf-1', firstName: 'Anita', lastName: 'Raman'),
  );

  final inProgressSession = SessionModel(
    id: 's-002',
    title: 'Coding Mock Interview',
    sessionDate: DateTime(2026, 10, 1),
    startTime: DateTime(2026, 10, 1, 9, 0),
    endTime: DateTime(2026, 10, 1, 11, 0),
    status: SessionLifecycleStatus.inProgress,
    subject: const SessionSubjectModel(id: 'sub-2', code: 'MCA302', title: 'Coding'),
    venue: const SessionVenueModel(id: 'ven-2', name: 'Lab 3', building: 'Block 2'),
    staff: const SessionStaffModel(id: 'stf-2', firstName: 'Karthik', lastName: 'S'),
  );

  final completedSession = SessionModel(
    id: 's-003',
    title: 'Soft Skills Seminar',
    sessionDate: DateTime(2026, 10, 1),
    startTime: DateTime(2026, 10, 1, 8, 0),
    endTime: DateTime(2026, 10, 1, 10, 0),
    status: SessionLifecycleStatus.completed,
    subject: const SessionSubjectModel(id: 'sub-3', code: 'MCA303', title: 'Soft Skills'),
    venue: const SessionVenueModel(id: 'ven-3', name: 'Seminar Hall B', building: 'Block 3'),
    staff: const SessionStaffModel(id: 'stf-3', firstName: 'Suresh', lastName: 'V'),
  );

  final cancelledSession = SessionModel(
    id: 's-004',
    title: 'Resume Workshop',
    sessionDate: DateTime(2026, 10, 1),
    startTime: DateTime(2026, 10, 1, 14, 0),
    endTime: DateTime(2026, 10, 1, 16, 0),
    status: SessionLifecycleStatus.cancelled,
    subject: const SessionSubjectModel(id: 'sub-4', code: 'MCA304', title: 'Resume'),
    venue: const SessionVenueModel(id: 'ven-4', name: 'Lab 1', building: 'Block 1'),
    staff: const SessionStaffModel(id: 'stf-4', firstName: 'Priya', lastName: 'M'),
  );

  const staffUser = UserIdentity(
    id: 'stf-1',
    email: 'staff@kahe.edu',
    role: UserRole.staff,
    status: 'ACTIVE',
    firstName: 'Anita',
    lastName: 'Raman',
  );

  const studentUser = UserIdentity(
    id: 'std-1',
    email: 'student@kahe.edu',
    role: UserRole.student,
    status: 'ACTIVE',
    firstName: 'Rahul',
    lastName: 'Sharma',
  );

  group('Staff Session Detail & Lifecycle Controls Widget Tests', () {
    testWidgets('1. STAFF + SCHEDULED: Start Session & Cancel Session buttons visible', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => _FakeAuthNotifier(const Authenticated(user: staffUser))),
            sessionDetailProvider('s-001').overrideWith((ref) => Future.value(scheduledSession)),
            myAttendanceListProvider.overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const SessionDetailScreen(sessionId: 's-001')),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Session Management'), findsOneWidget);
      expect(find.text('Start Session'), findsOneWidget);
      expect(find.text('Cancel Session'), findsOneWidget);
    });

    testWidgets('2. STAFF + IN_PROGRESS: Complete Session & Cancel Session buttons visible', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => _FakeAuthNotifier(const Authenticated(user: staffUser))),
            sessionDetailProvider('s-002').overrideWith((ref) => Future.value(inProgressSession)),
            myAttendanceListProvider.overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const SessionDetailScreen(sessionId: 's-002')),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Session Management'), findsOneWidget);
      expect(find.text('Complete Session'), findsOneWidget);
      expect(find.text('Cancel Session'), findsOneWidget);
    });

    testWidgets('3. STAFF + COMPLETED: lifecycle buttons hidden, terminal state visible', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => _FakeAuthNotifier(const Authenticated(user: staffUser))),
            sessionDetailProvider('s-003').overrideWith((ref) => Future.value(completedSession)),
            myAttendanceListProvider.overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const SessionDetailScreen(sessionId: 's-003')),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('This session has been marked as COMPLETED'), findsOneWidget);
      expect(find.text('Start Session'), findsNothing);
      expect(find.text('Complete Session'), findsNothing);
      expect(find.text('Cancel Session'), findsNothing);
    });

    testWidgets('4. STAFF + CANCELLED: lifecycle buttons hidden, terminal state visible', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => _FakeAuthNotifier(const Authenticated(user: staffUser))),
            sessionDetailProvider('s-004').overrideWith((ref) => Future.value(cancelledSession)),
            myAttendanceListProvider.overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const SessionDetailScreen(sessionId: 's-004')),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('This session has been CANCELLED'), findsOneWidget);
      expect(find.text('Start Session'), findsNothing);
      expect(find.text('Complete Session'), findsNothing);
      expect(find.text('Cancel Session'), findsNothing);
    });

    testWidgets('5. STUDENT: lifecycle controls completely hidden', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => _FakeAuthNotifier(const Authenticated(user: studentUser))),
            sessionDetailProvider('s-001').overrideWith((ref) => Future.value(scheduledSession)),
            myAttendanceListProvider.overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const SessionDetailScreen(sessionId: 's-001')),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Session Management'), findsNothing);
      expect(find.text('Start Session'), findsNothing);
      expect(find.text('Cancel Session'), findsNothing);
    });

    testWidgets('6 & 7. Start confirmation dialog appears and confirming invokes updateStatus IN_PROGRESS', (WidgetTester tester) async {
      final mockRepo = MockSessionsRepo()..sessionToReturn = scheduledSession;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => _FakeAuthNotifier(const Authenticated(user: staffUser))),
            sessionsRepositoryProvider.overrideWithValue(mockRepo),
            sessionDetailProvider('s-001').overrideWith((ref) => Future.value(scheduledSession)),
            myAttendanceListProvider.overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const SessionDetailScreen(sessionId: 's-001')),
        ),
      );
      await tester.pumpAndSettle();

      // Ensure button is visible before tap
      await tester.ensureVisible(find.text('Start Session'));
      await tester.tap(find.text('Start Session'));
      await tester.pumpAndSettle();

      // Check confirmation dialog title and content
      expect(find.text('Start Session?'), findsOneWidget);
      expect(find.text('The session will become active and attendance can be recorded.'), findsOneWidget);

      // Tap dialog confirm action
      await tester.tap(find.widgetWithText(FilledButton, 'Start Session'));
      await tester.pumpAndSettle();

      expect(mockRepo.updateStatusCalled, isTrue);
      expect(mockRepo.lastUpdatedStatus, equals('IN_PROGRESS'));
      expect(find.text('Session started successfully'), findsOneWidget);
    });

    testWidgets('8 & 9. Complete confirmation dialog appears and confirming invokes updateStatus COMPLETED', (WidgetTester tester) async {
      final mockRepo = MockSessionsRepo()..sessionToReturn = inProgressSession;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => _FakeAuthNotifier(const Authenticated(user: staffUser))),
            sessionsRepositoryProvider.overrideWithValue(mockRepo),
            sessionDetailProvider('s-002').overrideWith((ref) => Future.value(inProgressSession)),
            myAttendanceListProvider.overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const SessionDetailScreen(sessionId: 's-002')),
        ),
      );
      await tester.pumpAndSettle();

      // Ensure button is visible before tap
      await tester.ensureVisible(find.text('Complete Session'));
      await tester.tap(find.text('Complete Session'));
      await tester.pumpAndSettle();

      // Check confirmation dialog
      expect(find.text('Complete Session?'), findsOneWidget);
      expect(find.text('The session will be marked completed and active attendance operations will stop.'), findsOneWidget);

      // Tap dialog confirm action
      await tester.tap(find.widgetWithText(FilledButton, 'Complete Session'));
      await tester.pumpAndSettle();

      expect(mockRepo.updateStatusCalled, isTrue);
      expect(mockRepo.lastUpdatedStatus, equals('COMPLETED'));
      expect(find.text('Session marked as completed'), findsOneWidget);
    });

    testWidgets('10 & 11. Cancel confirmation dialog appears and confirming invokes cancelSession', (WidgetTester tester) async {
      final mockRepo = MockSessionsRepo()..sessionToReturn = scheduledSession;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => _FakeAuthNotifier(const Authenticated(user: staffUser))),
            sessionsRepositoryProvider.overrideWithValue(mockRepo),
            sessionDetailProvider('s-001').overrideWith((ref) => Future.value(scheduledSession)),
            myAttendanceListProvider.overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const SessionDetailScreen(sessionId: 's-001')),
        ),
      );
      await tester.pumpAndSettle();

      // Ensure button is visible before tap
      await tester.ensureVisible(find.text('Cancel Session'));
      await tester.tap(find.text('Cancel Session'));
      await tester.pumpAndSettle();

      // Check dialog
      expect(find.text('Cancel Session?'), findsOneWidget);
      expect(find.text('Cancelling preserves the session record but prevents it from proceeding normally.'), findsOneWidget);

      // Tap dialog confirm action
      await tester.tap(find.widgetWithText(TextButton, 'Cancel Session'));
      await tester.pumpAndSettle();

      expect(mockRepo.cancelSessionCalled, isTrue);
      expect(find.text('Session cancelled successfully'), findsOneWidget);
    });

    testWidgets('12. 403 error displays authorization feedback SnackBar', (WidgetTester tester) async {
      final mockRepo = MockSessionsRepo()
        ..sessionToReturn = scheduledSession
        ..errorToThrow = const ForbiddenFailure('You are not authorized to manage this session.', 403);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => _FakeAuthNotifier(const Authenticated(user: staffUser))),
            sessionsRepositoryProvider.overrideWithValue(mockRepo),
            sessionDetailProvider('s-001').overrideWith((ref) => Future.value(scheduledSession)),
            myAttendanceListProvider.overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const SessionDetailScreen(sessionId: 's-001')),
        ),
      );
      await tester.pumpAndSettle();

      // Ensure button is visible before tap
      await tester.ensureVisible(find.text('Start Session'));
      await tester.tap(find.text('Start Session'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Start Session'));
      await tester.pumpAndSettle();

      expect(find.text('You are not authorized to manage this session.'), findsOneWidget);
    });

    testWidgets('13. 400 Validation / 409 Conflict error displays friendly feedback SnackBar', (WidgetTester tester) async {
      final mockRepo = MockSessionsRepo()
        ..sessionToReturn = scheduledSession
        ..errorToThrow = const ConflictFailure('Session is already in progress or state conflict.', 409);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => _FakeAuthNotifier(const Authenticated(user: staffUser))),
            sessionsRepositoryProvider.overrideWithValue(mockRepo),
            sessionDetailProvider('s-001').overrideWith((ref) => Future.value(scheduledSession)),
            myAttendanceListProvider.overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const SessionDetailScreen(sessionId: 's-001')),
        ),
      );
      await tester.pumpAndSettle();

      // Ensure button is visible before tap
      await tester.ensureVisible(find.text('Start Session'));
      await tester.tap(find.text('Start Session'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Start Session'));
      await tester.pumpAndSettle();

      expect(find.text('Session is already in progress or state conflict.'), findsOneWidget);
    });
  });
}
