import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:placement_attendance_mobile/core/theme/app_theme.dart';
import 'package:placement_attendance_mobile/core/widgets/widgets.dart';

void main() {
  Widget buildTestableWidget(Widget child) {
    return MaterialApp(
      theme: AppTheme.lightTheme,
      home: Scaffold(body: SingleChildScrollView(child: child)),
    );
  }

  group('Shared UI Widgets Tests', () {
    testWidgets('AppCard renders child and triggers onTap callback', (WidgetTester tester) async {
      bool tapped = false;

      await tester.pumpWidget(buildTestableWidget(
        AppCard(
          onTap: () => tapped = true,
          child: const Text('Test Card Content'),
        ),
      ));

      expect(find.text('Test Card Content'), findsOneWidget);
      await tester.tap(find.text('Test Card Content'));
      expect(tapped, isTrue);
    });

    testWidgets('SectionHeader renders title and action label', (WidgetTester tester) async {
      bool actionTriggered = false;

      await tester.pumpWidget(buildTestableWidget(
        SectionHeader(
          title: 'Upcoming Drives',
          actionLabel: 'View All',
          onAction: () => actionTriggered = true,
        ),
      ));

      expect(find.text('Upcoming Drives'), findsOneWidget);
      expect(find.text('View All'), findsOneWidget);

      await tester.tap(find.text('View All'));
      expect(actionTriggered, isTrue);
    });

    testWidgets('StatusBadge renders correct label for status', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestableWidget(
        const Column(
          children: [
            StatusBadge(status: 'UPCOMING'),
            StatusBadge(status: 'COMPLETED'),
            StatusBadge(status: 'REQUIRED'),
          ],
        ),
      ));

      expect(find.text('Upcoming'), findsOneWidget);
      expect(find.text('Completed'), findsOneWidget);
      expect(find.text('Attendance Required'), findsOneWidget);
    });

    testWidgets('EmptyState renders title, description, and action button', (WidgetTester tester) async {
      bool reloaded = false;

      await tester.pumpWidget(buildTestableWidget(
        EmptyState(
          title: 'No Sessions',
          description: 'You have no scheduled sessions today.',
          actionLabel: 'Refresh',
          onAction: () => reloaded = true,
        ),
      ));

      expect(find.text('No Sessions'), findsOneWidget);
      expect(find.text('You have no scheduled sessions today.'), findsOneWidget);
      expect(find.text('Refresh'), findsOneWidget);

      await tester.tap(find.text('Refresh'));
      expect(reloaded, isTrue);
    });

    testWidgets('LoadingState renders circular progress indicator and message', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestableWidget(
        const LoadingState(message: 'Fetching placement drives...'),
      ));

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Fetching placement drives...'), findsOneWidget);
    });

    testWidgets('ErrorState renders error message and try again button', (WidgetTester tester) async {
      bool retried = false;

      await tester.pumpWidget(buildTestableWidget(
        ErrorState(
          message: 'Network connection timeout',
          onRetry: () => retried = true,
        ),
      ));

      expect(find.text('Something went wrong'), findsOneWidget);
      expect(find.text('Network connection timeout'), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);

      await tester.tap(find.text('Try Again'));
      expect(retried, isTrue);
    });

    testWidgets('PrimaryButton renders text and loading indicator', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestableWidget(
        const PrimaryButton(
          text: 'Submit Application',
          isLoading: true,
        ),
      ));

      expect(find.text('Submit Application'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('ProfileHeader renders avatar initials, name, and subtitle', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestableWidget(
        const ProfileHeader(
          name: 'Sarah Connor',
          subtitle: 'Computer Science & Engineering',
          badgeLabel: 'Placement Eligible',
        ),
      ));

      expect(find.text('Sarah Connor'), findsOneWidget);
      expect(find.text('SC'), findsOneWidget); // Initials
      expect(find.text('Computer Science & Engineering'), findsOneWidget);
      expect(find.text('Placement Eligible'), findsOneWidget);
    });

    testWidgets('PlacementDriveCard renders company, date, venue, and status', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestableWidget(
        const PlacementDriveCard(
          companyName: 'TCS Cyber Security',
          driveDate: '15 Oct 2026',
          venue: 'Main Auditorium',
          status: 'UPCOMING',
          attendanceEnabled: true,
          roundsCount: 3,
        ),
      ));

      expect(find.text('TCS Cyber Security'), findsOneWidget);
      expect(find.text('15 Oct 2026'), findsOneWidget);
      expect(find.text('Main Auditorium'), findsOneWidget);
      expect(find.text('Upcoming'), findsOneWidget);
      expect(find.text('3 Rounds'), findsOneWidget);
    });

    testWidgets('SessionCard renders title, time, venue, and status', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestableWidget(
        const SessionCard(
          title: 'Advanced Java Backend Training',
          date: '10 Oct 2026',
          timeRange: '10:00 AM - 12:00 PM',
          venue: 'Lab 302',
          staffName: 'Dr. Alan Turing',
          status: 'SCHEDULED',
        ),
      ));

      expect(find.text('Advanced Java Backend Training'), findsOneWidget);
      expect(find.text('10 Oct 2026  •  10:00 AM - 12:00 PM'), findsOneWidget);
      expect(find.text('Lab 302'), findsOneWidget);
      expect(find.text('Dr. Alan Turing'), findsOneWidget);
      expect(find.text('Scheduled'), findsOneWidget);
    });

    testWidgets('NotificationCard renders title, message, and timestamp', (WidgetTester tester) async {
      await tester.pumpWidget(buildTestableWidget(
        const NotificationCard(
          title: 'Placement Drive Scheduled',
          message: 'Infosys placement drive has been scheduled for Oct 25.',
          timestamp: '2 hours ago',
          isRead: false,
          type: 'DRIVE_SCHEDULED',
        ),
      ));

      expect(find.text('Placement Drive Scheduled'), findsOneWidget);
      expect(find.text('Infosys placement drive has been scheduled for Oct 25.'), findsOneWidget);
      expect(find.text('2 hours ago'), findsOneWidget);
    });
  });
}
