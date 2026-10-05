import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/widgets.dart';
import '../data/models/my_attendance_model.dart';
import '../data/models/session_model.dart';
import 'providers/sessions_provider.dart';
import 'session_detail_screen.dart';

class StudentSessionsScreen extends ConsumerStatefulWidget {
  const StudentSessionsScreen({super.key});

  @override
  ConsumerState<StudentSessionsScreen> createState() => _StudentSessionsScreenState();
}

class _StudentSessionsScreenState extends ConsumerState<StudentSessionsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final sessionsAsync = ref.watch(studentSessionsListProvider(null));
    final attendanceHistoryAsync = ref.watch(myAttendanceListProvider);

    final Map<String, MyAttendanceModel> attendanceMap = attendanceHistoryAsync.maybeWhen(
      data: (records) => {for (var r in records) r.sessionId: r},
      orElse: () => {},
    );

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Sessions'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          tabs: const [
            Tab(text: 'TODAY'),
            Tab(text: 'YESTERDAY'),
            Tab(text: 'TOMORROW'),
          ],
        ),
      ),
      body: sessionsAsync.when(
        loading: () => const LoadingState(message: 'Fetching your placement sessions...'),
        error: (err, stack) => ErrorState(
          message: 'Failed to load sessions',
          onRetry: () => ref.refresh(studentSessionsListProvider(null)),
        ),
        data: (allSessions) {
          final now = DateTime.now();
          final today = DateTime(now.year, now.month, now.day);
          final yesterday = today.subtract(const Duration(days: 1));
          final tomorrow = today.add(const Duration(days: 1));

          bool isSameDay(DateTime a, DateTime b) {
            return a.year == b.year && a.month == b.month && a.day == b.day;
          }

          final todaySessions = allSessions.where((s) => isSameDay(s.startTime, today)).toList()
            ..sort((a, b) => a.startTime.compareTo(b.startTime));

          final yesterdaySessions = allSessions.where((s) => isSameDay(s.startTime, yesterday)).toList()
            ..sort((a, b) => a.startTime.compareTo(b.startTime));

          final tomorrowSessions = allSessions.where((s) => isSameDay(s.startTime, tomorrow)).toList()
            ..sort((a, b) => a.startTime.compareTo(b.startTime));

          return TabBarView(
            controller: _tabController,
            children: [
              _buildSessionList(
                context,
                todaySessions,
                attendanceMap,
                emptyTitle: 'No sessions today',
                emptyDescription: 'You have no placement sessions scheduled for today.',
              ),
              _buildSessionList(
                context,
                yesterdaySessions,
                attendanceMap,
                emptyTitle: 'No sessions yesterday',
                emptyDescription: 'No placement sessions occurred yesterday.',
              ),
              _buildSessionList(
                context,
                tomorrowSessions,
                attendanceMap,
                emptyTitle: 'No sessions tomorrow',
                emptyDescription: 'No placement sessions scheduled for tomorrow.',
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSessionList(
    BuildContext context,
    List<SessionModel> sessions,
    Map<String, MyAttendanceModel> attendanceMap, {
    required String emptyTitle,
    required String emptyDescription,
  }) {
    if (sessions.isEmpty) {
      return RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(studentSessionsListProvider(null));
          ref.invalidate(myAttendanceListProvider);
        },
        color: AppColors.primary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: SizedBox(
            height: MediaQuery.of(context).size.height * 0.6,
            child: EmptyState(
              icon: Icons.event_note_outlined,
              title: emptyTitle,
              description: emptyDescription,
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(studentSessionsListProvider(null));
        ref.invalidate(myAttendanceListProvider);
      },
      color: AppColors.primary,
      child: ListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: sessions.length,
        itemBuilder: (context, index) {
          final session = sessions[index];
          final attendance = attendanceMap[session.id];

          String attendanceStatus = attendance != null ? attendance.attendanceStatus : 'NOT_MARKED';

          return Padding(
            padding: const EdgeInsets.only(bottom: 12.0),
            child: SessionCard(
              title: session.title,
              date: session.formattedDate,
              timeRange: session.formattedTime,
              venue: session.displayVenue,
              staffName: session.displayStaff,
              status: session.status.name.toUpperCase(),
              attendanceStatus: attendanceStatus,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => SessionDetailScreen(sessionId: session.id),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
