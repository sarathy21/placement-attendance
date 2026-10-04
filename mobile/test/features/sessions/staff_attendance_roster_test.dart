import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:placement_attendance_mobile/core/errors/failures.dart';
import 'package:placement_attendance_mobile/core/theme/app_theme.dart';
import 'package:placement_attendance_mobile/features/auth/domain/auth_state.dart';
import 'package:placement_attendance_mobile/features/auth/providers/auth_provider.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/attendance_roster_model.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/create_session_dto.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/my_attendance_model.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/qr_token_model.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/scan_attendance_result_model.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/session_model.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/session_reference_models.dart';
import 'package:placement_attendance_mobile/features/sessions/data/repositories/sessions_repository.dart';
import 'package:placement_attendance_mobile/features/sessions/presentation/providers/sessions_provider.dart';
import 'package:placement_attendance_mobile/features/sessions/presentation/session_detail_screen.dart';
import 'package:placement_attendance_mobile/features/sessions/presentation/staff_attendance_roster_screen.dart';

class MockRosterSessionsRepo implements ISessionsRepository {
  Failure? errorToThrow;
  AttendanceRosterResponseModel? responseToReturn;

  final testSession = SessionModel(
    id: 'ses-200',
    title: 'Advanced System Architecture',
    sessionDate: DateTime(2026, 10, 1),
    startTime: DateTime(2026, 10, 1, 9, 0),
    endTime: DateTime(2026, 10, 1, 11, 0),
    status: SessionLifecycleStatus.inProgress,
    subject: const SessionSubjectModel(id: 'sub-01', code: 'MCA401', title: 'System Architecture'),
    venue: const SessionVenueModel(id: 'ven-01', name: 'Auditorium B', building: 'Block 2'),
    staff: const SessionStaffModel(id: 'stf-01', firstName: 'Anita', lastName: 'Raman'),
  );

  @override
  Future<List<SessionModel>> getMySessions({String? status}) async => [testSession];

  @override
  Future<SessionModel> getSessionDetail(String id) async => testSession;

  @override
  Future<QrTokenModel> generateQrToken(String sessionId) async => throw UnimplementedError();

  @override
  Future<List<MyAttendanceModel>> getMyAttendance() async => [];

  @override
  Future<SessionModel> updateSessionStatus(String sessionId, String status) async => throw UnimplementedError();

  @override
  Future<SessionModel> cancelSession(String sessionId) async => throw UnimplementedError();

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
  Future<AttendanceRosterResponseModel> getSessionAttendance(String sessionId) async {
    if (errorToThrow != null) throw errorToThrow!;
    if (responseToReturn != null) return responseToReturn!;

    return AttendanceRosterResponseModel(
      session: testSession,
      summary: const AttendanceSummaryModel(
        totalRoster: 4,
        presentCount: 1,
        lateCount: 1,
        absentCount: 1,
        excusedCount: 1,
      ),
      roster: [
        AttendanceRosterStudentModel(
          studentId: 'std-1',
          registerNumber: '732120104001',
          firstName: 'Arun',
          lastName: 'Kumar',
          collegeEmail: 'arun@kahe.edu.in',
          attendanceStatus: AttendanceRosterStatus.present,
          markedAt: DateTime(2026, 10, 1, 9, 5),
          method: 'QR',
        ),
        AttendanceRosterStudentModel(
          studentId: 'std-2',
          registerNumber: '732120104002',
          firstName: 'Bala',
          lastName: 'Murali',
          collegeEmail: 'bala@kahe.edu.in',
          attendanceStatus: AttendanceRosterStatus.late,
          markedAt: DateTime(2026, 10, 1, 9, 25),
          method: 'QR',
        ),
        AttendanceRosterStudentModel(
          studentId: 'std-3',
          registerNumber: '732120104003',
          firstName: 'Chitra',
          lastName: 'Devi',
          collegeEmail: 'chitra@kahe.edu.in',
          attendanceStatus: AttendanceRosterStatus.absent,
          markedAt: null,
          method: null,
        ),
        AttendanceRosterStudentModel(
          studentId: 'std-4',
          registerNumber: '732120104004',
          firstName: 'Deepak',
          lastName: 'Rajan',
          collegeEmail: 'deepak@kahe.edu.in',
          attendanceStatus: AttendanceRosterStatus.excused,
          markedAt: DateTime(2026, 10, 1, 8, 55),
          method: 'ADMIN',
        ),
      ],
    );
  }
}

