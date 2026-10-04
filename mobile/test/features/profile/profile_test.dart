import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:placement_attendance_mobile/core/theme/app_theme.dart';
import 'package:placement_attendance_mobile/features/auth/domain/auth_state.dart';
import 'package:placement_attendance_mobile/features/auth/providers/auth_provider.dart';
import 'package:placement_attendance_mobile/features/profile/presentation/change_password_modal.dart';
import 'package:placement_attendance_mobile/features/profile/presentation/profile_screen.dart';

class MockAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  bool updateProfileResult = true;
  bool changePasswordResult = true;
  bool logoutCalled = false;
  UpdateProfileDto? lastUpdateProfileDto;
  ChangePasswordDto? lastChangePasswordDto;

  MockAuthNotifier(super.initial);

  @override
  Future<void> restoreSession() async {}

  @override
  Future<bool> login(String email, String password) async => true;

  @override
  Future<bool> updateProfile(UpdateProfileDto dto) async {
    lastUpdateProfileDto = dto;
    if (updateProfileResult && state is Authenticated) {
      final cur = state as Authenticated;
      final newProfile = Map<String, dynamic>.from(cur.profile ?? {});
      if (dto.phoneNumber != null) newProfile['phoneNumber'] = dto.phoneNumber;
      if (dto.avatarUrl != null) newProfile['avatarUrl'] = dto.avatarUrl;
      state = Authenticated(user: cur.user, profile: newProfile);
    }
    return updateProfileResult;
  }

  @override
  Future<bool> changePassword(ChangePasswordDto dto) async {
    lastChangePasswordDto = dto;
    return changePasswordResult;
  }

  @override
  Future<void> logout() async {
    logoutCalled = true;
    state = const Unauthenticated();
  }

  @override
  void onSessionExpired() {
    state = const Unauthenticated(message: 'Session expired. Please log in again.');
  }
}

