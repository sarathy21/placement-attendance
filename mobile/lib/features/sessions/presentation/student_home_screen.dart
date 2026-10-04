import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/widgets.dart';
import '../../auth/domain/auth_state.dart';
import '../../auth/providers/auth_provider.dart';
import '../../calendar/domain/placement_drive_model.dart';
import '../../calendar/presentation/calendar_screen.dart';
import '../../calendar/presentation/drive_detail_screen.dart';
import '../../calendar/providers/placement_drives_provider.dart';
import '../../notifications/presentation/notifications_screen.dart';
import '../../notifications/presentation/providers/notifications_provider.dart';
import '../../profile/presentation/profile_screen.dart';
import '../data/models/session_model.dart';
import 'providers/sessions_provider.dart';
import 'session_detail_screen.dart';
import 'student_sessions_screen.dart';

class StudentHomeScreen extends ConsumerStatefulWidget {
  const StudentHomeScreen({super.key});

  @override
  ConsumerState<StudentHomeScreen> createState() => _StudentHomeScreenState();
}

class _StudentHomeScreenState extends ConsumerState<StudentHomeScreen> {
  int _currentIndex = 0;

  void _onTabSelected(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = ref.watch(unreadCountNotifierProvider);

    final pages = [
      // 1. Home Dashboard
      _StudentDashboardView(onNavigateToTab: _onTabSelected),
      // 2. Sessions
      const StudentSessionsScreen(),
      // 3. Calendar View
      const CalendarScreen(),
      // 4. Notifications Screen
      const NotificationsScreen(),
      // 5. Profile
      const ProfileScreen(),
    ];

    return PopScope(
      canPop: _currentIndex == 0,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop && _currentIndex != 0) {
          setState(() => _currentIndex = 0);
        }
      },
      child: Scaffold(
        body: IndexedStack(
          index: _currentIndex,
          children: pages,
        ),
        bottomNavigationBar: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: _onTabSelected,
          type: BottomNavigationBarType.fixed,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.textMuted,
          backgroundColor: Colors.white,
          elevation: 8,
          selectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          unselectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
          items: [
            const BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home),
              label: 'Home',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.event_note_outlined),
              activeIcon: Icon(Icons.event_note),
              label: 'Sessions',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.calendar_month_outlined),
              activeIcon: Icon(Icons.calendar_month),
              label: 'Calendar',
            ),
            BottomNavigationBarItem(
              icon: Badge(
                isLabelVisible: unreadCount > 0,
                label: Text('$unreadCount'),
                backgroundColor: AppColors.primary,
                child: const Icon(Icons.notifications_outlined),
              ),
              activeIcon: Badge(
                isLabelVisible: unreadCount > 0,
                label: Text('$unreadCount'),
                backgroundColor: AppColors.primary,
                child: const Icon(Icons.notifications),
              ),
              label: 'Notifications',
            ),
            const BottomNavigationBarItem(
              icon: Icon(Icons.person_outline),
              activeIcon: Icon(Icons.person),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}

class _StudentDashboardView extends ConsumerWidget {
  final ValueChanged<int> onNavigateToTab;

