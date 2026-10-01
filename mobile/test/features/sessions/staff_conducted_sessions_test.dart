import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:placement_attendance_mobile/core/theme/app_theme.dart';
import 'package:placement_attendance_mobile/features/sessions/data/models/session_model.dart';
import 'package:placement_attendance_mobile/features/sessions/presentation/providers/sessions_provider.dart';
import 'package:placement_attendance_mobile/features/sessions/presentation/staff_conducted_sessions_screen.dart';

void main() {
  final now = DateTime.now();

  final activeSession = SessionModel(
    id: 'sess-1',
    title: 'Data Structures Mock Session',
    sessionDate: now,
    startTime: now.subtract(const Duration(minutes: 15)),
    endTime: now.add(const Duration(hours: 1)),
    status: SessionLifecycleStatus.inProgress,
    subject: const SessionSubjectModel(id: 'sub-1', code: 'MCA301', title: 'Data Structures'),
    venue: const SessionVenueModel(id: 'ven-1', name: 'Lab 2', building: 'Block C'),
    staff: const SessionStaffModel(id: 'stf-1', firstName: 'Anita', lastName: 'Raman'),
  );

  final completedSession = SessionModel(
    id: 'sess-2',
    title: 'Resume Review Round',
    sessionDate: now.subtract(const Duration(days: 1)),
    startTime: now.subtract(const Duration(days: 1, hours: 2)),
    endTime: now.subtract(const Duration(days: 1)),
    status: SessionLifecycleStatus.completed,
    subject: const SessionSubjectModel(id: 'sub-2', code: 'MCA302', title: 'Resume Review'),
    venue: const SessionVenueModel(id: 'ven-2', name: 'Seminar Hall', building: 'Block D'),
    staff: const SessionStaffModel(id: 'stf-1', firstName: 'Anita', lastName: 'Raman'),
  );

  group('Staff Conducted Sessions Screen Tests', () {
    testWidgets('1. Loading state renders initial progress indicator', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            staffSessionsListProvider(null).overrideWith((ref) => Future.value([activeSession])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const StaffConductedSessionsScreen()),
        ),
      );

      expect(find.byType(ChoiceChip), findsWidgets);
      await tester.pumpAndSettle();
    });

    testWidgets('2. Empty state renders when no sessions exist', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            staffSessionsListProvider(null).overrideWith((ref) => Future.value([])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const StaffConductedSessionsScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('No Sessions Found'), findsOneWidget);
    });

    testWidgets('3. Renders session cards for conducted sessions list', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            staffSessionsListProvider(null).overrideWith((ref) => Future.value([activeSession, completedSession])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const StaffConductedSessionsScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Data Structures Mock Session'), findsOneWidget);
      expect(find.text('Resume Review Round'), findsOneWidget);
      expect(find.text('In Progress'), findsOneWidget);
      expect(find.text('Completed'), findsOneWidget);
    });

    testWidgets('4. Filter choice chips toggle status filter', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            staffSessionsListProvider(null).overrideWith((ref) => Future.value([activeSession, completedSession])),
            staffSessionsListProvider('IN_PROGRESS').overrideWith((ref) => Future.value([activeSession])),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const StaffConductedSessionsScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('ALL'), findsOneWidget);
      expect(find.text('IN PROGRESS'), findsOneWidget);
      expect(find.text('COMPLETED'), findsOneWidget);

      await tester.tap(find.text('IN PROGRESS'));
      await tester.pumpAndSettle();

      expect(find.text('Data Structures Mock Session'), findsOneWidget);
    });

    testWidgets('5. Error state renders when session fetch fails', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            staffSessionsListProvider(null).overrideWith((ref) => Future.error(Exception('Failed to load'))),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const StaffConductedSessionsScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Failed to load conducted sessions'), findsOneWidget);
    });
  });
}
