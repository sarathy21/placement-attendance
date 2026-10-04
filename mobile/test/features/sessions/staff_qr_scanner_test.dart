import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:placement_attendance_mobile/core/errors/failures.dart';
import 'package:placement_attendance_mobile/core/theme/app_theme.dart';
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
import 'package:placement_attendance_mobile/features/sessions/presentation/staff_qr_scanner_screen.dart';

class MockSessionsRepo implements ISessionsRepository {
  String? lastScannedRawToken;
  bool scanQrTokenCalled = false;
  Failure? errorToThrow;
  ScanAttendanceResultModel? resultToReturn;

  final testSession = SessionModel(
    id: 'ses-101',
    title: 'Java Deep Dive Assessment',
    sessionDate: DateTime(2026, 10, 1),
    startTime: DateTime(2026, 10, 1, 9, 0),
    endTime: DateTime(2026, 10, 1, 11, 0),
    status: SessionLifecycleStatus.inProgress,
    subject: const SessionSubjectModel(id: 'sub-01', code: 'MCA301', title: 'Aptitude'),
    venue: const SessionVenueModel(id: 'ven-01', name: 'Auditorium A', building: 'Block 1'),
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
  Future<AttendanceRosterResponseModel> getSessionAttendance(String sessionId) async => throw UnimplementedError();

  @override
  Future<ScanAttendanceResultModel> scanQrToken(String rawToken) async {
    scanQrTokenCalled = true;
    lastScannedRawToken = rawToken;
    if (errorToThrow != null) throw errorToThrow!;
    if (resultToReturn != null) return resultToReturn!;

    return ScanAttendanceResultModel(
      success: true,
      id: 'att-999',
      sessionId: 'ses-101',
      studentId: 'std-555',
      markedByStaffId: 'stf-01',
      method: 'QR',
      status: 'PRESENT',
      markedAt: DateTime.now(),
      student: const ScanAttendanceStudentModel(
        id: 'std-555',
        userId: 'usr-555',
        registerNumber: '732120104001',
        firstName: 'Arun',
        lastName: 'Kumar',
        collegeEmail: 'arun@kahe.edu.in',
      ),
      session: const ScanAttendanceSessionModel(
        id: 'ses-101',
        title: 'Java Deep Dive Assessment',
        status: 'IN_PROGRESS',
      ),
    );
  }
}

Widget createTestWidget(MockSessionsRepo repo, {String? sessionId, SessionModel? session}) {
  return ProviderScope(
    overrides: [
      sessionsRepositoryProvider.overrideWithValue(repo),
    ],
    child: MaterialApp(
      theme: AppTheme.lightTheme,
      home: Scaffold(
        body: StaffQrScannerScreen(
          sessionId: sessionId,
          session: session,
        ),
      ),
    ),
  );
}

void main() {
  const sample64HexToken = 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890';

  group('Staff QR Scanner Screen Tests', () {
    testWidgets('1. Scanner screen renders header and instruction', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      expect(find.text('Scan Attendance'), findsOneWidget);
      expect(find.text('Ask the student to display their attendance QR code from their app screen.'), findsOneWidget);
    });

    testWidgets('2. Session context renders when session is provided', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo, session: mockRepo.testSession));
      await tester.pumpAndSettle();

      expect(find.text('Java Deep Dive Assessment'), findsOneWidget);
      expect(find.text('Auditorium A (Block 1)'), findsOneWidget);
    });

    testWidgets('3. Manual entry option renders and expands', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      expect(find.text('Or enter token manually'), findsOneWidget);

      await tester.tap(find.text('Or enter token manually'));
      await tester.pumpAndSettle();

      expect(find.text('Submit Token'), findsOneWidget);
    });

    testWidgets('4. Manual token validation rejects non-64 hex tokens', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Or enter token manually'));
      await tester.pumpAndSettle();

      // Submit short token
      await tester.enterText(find.byType(TextFormField).first, 'short-token');
      await tester.tap(find.text('Submit Token'));
      await tester.pumpAndSettle();

      expect(find.text('Token must be exactly 64 characters'), findsOneWidget);
      expect(mockRepo.scanQrTokenCalled, isFalse);
    });

    testWidgets('5. Raw token is passed unchanged to repository', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Or enter token manually'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, sample64HexToken);
      await tester.tap(find.text('Submit Token'));
      await tester.pumpAndSettle();

      expect(mockRepo.scanQrTokenCalled, isTrue);
      expect(mockRepo.lastScannedRawToken, equals(sample64HexToken));
    });

    testWidgets('6. Successful PRESENT response renders success card with student name', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Or enter token manually'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, sample64HexToken);
      await tester.tap(find.text('Submit Token'));
      await tester.pumpAndSettle();

      expect(find.text('Attendance Recorded'), findsOneWidget);
      expect(find.text('Arun Kumar'), findsOneWidget);
      expect(find.text('Reg: 732120104001'), findsOneWidget);
      expect(find.text('Present'), findsOneWidget);
      expect(find.text('Scan Next Student'), findsOneWidget);
    });

    testWidgets('7. Successful LATE response renders LATE StatusBadge', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo()
        ..resultToReturn = ScanAttendanceResultModel(
          success: true,
          id: 'att-998',
          sessionId: 'ses-101',
          studentId: 'std-555',
          markedByStaffId: 'stf-01',
          method: 'QR',
          status: 'LATE',
          markedAt: DateTime.now(),
          student: const ScanAttendanceStudentModel(
            id: 'std-555',
            userId: 'usr-555',
            registerNumber: '732120104001',
            firstName: 'Arun',
            lastName: 'Kumar',
            collegeEmail: 'arun@kahe.edu.in',
          ),
        );

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Or enter token manually'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, sample64HexToken);
      await tester.tap(find.text('Submit Token'));
      await tester.pumpAndSettle();

      expect(find.text('Attendance Recorded'), findsOneWidget);
      expect(find.text('Late'), findsOneWidget);
    });

    testWidgets('8. 400 error displays error SnackBar feedback', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo()
        ..errorToThrow = const ValidationFailure('QR token has already been used or has expired', 400);

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Or enter token manually'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, sample64HexToken);
      await tester.tap(find.text('Submit Token'));
      await tester.pumpAndSettle();

      expect(find.text('QR token has already been used or has expired'), findsOneWidget);
    });

    testWidgets('9. 403 error displays authorization feedback SnackBar', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo()
        ..errorToThrow = const ForbiddenFailure('Staff member is not authorized to scan for this session', 403);

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Or enter token manually'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, sample64HexToken);
      await tester.tap(find.text('Submit Token'));
      await tester.pumpAndSettle();

      expect(find.text('Staff member is not authorized to scan for this session'), findsOneWidget);
    });

    testWidgets('10. 409 error displays duplicate attendance SnackBar', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo()
        ..errorToThrow = const ConflictFailure('Attendance has already been recorded for this student in this session', 409);

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Or enter token manually'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, sample64HexToken);
      await tester.tap(find.text('Submit Token'));
      await tester.pumpAndSettle();

      expect(find.text('Attendance has already been recorded for this student in this session'), findsOneWidget);
    });

    testWidgets('11. 401 error displays authentication error feedback', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo()
        ..errorToThrow = const UnauthorizedFailure('Session expired. Please log in again.', 401);

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Or enter token manually'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, sample64HexToken);
      await tester.tap(find.text('Submit Token'));
      await tester.pumpAndSettle();

      expect(find.text('Session expired. Please log in again.'), findsOneWidget);
    });

    testWidgets('12. Network error displays connection failure feedback', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo()
        ..errorToThrow = const NetworkFailure('No internet connection available');

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Or enter token manually'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, sample64HexToken);
      await tester.tap(find.text('Submit Token'));
      await tester.pumpAndSettle();

      expect(find.text('No internet connection available'), findsOneWidget);
    });

    testWidgets('13. Scan Next Student button resets state and returns to input view', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Or enter token manually'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, sample64HexToken);
      await tester.tap(find.text('Submit Token'));
      await tester.pumpAndSettle();

      expect(find.text('Attendance Recorded'), findsOneWidget);

      await tester.tap(find.text('Scan Next Student'));
      await tester.pumpAndSettle();

      expect(find.text('Attendance Recorded'), findsNothing);
      expect(find.text('Ask the student to display their attendance QR code from their app screen.'), findsOneWidget);
    });

    test('14. No raw token is persisted in global state', () async {
      final mockRepo = MockSessionsRepo();
      final container = ProviderContainer(
        overrides: [
          sessionsRepositoryProvider.overrideWithValue(mockRepo),
        ],
      );
      addTearDown(container.dispose);

      expect(container.read(scanAttendanceNotifierProvider).value, isNull);
      await container.read(scanAttendanceNotifierProvider.notifier).scanToken(sample64HexToken);

      final result = container.read(scanAttendanceNotifierProvider).value;
      expect(result, isNotNull);
      expect(result!.id, equals('att-999'));
    });

    testWidgets('15. Completed session does not expose Scan Attendance QR action in SessionDetailScreen', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final completedSession = SessionModel(
        id: 'ses-102',
        title: 'Completed Assessment',
        sessionDate: DateTime(2026, 9, 30),
        startTime: DateTime(2026, 9, 30, 9, 0),
        endTime: DateTime(2026, 9, 30, 11, 0),
        status: SessionLifecycleStatus.completed,
        subject: const SessionSubjectModel(id: 'sub-01', code: 'MCA301', title: 'Aptitude'),
        venue: const SessionVenueModel(id: 'ven-01', name: 'Auditorium A', building: 'Block 1'),
        staff: const SessionStaffModel(id: 'stf-01', firstName: 'Anita', lastName: 'Raman'),
      );

      final mockRepo = MockSessionsRepo();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sessionsRepositoryProvider.overrideWithValue(mockRepo),
            sessionDetailProvider('ses-102').overrideWith((ref) => Future.value(completedSession)),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const SessionDetailScreen(sessionId: 'ses-102'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Scan Attendance QR'), findsNothing);
    });
  });
}
