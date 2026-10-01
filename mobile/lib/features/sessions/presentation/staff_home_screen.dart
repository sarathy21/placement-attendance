import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/router/route_names.dart';
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
import 'staff_conducted_sessions_screen.dart';

class StaffHomeScreen extends ConsumerStatefulWidget {
  const StaffHomeScreen({super.key});

  @override
  ConsumerState<StaffHomeScreen> createState() => _StaffHomeScreenState();
}

class _StaffHomeScreenState extends ConsumerState<StaffHomeScreen> {
  int _currentIndex = 0;

  void _onTabSelected(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = ref.watch(unreadCountNotifierProvider);

    final pages = [
      // 1. Staff Home Dashboard
      _StaffDashboardView(onNavigateToTab: _onTabSelected),
      // 2. Conducted Sessions
      const StaffConductedSessionsScreen(),
      // 3. Calendar View
      const CalendarScreen(),
      // 4. Notifications Screen
      const NotificationsScreen(),
      // 5. Profile
      const ProfileScreen(),
    ];

    return Scaffold(
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
    );
  }
}

class _StaffDashboardView extends ConsumerWidget {
  final ValueChanged<int> onNavigateToTab;

  const _StaffDashboardView({required this.onNavigateToTab});

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

  String _getStaffName(AuthState authState) {
    if (authState is Authenticated) {
      final firstName = authState.user.firstName;
      final lastName = authState.user.lastName;
      if (firstName != null && firstName.isNotEmpty) {
        return lastName != null && lastName.isNotEmpty ? '$firstName $lastName' : firstName;
      }
      final emailPrefix = authState.user.email.split('@').first;
      return emailPrefix.toUpperCase();
    }
    return 'Staff Member';
  }

