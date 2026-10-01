import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/domain/auth_state.dart';
import '../../features/auth/presentation/admin_notice_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/auth/providers/auth_provider.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/sessions/presentation/schedule_session_screen.dart';
import '../../features/sessions/presentation/staff_attendance_roster_screen.dart';
import '../../features/sessions/presentation/staff_home_screen.dart';
import '../../features/sessions/presentation/staff_qr_scanner_screen.dart';
import '../../features/sessions/presentation/student_home_screen.dart';
import '../../features/sessions/data/models/session_model.dart';
import 'route_names.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: RouteNames.splash,
    refreshListenable: _ListenableAdapter(ref),
    redirect: (BuildContext context, GoRouterState state) {
      final authState = ref.read(authNotifierProvider);

      if (authState is AuthLoading || authState is AuthInitial) {
        return RouteNames.splash;
      }

      final isUnauthenticated = authState is Unauthenticated;
      final isLoggingIn = state.matchedLocation == RouteNames.login;

      if (isUnauthenticated) {
        return isLoggingIn ? null : RouteNames.login;
      }

      if (authState is Authenticated) {
        final role = authState.user.role;
        final currentLocation = state.matchedLocation;

        if (isLoggingIn || currentLocation == RouteNames.splash) {
          switch (role) {
            case UserRole.student:
              return RouteNames.studentHome;
            case UserRole.staff:
              return RouteNames.staffHome;
            case UserRole.admin:
            case UserRole.superAdmin:
              return RouteNames.adminNotice;
          }
        }
      }

      return null;
    },
    routes: [
      GoRoute(
        path: RouteNames.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: RouteNames.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: RouteNames.studentHome,
        builder: (context, state) => const StudentHomeScreen(),
      ),
      GoRoute(
        path: RouteNames.staffHome,
        builder: (context, state) => const StaffHomeScreen(),
      ),
      GoRoute(
        path: RouteNames.adminNotice,
        builder: (context, state) => const AdminNoticeScreen(),
      ),
      GoRoute(
        path: RouteNames.profile,
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: RouteNames.scheduleSession,
        builder: (context, state) => const ScheduleSessionScreen(),
      ),
      GoRoute(
        path: RouteNames.staffQrScanner,
        builder: (context, state) {
          final sessionId = state.uri.queryParameters['sessionId'];
          final session = state.extra is SessionModel ? state.extra as SessionModel : null;
          return StaffQrScannerScreen(
            sessionId: sessionId,
            session: session,
          );
        },
      ),
      GoRoute(
        path: RouteNames.staffAttendanceRoster,
        builder: (context, state) {
          final sessionId = state.pathParameters['id'] ?? '';
          return StaffAttendanceRosterScreen(sessionId: sessionId);
        },
      ),
    ],
  );
});

class _ListenableAdapter extends ChangeNotifier {
  _ListenableAdapter(Ref ref) {
    ref.listen<AuthState>(authNotifierProvider, (previous, next) {
      notifyListeners();
    });
  }
}
