import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:placement_attendance_mobile/core/errors/failures.dart';
import 'package:placement_attendance_mobile/core/theme/app_theme.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/attendance_roster_model.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/create_session_dto.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/my_attendance_model.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/qr_token_model.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/session_model.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/session_reference_models.dart';
import 'package:placement_attendance_mobile/features/sessions/data/repositories/sessions_repository.dart';
import 'package:placement_attendance_mobile/features/sessions/presentation/providers/sessions_provider.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/scan_attendance_result_model.dart';
import 'package:placement_attendance_mobile/features/sessions/presentation/schedule_session_screen.dart';

class MockSessionsRepo implements ISessionsRepository {
  CreateSessionDto? lastCreatedDto;
  bool createSessionCalled = false;
  Failure? errorToThrow;

  final testSubjects = const [
    SubjectReferenceModel(id: 'sub-01', code: 'MCA301', title: 'Placement Aptitude'),
    SubjectReferenceModel(id: 'sub-02', code: 'MCA302', title: 'Coding Practice'),
  ];

  final testVenues = const [
    VenueReferenceModel(id: 'ven-01', name: 'Auditorium A', building: 'Block 1'),
    VenueReferenceModel(id: 'ven-02', name: 'Lab 3', building: 'Block 2'),
  ];

  final testDepartments = const [
    DepartmentReferenceModel(id: 'dept-01', code: 'MCA', name: 'Master of Computer Applications'),
    DepartmentReferenceModel(id: 'dept-02', code: 'CSE', name: 'Computer Science & Engineering'),
  ];

  @override
  Future<List<SessionModel>> getMySessions({String? status}) async => [];

  @override
  Future<SessionModel> getSessionDetail(String id) async => throw UnimplementedError();

  @override
  Future<QrTokenModel> generateQrToken(String sessionId) async => throw UnimplementedError();

  @override
  Future<List<MyAttendanceModel>> getMyAttendance() async => [];

  @override
  Future<SessionModel> updateSessionStatus(String sessionId, String status) async => throw UnimplementedError();

  @override
  Future<SessionModel> cancelSession(String sessionId) async => throw UnimplementedError();

  @override
  Future<List<SubjectReferenceModel>> getSubjects() async => testSubjects;

  @override
  Future<List<VenueReferenceModel>> getVenues() async => testVenues;

  @override
  Future<List<DepartmentReferenceModel>> getDepartments() async => testDepartments;

  @override
  Future<ScanAttendanceResultModel> scanQrToken(String rawToken) async => throw UnimplementedError();

  @override
  Future<AttendanceRosterResponseModel> getSessionAttendance(String sessionId) async => throw UnimplementedError();

  @override
  Future<SessionModel> createSession(CreateSessionDto dto) async {
    createSessionCalled = true;
    lastCreatedDto = dto;
    if (errorToThrow != null) throw errorToThrow!;
    return SessionModel(
      id: 'session-new-123',
      title: dto.title,
      description: dto.description,
      sessionDate: DateTime.parse(dto.sessionDate),
      startTime: DateTime.parse(dto.startTime),
      endTime: DateTime.parse(dto.endTime),
      status: SessionLifecycleStatus.scheduled,
      subject: dto.subjectId != null ? SessionSubjectModel(id: dto.subjectId!, code: 'MCA301', title: 'Aptitude') : null,
      venue: SessionVenueModel(id: dto.venueId, name: 'Auditorium A', building: 'Block 1'),
      staff: const SessionStaffModel(id: 'stf-01', firstName: 'Anita', lastName: 'Raman'),
    );
  }
}

Widget createTestWidget(MockSessionsRepo repo) {
  return ProviderScope(
    overrides: [
      sessionsRepositoryProvider.overrideWithValue(repo),
    ],
    child: MaterialApp(
      theme: AppTheme.lightTheme,
      home: const Scaffold(
        body: ScheduleSessionScreen(),
      ),
    ),
  );
}