  const _StudentDashboardView({required this.onNavigateToTab});

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) {
      return 'Good morning';
    } else if (hour < 17) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  }

  String _getStudentName(AuthState authState) {
    if (authState is Authenticated) {
      final firstName = authState.user.firstName;
      final lastName = authState.user.lastName;
      if (firstName != null && firstName.isNotEmpty) {
        return lastName != null && lastName.isNotEmpty ? '$firstName $lastName' : firstName;
      }
      final emailPrefix = authState.user.email.split('@').first;
      return emailPrefix.toUpperCase();
    }
    return 'Student';
  }

  String _getStudentSubtitle(AuthState authState) {
    if (authState is Authenticated && authState.profile != null) {
      final dept = authState.profile!['departmentId'] ?? '';
      if (dept.toString().isNotEmpty) {
        return 'Placement Student • $dept';
      }
    }
    return 'University Placement Portal';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider);
    final greeting = _getGreeting();
    final studentName = _getStudentName(authState);
    final studentSubtitle = _getStudentSubtitle(authState);
    final nextDriveAsync = ref.watch(nextUpcomingDriveProvider);
    final drivesAsync = ref.watch(placementDrivesProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(placementDrivesProvider);
          },
          color: AppColors.primary,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // A. HEADER
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$greeting,',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            studentName,
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                              height: 1.2,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            studentSubtitle,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Row(
                      children: [
                        Consumer(
                          builder: (context, ref, child) {
                            final unreadCount = ref.watch(unreadCountNotifierProvider);
                            return IconButton(
                              onPressed: () => onNavigateToTab(3), // Notifications Tab
                              icon: Badge(
                                isLabelVisible: unreadCount > 0,
                                label: Text('$unreadCount'),
                                backgroundColor: AppColors.primary,
                                child: const Icon(Icons.notifications_outlined, size: 26, color: AppColors.textPrimary),
                              ),
                              tooltip: 'Notifications',
                            );
                          },
                        ),
                        InkWell(
                          onTap: () => onNavigateToTab(4), // Profile Tab
                          borderRadius: BorderRadius.circular(20),
                          child: CircleAvatar(
                            radius: 20,
                            backgroundColor: AppColors.primaryLight,
                            child: Text(
                              studentName.isNotEmpty ? studentName[0].toUpperCase() : 'S',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primaryDark,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // B. QUICK ACTIONS GRID
                const SectionHeader(title: 'Quick Actions'),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.event_note_rounded,
                        title: 'My Sessions',
                        subtitle: 'Schedule & QR',
                        onTap: () => onNavigateToTab(1),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.calendar_month_rounded,
                        title: 'Placement Calendar',
                        subtitle: 'Drives & Rounds',
                        onTap: () => onNavigateToTab(2),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.notifications_outlined,
                        title: 'Notifications',
                        subtitle: 'Updates & Alerts',
                        onTap: () => onNavigateToTab(3),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.person_outline_rounded,
                        title: 'My Profile',
                        subtitle: 'Identity & Info',
                        onTap: () => onNavigateToTab(4),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // C. NEXT PLACEMENT DRIVE
                SectionHeader(
                  title: 'Next Placement Drive',
                  actionLabel: 'View All',
                  onAction: () => onNavigateToTab(2),
                ),
                const SizedBox(height: 8),
                nextDriveAsync.when(
                  loading: () => const LoadingState(message: 'Loading upcoming drive...'),
                  error: (err, stack) => ErrorState(
                    message: 'Failed to load placement drives',
                    onRetry: () => ref.refresh(placementDrivesProvider),
                  ),
                  data: (PlacementDriveModel? drive) {
                    if (drive == null) {
                      return EmptyState(
                        icon: Icons.business_center_outlined,
                        title: 'No Upcoming Placement Drives',
                        description: 'There are currently no placement drives scheduled. Check back soon!',
                        actionLabel: 'Browse Calendar',
                        onAction: () => onNavigateToTab(2),
                      );
                    }

                    return PlacementDriveCard(
                      companyName: drive.companyName,
                      driveDate: drive.formattedDriveDate,
                      venue: drive.venue,
                      status: drive.status.name.toUpperCase(),
                      attendanceEnabled: drive.attendanceEnabled,
                      roundsCount: drive.rounds.length,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => DriveDetailScreen(driveId: drive.id),
                          ),
                        );
                      },
                    );
                  },
                ),
                const SizedBox(height: 24),

                // D. NEXT SESSION
                SectionHeader(
                  title: 'Next Session',
                  actionLabel: 'View All',
                  onAction: () => onNavigateToTab(1),
                ),
                const SizedBox(height: 8),
                ref.watch(studentSessionsListProvider(null)).when(
                      loading: () => const LoadingState(message: 'Loading next session...'),
                      error: (err, stack) => const EmptyState(
                        icon: Icons.event_note_outlined,
                        title: 'No Sessions Scheduled Today',
                        description: 'Enrolled academic and placement training sessions will be displayed here.',
                      ),
                      data: (sessions) {
                        final active = sessions
                            .where((s) =>
                                s.status == SessionLifecycleStatus.inProgress ||
                                s.status == SessionLifecycleStatus.scheduled)
                            .toList();

                        if (active.isEmpty) {
                          return const EmptyState(
                            icon: Icons.event_note_outlined,
                            title: 'No Sessions Scheduled Today',
                            description: 'Enrolled academic and placement training sessions will be displayed here.',
                          );
                        }

                        final nextSession = active.first;
                        return SessionCard(
                          title: nextSession.title,
                          date: nextSession.formattedDate,
                          timeRange: nextSession.formattedTime,
                          venue: nextSession.displayVenue,
                          staffName: nextSession.displayStaff,
                          status: nextSession.status.name.toUpperCase(),
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => SessionDetailScreen(sessionId: nextSession.id),
                              ),
                            );
                          },
                        );
                      },
                    ),
                const SizedBox(height: 24),

                // E. TODAY SUMMARY
                const SectionHeader(title: "Today's Summary"),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: AppCard(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.today_rounded, size: 18, color: AppColors.primary),
                                SizedBox(width: 6),
                                Text(
                                  'Date',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _formattedTodayDate(),
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: AppCard(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.business_center_rounded, size: 18, color: AppColors.primary),
                                SizedBox(width: 6),
                                Text(
                                  'Active Drives',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            drivesAsync.maybeWhen(
                              data: (drives) => Text(
                                '${drives.length} Drives Available',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              orElse: () => const Text(
                                '0 Drives',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formattedTodayDate() {
    final now = DateTime.now();
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${now.day} ${months[now.month - 1]} ${now.year}';
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14.0),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primaryLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 22, color: AppColors.primaryDark),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.textSecondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