  String _getStaffSubtitle(AuthState authState) {
    if (authState is Authenticated && authState.profile != null) {
      final dept = authState.profile!['departmentId'] ?? authState.profile!['department']?['name'] ?? '';
      if (dept.toString().isNotEmpty) {
        return 'Placement Staff • $dept';
      }
    }
    return 'Placement Staff Member';
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider);
    final greeting = _getGreeting();
    final staffName = _getStaffName(authState);
    final staffSubtitle = _getStaffSubtitle(authState);
    final nextDriveAsync = ref.watch(nextUpcomingDriveProvider);
    final sessionsAsync = ref.watch(staffSessionsListProvider(null));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(staffSessionsListProvider(null));
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
                            staffName,
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
                            staffSubtitle,
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
                              staffName.isNotEmpty ? staffName[0].toUpperCase() : 'S',
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
                const SectionHeader(title: 'Staff Quick Actions'),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.event_note_rounded,
                        title: 'Conducted Sessions',
                        subtitle: 'View & Manage',
                        onTap: () => onNavigateToTab(1),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.qr_code_scanner_rounded,
                        title: 'Scan Attendance',
                        subtitle: 'Scan Student QR',
                        onTap: () {
                          context.push(RouteNames.staffQrScanner);
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.calendar_month_rounded,
                        title: 'Placement Drives',
                        subtitle: 'Drives & Rounds',
                        onTap: () => onNavigateToTab(2),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _QuickActionCard(
                        icon: Icons.notifications_outlined,
                        title: 'Notifications',
                        subtitle: 'Updates & Alerts',
                        onTap: () => onNavigateToTab(3),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // C. TODAY'S SESSIONS SUMMARY STATISTICS
                const SectionHeader(title: "Today's Sessions Summary"),
                const SizedBox(height: 8),
                sessionsAsync.when(
                  loading: () => const LoadingState(message: 'Calculating session metrics...'),
                  error: (err, stack) => ErrorState(
                    message: 'Failed to load session summary',
                    onRetry: () => ref.refresh(staffSessionsListProvider(null)),
                  ),
                  data: (sessions) {
                    final now = DateTime.now();
                    final todaySessions = sessions.where((s) => _isSameDay(s.sessionDate, now)).toList();

                    final totalToday = todaySessions.length;
                    final inProgressCount = todaySessions.where((s) => s.status == SessionLifecycleStatus.inProgress).length;
                    final scheduledCount = todaySessions.where((s) => s.status == SessionLifecycleStatus.scheduled).length;
                    final completedCount = todaySessions.where((s) => s.status == SessionLifecycleStatus.completed).length;
                    final cancelledCount = todaySessions.where((s) => s.status == SessionLifecycleStatus.cancelled).length;

                    return AppCard(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '${now.day} ${_monthName(now.month)} ${now.year}',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                '$totalToday Session${totalToday == 1 ? '' : 's'} Today',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                          const Divider(height: 20),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _buildMetricItem('SCHEDULED', scheduledCount, AppColors.info),
                              _buildMetricItem('IN PROGRESS', inProgressCount, AppColors.primary),
                              _buildMetricItem('COMPLETED', completedCount, AppColors.statusPresent),
                              _buildMetricItem('CANCELLED', cancelledCount, AppColors.statusAbsent),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
                const SizedBox(height: 24),

                // D. ACTIVE SESSION (IN PROGRESS)
                SectionHeader(
                  title: 'Active Session',
                  actionLabel: 'View All',
                  onAction: () => onNavigateToTab(1),
                ),
                const SizedBox(height: 8),
                sessionsAsync.when(
                  loading: () => const LoadingState(message: 'Checking active sessions...'),
                  error: (err, stack) => const EmptyState(
                    icon: Icons.play_circle_outline_rounded,
                    title: 'No Active Sessions',
                    description: 'There are no sessions currently IN PROGRESS.',
                  ),
                  data: (sessions) {
                    final activeList = sessions.where((s) => s.status == SessionLifecycleStatus.inProgress).toList();

                    if (activeList.isEmpty) {
                      return const EmptyState(
                        icon: Icons.play_circle_outline_rounded,
                        title: 'No Active Sessions',
                        description: 'There are no sessions currently IN PROGRESS. Active sessions will appear here.',
                      );
                    }

                    final activeSession = activeList.first;
                    return SessionCard(
                      title: activeSession.title,
                      date: activeSession.formattedDate,
                      timeRange: activeSession.formattedTime,
                      venue: activeSession.displayVenue,
                      staffName: activeSession.displayStaff,
                      status: activeSession.displayStatus,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => SessionDetailScreen(sessionId: activeSession.id),
                          ),
                        );
                      },
                    );
                  },
                ),
                const SizedBox(height: 24),

                // E. NEXT SCHEDULED SESSION
                SectionHeader(
                  title: 'Next Scheduled Session',
                  actionLabel: 'View All',
                  onAction: () => onNavigateToTab(1),
                ),
                const SizedBox(height: 8),
                sessionsAsync.when(
                  loading: () => const LoadingState(message: 'Loading next scheduled session...'),
                  error: (err, stack) => const EmptyState(
                    icon: Icons.event_note_outlined,
                    title: 'No Upcoming Scheduled Sessions',
                    description: 'Your scheduled placement training sessions will be displayed here.',
                  ),
                  data: (sessions) {
                    final scheduledList = sessions.where((s) => s.status == SessionLifecycleStatus.scheduled).toList();

                    if (scheduledList.isEmpty) {
                      return const EmptyState(
                        icon: Icons.event_note_outlined,
                        title: 'No Upcoming Scheduled Sessions',
                        description: 'Your scheduled placement training sessions will be displayed here.',
                      );
                    }

                    final nextSession = scheduledList.first;
                    return SessionCard(
                      title: nextSession.title,
                      date: nextSession.formattedDate,
                      timeRange: nextSession.formattedTime,
                      venue: nextSession.displayVenue,
                      staffName: nextSession.displayStaff,
                      status: nextSession.displayStatus,
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

                // F. UPCOMING PLACEMENT DRIVE
                SectionHeader(
                  title: 'Next Placement Drive',
                  actionLabel: 'View All',
                  onAction: () => onNavigateToTab(2),
                ),
                const SizedBox(height: 8),
                nextDriveAsync.when(
                  loading: () => const LoadingState(message: 'Loading placement drive...'),
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
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMetricItem(String label, int count, Color color) {
    return Column(
      children: [
        Text(
          '$count',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }

  String _monthName(int month) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[month - 1];
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