void main() {
  final testUser = UserIdentity(
    id: 'usr-100',
    email: 'sarathy@kahedu.edu.in',
    role: UserRole.student,
    status: 'ACTIVE',
    firstName: 'Sarathy',
    lastName: 'K',
  );

  final testProfile = {
    'id': 'prof-100',
    'registerNumber': '721221MCA001',
    'collegeEmail': 'sarathy@kahedu.edu.in',
    'phoneNumber': '9876543210',
    'avatarUrl': null,
    'isPlacementEligible': true,
    'department': {'name': 'Department of Computer Applications'},
    'course': {'name': 'Master of Computer Applications'},
    'batch': {'name': '2024-2026'},
  };

  group('Profile Screen & Change Password Widget Tests', () {
    testWidgets('1. Profile screen renders student identity and read-only details', (WidgetTester tester) async {
      final mockNotifier = MockAuthNotifier(Authenticated(user: testUser, profile: testProfile));

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => mockNotifier),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const ProfileScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Sarathy K'), findsOneWidget);
      expect(find.textContaining('sarathy@kahedu.edu.in'), findsWidgets);
      expect(find.text('721221MCA001'), findsOneWidget);
      expect(find.text('Department of Computer Applications'), findsOneWidget);
      expect(find.text('Master of Computer Applications'), findsOneWidget);
      expect(find.text('2024-2026'), findsOneWidget);
      expect(find.text('ELIGIBLE'), findsOneWidget);
    });

    testWidgets('2. Toggle edit mode reveals editable fields and hides read-only labels', (WidgetTester tester) async {
      final mockNotifier = MockAuthNotifier(Authenticated(user: testUser, profile: testProfile));

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => mockNotifier),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const ProfileScreen()),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Edit'), findsOneWidget);
      await tester.ensureVisible(find.text('Edit'));
      await tester.tap(find.text('Edit'));
      await tester.pumpAndSettle();

      expect(find.text('Cancel'), findsOneWidget);
      expect(find.text('SAVE CHANGES'), findsOneWidget);
      expect(find.byType(TextFormField), findsWidgets);
    });

    testWidgets('3. Updating profile invokes updateProfile and shows success snackbar', (WidgetTester tester) async {
      final mockNotifier = MockAuthNotifier(Authenticated(user: testUser, profile: testProfile));

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => mockNotifier),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const ProfileScreen()),
        ),
      );
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.text('Edit'));
      await tester.tap(find.text('Edit'));
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.text('SAVE CHANGES'));
      await tester.tap(find.text('SAVE CHANGES'));
      await tester.pumpAndSettle();

      expect(mockNotifier.lastUpdateProfileDto, isNotNull);
      expect(find.text('Profile updated successfully'), findsOneWidget);
    });

    testWidgets('4. Profile update failure shows error feedback snackbar', (WidgetTester tester) async {
      final mockNotifier = MockAuthNotifier(Authenticated(user: testUser, profile: testProfile))
        ..updateProfileResult = false;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => mockNotifier),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const ProfileScreen()),
        ),
      );
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.text('Edit'));
      await tester.tap(find.text('Edit'));
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.text('SAVE CHANGES'));
      await tester.tap(find.text('SAVE CHANGES'));
      await tester.pumpAndSettle();

      expect(find.text('Failed to update profile'), findsOneWidget);
    });

    testWidgets('5. Change password modal validates min 8 chars and matching passwords', (WidgetTester tester) async {
      final mockNotifier = MockAuthNotifier(Authenticated(user: testUser, profile: testProfile));

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => mockNotifier),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const Scaffold(body: ChangePasswordModal())),
        ),
      );
      await tester.pumpAndSettle();

      // Submit empty form
      await tester.tap(find.text('UPDATE PASSWORD'));
      await tester.pumpAndSettle();

      expect(find.text('Please enter current password'), findsOneWidget);

      // Enter short password (< 8 chars)
      await tester.enterText(find.widgetWithText(TextFormField, 'Current Password'), 'oldPass123');
      await tester.enterText(find.widgetWithText(TextFormField, 'New Password'), 'short');
      await tester.enterText(find.widgetWithText(TextFormField, 'Confirm New Password'), 'mismatch');
      await tester.tap(find.text('UPDATE PASSWORD'));
      await tester.pumpAndSettle();

      expect(find.text('New password must be at least 8 characters long'), findsOneWidget);

      // Enter mismatched confirm password
      await tester.enterText(find.widgetWithText(TextFormField, 'New Password'), 'newSecurePass123');
      await tester.tap(find.text('UPDATE PASSWORD'));
      await tester.pumpAndSettle();

      expect(find.text('Passwords do not match'), findsOneWidget);
    });

    testWidgets('6. Successful change password submission calls changePassword', (WidgetTester tester) async {
      final mockNotifier = MockAuthNotifier(Authenticated(user: testUser, profile: testProfile));

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => mockNotifier),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const Scaffold(body: ChangePasswordModal())),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(find.widgetWithText(TextFormField, 'Current Password'), 'oldPass123');
      await tester.enterText(find.widgetWithText(TextFormField, 'New Password'), 'newSecurePass123');
      await tester.enterText(find.widgetWithText(TextFormField, 'Confirm New Password'), 'newSecurePass123');

      await tester.tap(find.text('UPDATE PASSWORD'));
      await tester.pumpAndSettle();

      expect(mockNotifier.lastChangePasswordDto, isNotNull);
      expect(mockNotifier.lastChangePasswordDto?.currentPassword, 'oldPass123');
      expect(mockNotifier.lastChangePasswordDto?.newPassword, 'newSecurePass123');
    });

    testWidgets('7. Logout button triggers logout action', (WidgetTester tester) async {
      final mockNotifier = MockAuthNotifier(Authenticated(user: testUser, profile: testProfile));

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            authNotifierProvider.overrideWith((ref) => mockNotifier),
          ],
          child: MaterialApp(theme: AppTheme.lightTheme, home: const ProfileScreen()),
        ),
      );
      await tester.pumpAndSettle();

      await tester.ensureVisible(find.text('LOG OUT'));
      await tester.tap(find.text('LOG OUT'));
      await tester.pump();

      expect(mockNotifier.logoutCalled, isTrue);
    });
  });
}