void main() {
  group('ScheduleSessionScreen Widget & Unit Tests', () {
    testWidgets('1. ScheduleSessionScreen renders header, inputs and buttons', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      expect(find.text('Schedule New Session'), findsOneWidget);
      expect(find.text('Session Title'), findsOneWidget);
      expect(find.text('Description / Topics (Optional)'), findsOneWidget);
      expect(find.text('Venue'), findsOneWidget);
      expect(find.text('Target Department'), findsOneWidget);
      expect(find.text('Session Date'), findsOneWidget);
      expect(find.text('Start Time'), findsOneWidget);
      expect(find.text('End Time'), findsOneWidget);
      expect(find.text('Schedule Session'), findsOneWidget);
    });

    testWidgets('2. Reference dropdowns populate options from repository', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      // Tap Venue Dropdown (now 1st dropdown)
      await tester.tap(find.byType(DropdownButtonFormField<String>).at(0), warnIfMissed: false);
      await tester.pumpAndSettle();

      expect(find.text('Auditorium A (Block 1)'), findsOneWidget);
      expect(find.text('Lab 3 (Block 2)'), findsOneWidget);
    });

    testWidgets('3. Empty title submission triggers validation error', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Schedule Session'));
      await tester.pumpAndSettle();

      expect(find.text('Session title is required'), findsOneWidget);
      expect(mockRepo.createSessionCalled, isFalse);
    });

    testWidgets('4. Unselected venue dropdown triggers validation SnackBar', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, 'Mock Assessment Session');
      await tester.tap(find.text('Schedule Session'));
      await tester.pumpAndSettle();

      expect(find.text('Please select a venue'), findsOneWidget);
      expect(mockRepo.createSessionCalled, isFalse);
    });

    testWidgets('5. Date & time selection interaction opens pickers', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      // Tap Date Picker
      await tester.tap(find.byIcon(Icons.calendar_today_rounded));
      await tester.pumpAndSettle();
      expect(find.text('OK'), findsOneWidget);
      await tester.tap(find.text('OK'));
      await tester.pumpAndSettle();

      // Tap Start Time Picker
      await tester.tap(find.byIcon(Icons.access_time_rounded));
      await tester.pumpAndSettle();
      expect(find.text('OK'), findsOneWidget);
      await tester.tap(find.text('OK'));
      await tester.pumpAndSettle();

      // Tap End Time Picker
      await tester.tap(find.byIcon(Icons.access_time_filled_rounded));
      await tester.pumpAndSettle();
      expect(find.text('OK'), findsOneWidget);
      await tester.tap(find.text('OK'));
      await tester.pumpAndSettle();
    });

    testWidgets('6. End time <= start time validation prevents submission', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sessionsRepositoryProvider.overrideWithValue(mockRepo),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const Scaffold(
              body: ScheduleSessionScreen(
                initialStartTime: TimeOfDay(hour: 11, minute: 0),
                initialEndTime: TimeOfDay(hour: 9, minute: 0),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Enter title
      await tester.enterText(find.byType(TextFormField).first, 'Java Deep Dive Mock Test');

      // Select Venue (at index 0)
      await tester.tap(find.byType(DropdownButtonFormField<String>).at(0));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Auditorium A (Block 1)').last);
      await tester.pumpAndSettle();

      // Select Department (at index 1)
      await tester.tap(find.byType(DropdownButtonFormField<String>).at(1));
      await tester.pumpAndSettle();
      await tester.tap(find.text('MCA - Master of Computer Applications').last);
      await tester.pumpAndSettle();

      // Submit
      await tester.tap(find.text('Schedule Session'), warnIfMissed: false);
      await tester.pumpAndSettle();

      expect(find.text('End time must be after start time'), findsOneWidget);
      expect(mockRepo.createSessionCalled, isFalse);
    });

    testWidgets('7. Valid form submission sends correct CreateSessionDto payload', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      // Enter title
      await tester.enterText(find.byType(TextFormField).first, 'Java Deep Dive Mock Test');

      // Select Venue
      await tester.tap(find.byType(DropdownButtonFormField<String>).at(0));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Auditorium A (Block 1)').last);
      await tester.pumpAndSettle();

      // Select Department
      await tester.tap(find.byType(DropdownButtonFormField<String>).at(1));
      await tester.pumpAndSettle();
      await tester.tap(find.text('MCA - Master of Computer Applications').last);
      await tester.pumpAndSettle();

      // Submit
      await tester.tap(find.text('Schedule Session'));
      await tester.pumpAndSettle();

      expect(mockRepo.createSessionCalled, isTrue);
      expect(mockRepo.lastCreatedDto, isNotNull);
      expect(mockRepo.lastCreatedDto!.title, equals('Java Deep Dive Mock Test'));
      expect(mockRepo.lastCreatedDto!.venueId, equals('ven-01'));
      expect(mockRepo.lastCreatedDto!.departmentId, equals('dept-01'));
      expect(find.text('Session scheduled successfully!'), findsOneWidget);
    });

    testWidgets('8. 403 error displays authorization feedback SnackBar', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo()
        ..errorToThrow = const ForbiddenFailure('Only authorized staff or admins can schedule sessions.', 403);

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      // Fill form
      await tester.enterText(find.byType(TextFormField).first, 'Java Deep Dive Mock Test');

      await tester.tap(find.byType(DropdownButtonFormField<String>).at(0));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Auditorium A (Block 1)').last);
      await tester.pumpAndSettle();

      await tester.tap(find.byType(DropdownButtonFormField<String>).at(1));
      await tester.pumpAndSettle();
      await tester.tap(find.text('MCA - Master of Computer Applications').last);
      await tester.pumpAndSettle();

      await tester.tap(find.text('Schedule Session'));
      await tester.pumpAndSettle();

      expect(find.text('Only authorized staff or admins can schedule sessions.'), findsOneWidget);
    });

    testWidgets('9. 400 / 409 error displays server validation SnackBar', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo()
        ..errorToThrow = const ValidationFailure('Venue auditorium A is already booked at this time slot.', 409);

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      // Fill form
      await tester.enterText(find.byType(TextFormField).first, 'Java Deep Dive Mock Test');

      await tester.tap(find.byType(DropdownButtonFormField<String>).at(0));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Auditorium A (Block 1)').last);
      await tester.pumpAndSettle();

      await tester.tap(find.byType(DropdownButtonFormField<String>).at(1));
      await tester.pumpAndSettle();
      await tester.tap(find.text('MCA - Master of Computer Applications').last);
      await tester.pumpAndSettle();

      await tester.tap(find.text('Schedule Session'));
      await tester.pumpAndSettle();

      expect(find.text('Venue auditorium A is already booked at this time slot.'), findsOneWidget);
    });
  });
}