Widget createTestWidget(MockRosterSessionsRepo repo, {String sessionId = 'ses-200'}) {
  return ProviderScope(
    overrides: [
      sessionsRepositoryProvider.overrideWithValue(repo),
    ],
    child: MaterialApp(
      theme: AppTheme.lightTheme,
      home: StaffAttendanceRosterScreen(sessionId: sessionId),
    ),
  );
}

void main() {
  group('1. Attendance Models JSON Parsing Unit Tests', () {
    test('Parses summary model correctly with totalRoster keys', () {
      final json = {
        'totalRoster': 10,
        'presentCount': 6,
        'lateCount': 2,
        'absentCount': 1,
        'excusedCount': 1,
      };
      final summary = AttendanceSummaryModel.fromJson(json);
      expect(summary.totalRoster, equals(10));
      expect(summary.presentCount, equals(6));
      expect(summary.lateCount, equals(2));
      expect(summary.absentCount, equals(1));
      expect(summary.excusedCount, equals(1));
    });

    test('Parses summary model with fallback keys (total, present, late, absent, excused)', () {
      final json = {
        'total': 8,
        'present': 5,
        'late': 1,
        'absent': 1,
        'excused': 1,
      };
      final summary = AttendanceSummaryModel.fromJson(json);
      expect(summary.totalRoster, equals(8));
      expect(summary.presentCount, equals(5));
    });

    test('Parses student model for PRESENT, LATE, ABSENT, EXCUSED statuses', () {
      final p = AttendanceRosterStudentModel.fromJson({
        'studentId': 's1',
        'registerNumber': '732120104001',
        'firstName': 'Arun',
        'lastName': 'Kumar',
        'attendanceStatus': 'PRESENT',
        'markedAt': '2026-10-01T09:05:00.000Z',
      });
      expect(p.attendanceStatus, equals(AttendanceRosterStatus.present));
      expect(p.fullName, equals('Arun Kumar'));
      expect(p.markedAt, isNotNull);

      final l = AttendanceRosterStudentModel.fromJson({
        'studentId': 's2',
        'registerNumber': '732120104002',
        'firstName': 'Bala',
        'lastName': 'Murali',
        'attendanceStatus': 'LATE',
      });
      expect(l.attendanceStatus, equals(AttendanceRosterStatus.late));

      final a = AttendanceRosterStudentModel.fromJson({
        'studentId': 's3',
        'registerNumber': '732120104003',
        'firstName': 'Chitra',
        'lastName': 'Devi',
        'attendanceStatus': 'ABSENT',
        'markedAt': null,
      });
      expect(a.attendanceStatus, equals(AttendanceRosterStatus.absent));
      expect(a.markedAt, isNull);
      expect(a.formattedMarkedAt, equals('Not Marked'));

      final e = AttendanceRosterStudentModel.fromJson({
        'studentId': 's4',
        'registerNumber': '732120104004',
        'firstName': 'Deepak',
        'lastName': 'Rajan',
        'attendanceStatus': 'EXCUSED',
      });
      expect(e.attendanceStatus, equals(AttendanceRosterStatus.excused));
    });

    test('Falls back safely to ABSENT on unknown attendance status string', () {
      final student = AttendanceRosterStudentModel.fromJson({
        'studentId': 's5',
        'registerNumber': '732120104005',
        'firstName': 'Test',
        'lastName': 'User',
        'attendanceStatus': 'UNKNOWN_STATUS',
      });
      expect(student.attendanceStatus, equals(AttendanceRosterStatus.absent));
    });
  });

  group('2. Staff Attendance Roster Screen Widget Tests', () {
    testWidgets('Renders header, summary counts, and student list', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockRosterSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      expect(find.text('Attendance Roster'), findsOneWidget);
      expect(find.text('Advanced System Architecture'), findsOneWidget);
      expect(find.text('Auditorium B (Block 2)'), findsOneWidget);

      // Summary counts
      expect(find.text('Total'), findsOneWidget);
      expect(find.text('Present'), findsNWidgets(2)); // summary card + badge
      expect(find.text('Late'), findsNWidgets(2)); // summary card + badge
      expect(find.text('Absent'), findsNWidgets(2)); // summary card + badge
      expect(find.text('Excused'), findsNWidgets(2)); // summary card + badge

      // Roster list items
      expect(find.text('Arun Kumar'), findsOneWidget);
      expect(find.text('Bala Murali'), findsOneWidget);
      expect(find.text('Chitra Devi'), findsOneWidget);
      expect(find.text('Deepak Rajan'), findsOneWidget);
    });

    testWidgets('Client-side search filters roster by student name', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockRosterSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField).first, 'Bala');
      await tester.pumpAndSettle();

      expect(find.text('Bala Murali'), findsOneWidget);
      expect(find.text('Arun Kumar'), findsNothing);
      expect(find.text('Chitra Devi'), findsNothing);
    });

    testWidgets('Client-side search filters roster by register number', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockRosterSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField).first, '732120104003');
      await tester.pumpAndSettle();

      expect(find.text('Chitra Devi'), findsOneWidget);
      expect(find.text('Arun Kumar'), findsNothing);
    });

    testWidgets('Displays EmptyState when search returns no matching students', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockRosterSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField).first, 'NonExistentStudent');
      await tester.pumpAndSettle();

      expect(find.text('No students match search or filter criteria.'), findsOneWidget);
    });

    testWidgets('Status filter chip filters roster by attendance status', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockRosterSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      // Tap LATE filter chip
      await tester.tap(find.text('LATE'));
      await tester.pumpAndSettle();

      expect(find.text('Bala Murali'), findsOneWidget);
      expect(find.text('Arun Kumar'), findsNothing);
      expect(find.text('Chitra Devi'), findsNothing);
    });

    testWidgets('403 Forbidden error displays friendly authorization error message', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockRosterSessionsRepo()
        ..errorToThrow = const ForbiddenFailure('STAFF can only view attendance for sessions they conduct', 403);

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      expect(find.text('STAFF can only view attendance for sessions they conduct'), findsOneWidget);
    });

    testWidgets('404 NotFound error displays session not found error message', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockRosterSessionsRepo()
        ..errorToThrow = const NotFoundFailure('Session with ID ses-200 not found', 404);

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      expect(find.text('Session with ID ses-200 not found'), findsOneWidget);
    });

    testWidgets('Network failure displays network error feedback card', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockRosterSessionsRepo()
        ..errorToThrow = const NetworkFailure('No internet connection available');

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      expect(find.text('No internet connection available'), findsOneWidget);
    });

    testWidgets('SessionDetailScreen shows View Attendance Roster button and navigates', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockRosterSessionsRepo();
      final authenticatedStaffState = Authenticated(user: const UserIdentity(
        id: 'usr-1',
        email: 'staff@kahe.edu.in',
        role: UserRole.staff,
        status: 'ACTIVE',
        firstName: 'Anita',
        lastName: 'Raman',
      ));

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => _FakeAuthNotifier(authenticatedStaffState)),
            sessionsRepositoryProvider.overrideWithValue(mockRepo),
            sessionDetailProvider('ses-200').overrideWith((ref) => Future.value(mockRepo.testSession)),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const SessionDetailScreen(sessionId: 'ses-200'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('View Attendance Roster'), findsOneWidget);

      await tester.tap(find.text('View Attendance Roster'));
      await tester.pumpAndSettle();

      expect(find.byType(StaffAttendanceRosterScreen), findsOneWidget);
    });
  });
}

class _FakeAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  _FakeAuthNotifier(super.initialState);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
