import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:placement_attendance_mobile/core/theme/app_theme.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/my_attendance_model.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/qr_token_model.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/session_model.dart';
import 'package:placement_attendance_mobile/features/sessions/presentation/providers/sessions_provider.dart';
import 'package:placement_attendance_mobile/features/sessions/presentation/qr_attendance_modal.dart';
import 'package:placement_attendance_mobile/features/sessions/presentation/session_detail_screen.dart';
import 'package:placement_attendance_mobile/features/sessions/presentation/student_sessions_screen.dart';

void main() {
  final now = DateTime.now();
  final testSessionScheduled = SessionModel(
    id: 'session-001',
    title: 'Aptitude & Technical Orientation',
    sessionDate: DateTime(now.year, now.month, now.day),
    startTime: DateTime(now.year, now.month, now.day, 10, 0),
    endTime: DateTime(now.year, now.month, now.day, 12, 0),
    status: SessionLifecycleStatus.scheduled,
    subject: const SessionSubjectModel(id: 'sub-01', code: 'MCA301', title: 'Placement Aptitude'),
    venue: const SessionVenueModel(id: 'ven-01', name: 'Auditorium A', building: 'Block 1'),
    staff: const SessionStaffModel(id: 'stf-01', firstName: 'Anita', lastName: 'Raman'),
  );

  final testSessionInProgress = SessionModel(
    id: 'session-002',
    title: 'Coding Mock Interview',
    sessionDate: DateTime(now.year, now.month, now.day),
    startTime: DateTime(now.year, now.month, now.day, 9, 0),
    endTime: DateTime(now.year, now.month, now.day, 11, 0),
    status: SessionLifecycleStatus.inProgress,
    subject: const SessionSubjectModel(id: 'sub-02', code: 'MCA302', title: 'Coding Practice'),
    venue: const SessionVenueModel(id: 'ven-02', name: 'Lab 3', building: 'Block 2'),
    staff: const SessionStaffModel(id: 'stf-02', firstName: 'Karthik', lastName: 'S'),
  );

  final testQrToken = QrTokenModel(
    rawToken: 'mock_qr_raw_token_xyz789',
    expiresAt: DateTime.now().add(const Duration(seconds: 300)),
    ttlSeconds: 300,
  );

  final testAttendance = MyAttendanceModel(
    id: 'att-001',
    sessionId: 'session-002',
    sessionTitle: 'Coding Mock Interview',
    subjectCode: 'MCA302',
    subjectTitle: 'Coding Practice',
    venueName: 'Lab 3',
    conductingStaffName: 'Karthik S',
    attendanceStatus: 'PRESENT',
    method: 'QR',
    markedAt: DateTime.now(),
  );

  group('Student Sessions & QR Attendance Widget Tests', () {
    testWidgets('1. Sessions loading state renders', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            studentSessionsListProvider(null).overrideWith((ref) => Completer<List<SessionModel>>().future),
            myAttendanceListProvider.overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const StudentSessionsScreen()),
        ),
      );
      await tester.pump();

      expect(find.text('Fetching your placement sessions...'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsWidgets);
    });

    testWidgets('2. Empty sessions state renders when no sessions exist', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            studentSessionsListProvider(null).overrideWith((ref) => Future.value([])),
            myAttendanceListProvider.overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const StudentSessionsScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('No Sessions Today'), findsOneWidget);
    });

    testWidgets('3. Session list renders session cards', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            studentSessionsListProvider(null).overrideWith((ref) => Future.value([testSessionScheduled])),
            myAttendanceListProvider.overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const StudentSessionsScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Aptitude & Technical Orientation'), findsOneWidget);
      expect(find.text('Scheduled'), findsOneWidget);
    });

    testWidgets('4. Session details screen renders full metadata', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sessionDetailProvider('session-001').overrideWith((ref) => Future.value(testSessionScheduled)),
            myAttendanceListProvider.overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const SessionDetailScreen(sessionId: 'session-001')),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Aptitude & Technical Orientation'), findsOneWidget);
      expect(find.text('Anita Raman'), findsOneWidget);
      expect(find.text('Auditorium A (Block 1)'), findsOneWidget);
      expect(find.text('Scheduled'), findsOneWidget);
    });

    testWidgets('5. Attendance status renders when not marked', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sessionDetailProvider('session-001').overrideWith((ref) => Future.value(testSessionScheduled)),
            myAttendanceListProvider.overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const SessionDetailScreen(sessionId: 'session-001')),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Attendance QR will become available'), findsOneWidget);
    });

    testWidgets('6. QR button is available when session is IN_PROGRESS', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sessionDetailProvider('session-002').overrideWith((ref) => Future.value(testSessionInProgress)),
            myAttendanceListProvider.overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const SessionDetailScreen(sessionId: 'session-002')),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Show Attendance QR'), findsOneWidget);
      expect(find.text('Attendance Open'), findsOneWidget);
    });

    testWidgets('7. QR modal loading state renders', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            qrTokenNotifierProvider('session-002').overrideWith((ref) => _FakeQrTokenNotifier(const AsyncValue.loading())),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const Scaffold(
              body: QrAttendanceModal(sessionId: 'session-002', sessionTitle: 'Coding Practice'),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Generating secure QR token...'), findsOneWidget);
    });

    testWidgets('8. QR modal renders QR code with raw token', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            qrTokenNotifierProvider('session-002').overrideWith((ref) => _FakeQrTokenNotifier(AsyncValue.data(testQrToken))),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const Scaffold(
              body: QrAttendanceModal(sessionId: 'session-002', sessionTitle: 'Coding Practice'),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Show this QR to your conducting staff member'), findsOneWidget);
      expect(find.text('Refresh QR'), findsOneWidget);
    });

    testWidgets('9. QR modal error state renders when token fetch fails', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            qrTokenNotifierProvider('session-002').overrideWith(
              (ref) => _FakeQrTokenNotifier(AsyncValue.error(Exception('Session not active'), StackTrace.current)),
            ),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const Scaffold(
              body: QrAttendanceModal(sessionId: 'session-002', sessionTitle: 'Coding Practice'),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Session not active'), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);
    });

    testWidgets('10. Already-attended state renders recorded status', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            sessionDetailProvider('session-002').overrideWith((ref) => Future.value(testSessionInProgress)),
            myAttendanceListProvider.overrideWith((ref) => Future.value([testAttendance])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const SessionDetailScreen(sessionId: 'session-002')),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Attendance Marked: PRESENT'), findsOneWidget);
      expect(find.textContaining('already been recorded by staff'), findsOneWidget);
    });
  });
}

class _FakeQrTokenNotifier extends StateNotifier<AsyncValue<QrTokenModel?>> implements QrTokenNotifier {
  _FakeQrTokenNotifier(super.initialState);

  @override
  Future<void> requestToken() async {}

  @override
  void clearToken() {}
}
