import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:placement_attendance_mobile/core/errors/failures.dart';
import 'package:placement_attendance_mobile/core/theme/app_theme.dart';
import 'package:placement_attendance_mobile/features/placement_batches/data/models/placement_batch_model.dart';
import 'package:placement_attendance_mobile/features/placement_batches/presentation/providers/placement_batches_provider.dart';
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

  final testVenues = const [
    VenueReferenceModel(id: 'ven-01', name: 'Auditorium A', building: 'Block 1'),
    VenueReferenceModel(id: 'ven-02', name: 'Lab 3', building: 'Block 2'),
  ];

  final testDepartments = const [
    DepartmentReferenceModel(id: 'dept-01', code: 'MCA', name: 'Master of Computer Applications'),
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
  Future<List<SubjectReferenceModel>> getSubjects() async => [];

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
      venue: SessionVenueModel(id: dto.venueId, name: 'Auditorium A', building: 'Block 1'),
      staff: const SessionStaffModel(id: 'stf-01', firstName: 'Anita', lastName: 'Raman'),
    );
  }
}

final testBatches = const [
  PlacementBatchModel(id: 'pb-01', name: 'TCS Batch 1'),
  PlacementBatchModel(id: 'pb-02', name: 'Wipro Batch 2'),
];

Widget createTestWidget(MockSessionsRepo repo) {
  return ProviderScope(
    overrides: [
      sessionsRepositoryProvider.overrideWithValue(repo),
      placementBatchesListProvider.overrideWith((ref) async => testBatches),
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
      expect(find.text('Target Placement Batch *'), findsOneWidget);
      expect(find.text('Session Title *'), findsOneWidget);
      expect(find.text('Description / Topics (Optional)'), findsOneWidget);
      expect(find.text('Venue *'), findsOneWidget);
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

      // Tap Placement Batch Dropdown
      await tester.tap(find.byType(DropdownButtonFormField<String>).at(0), warnIfMissed: false);
      await tester.pumpAndSettle();

      expect(find.text('TCS Batch 1'), findsOneWidget);
      expect(find.text('Wipro Batch 2'), findsOneWidget);
    });

    testWidgets('3. Empty batch selection triggers validation SnackBar', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, 'Mock Assessment Session');
      await tester.tap(find.text('Schedule Session'));
      await tester.pumpAndSettle();

      expect(find.text('Please select a placement batch'), findsOneWidget);
      expect(mockRepo.createSessionCalled, isFalse);
    });

    testWidgets('4. Successful form submission calls createSession with placementBatchId', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(800, 1200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockRepo = MockSessionsRepo();

      await tester.pumpWidget(createTestWidget(mockRepo));
      await tester.pumpAndSettle();

      // Select Placement Batch
      await tester.tap(find.byType(DropdownButtonFormField<String>).at(0));
      await tester.pumpAndSettle();
      await tester.tap(find.text('TCS Batch 1').last);
      await tester.pumpAndSettle();

      // Enter title
      await tester.enterText(find.byType(TextFormField).first, 'Mock Technical Assessment');

      // Select Venue
      await tester.tap(find.byType(DropdownButtonFormField<String>).at(1));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Auditorium A (Block 1)').last);
      await tester.pumpAndSettle();

      // Submit
      await tester.tap(find.text('Schedule Session'));
      await tester.pumpAndSettle();

      expect(mockRepo.createSessionCalled, isTrue);
      expect(mockRepo.lastCreatedDto?.placementBatchId, 'pb-01');
      expect(mockRepo.lastCreatedDto?.venueId, 'ven-01');
    });
  });
}
