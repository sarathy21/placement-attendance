import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/errors/failures.dart';
import '../../../core/widgets/widgets.dart';
import '../data/models/attendance_roster_model.dart';
import '../data/models/session_model.dart';
import 'providers/sessions_provider.dart';

class StaffAttendanceRosterScreen extends ConsumerStatefulWidget {
  final String sessionId;

  const StaffAttendanceRosterScreen({
    super.key,
    required this.sessionId,
  });

  @override
  ConsumerState<StaffAttendanceRosterScreen> createState() => _StaffAttendanceRosterScreenState();
}

class _StaffAttendanceRosterScreenState extends ConsumerState<StaffAttendanceRosterScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _selectedStatusFilter = 'ALL';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<AttendanceRosterStudentModel> _filterRoster(List<AttendanceRosterStudentModel> roster) {
    return roster.where((student) {
      // 1. Status Filter
      if (_selectedStatusFilter != 'ALL' &&
          student.attendanceStatus.name.toUpperCase() != _selectedStatusFilter) {
        return false;
      }
      // 2. Search Query Filter
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final nameMatch = student.fullName.toLowerCase().contains(query);
        final regMatch = student.registerNumber.toLowerCase().contains(query);
        return nameMatch || regMatch;
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final attendanceAsync = ref.watch(sessionAttendanceProvider(widget.sessionId));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Attendance Roster'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: attendanceAsync.when(
        loading: () => const LoadingState(message: 'Loading attendance roster...'),
        error: (error, _) {
          String message = 'Failed to load attendance roster.';
          if (error is Failure) {
            message = error.message;
          }
          return ErrorState(
            message: message,
            onRetry: () => ref.refresh(sessionAttendanceProvider(widget.sessionId)),
          );
        },
        data: (data) => RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () async {
            ref.invalidate(sessionAttendanceProvider(widget.sessionId));
            await ref.read(sessionAttendanceProvider(widget.sessionId).future);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. Session Context Card
                _buildSessionHeaderCard(data.session),
                const SizedBox(height: 16),

                // 2. Attendance Summary Cards
                _buildSummaryGrid(data.summary),
                const SizedBox(height: 16),

                // 3. Search Bar & Status Filter Chips
                _buildSearchAndFilterControls(),
                const SizedBox(height: 16),

                // 4. Roster List Section
                _buildRosterList(data.roster),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSessionHeaderCard(SessionModel session) {
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  session.displaySubject,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              StatusBadge(status: session.displayStatus),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            session.title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.location_on_outlined, size: 14, color: AppColors.textSecondary),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  session.displayVenue,
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 12),
              const Icon(Icons.access_time_rounded, size: 14, color: AppColors.textSecondary),
              const SizedBox(width: 4),
              Text(
                session.formattedTime,
                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryGrid(AttendanceSummaryModel summary) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _buildSummaryChip('Total', summary.totalRoster, AppColors.textPrimary, const Color(0xFFF1F5F9)),
          const SizedBox(width: 10),
          _buildSummaryChip('Present', summary.presentCount, AppColors.statusPresent, const Color(0xFFDCFCE7)),
          const SizedBox(width: 10),
          _buildSummaryChip('Late', summary.lateCount, AppColors.statusLate, const Color(0xFFFEF9C3)),
          const SizedBox(width: 10),
          _buildSummaryChip('Absent', summary.absentCount, AppColors.statusAbsent, const Color(0xFFFEE2E2)),
          const SizedBox(width: 10),
          _buildSummaryChip('Excused', summary.excusedCount, const Color(0xFF6366F1), const Color(0xFFEEF2FF)),
        ],
      ),
    );
  }

  Widget _buildSummaryChip(String label, int count, Color color, Color bg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Text(
            count.toString(),
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchAndFilterControls() {
    final filters = ['ALL', 'PRESENT', 'LATE', 'ABSENT', 'EXCUSED'];

    return Column(
      children: [
        // Search Bar
        TextField(
          controller: _searchController,
          onChanged: (val) {
            setState(() {
              _searchQuery = val.trim();
            });
          },
          decoration: InputDecoration(
            hintText: 'Search by student name or register no...',
            prefixIcon: const Icon(Icons.search_rounded, color: AppColors.textSecondary),
            suffixIcon: _searchQuery.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear_rounded, color: AppColors.textSecondary),
                    onPressed: () {
                      _searchController.clear();
                      setState(() {
                        _searchQuery = '';
                      });
                    },
                  )
                : null,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
          ),
        ),
        const SizedBox(height: 10),

        // Status Filter Chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: filters.map((filter) {
              final isSelected = _selectedStatusFilter == filter;
              return Padding(
                padding: const EdgeInsets.only(right: 8.0),
                child: FilterChip(
                  label: Text(
                    filter,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isSelected ? Colors.white : AppColors.textSecondary,
                    ),
                  ),
                  selected: isSelected,
                  selectedColor: AppColors.primary,
                  backgroundColor: Colors.white,
                  checkmarkColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: BorderSide(
                      color: isSelected ? AppColors.primary : AppColors.border,
                    ),
                  ),
                  onSelected: (bool selected) {
                    setState(() {
                      _selectedStatusFilter = filter;
                    });
                  },
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildRosterList(List<AttendanceRosterStudentModel> fullRoster) {
    if (fullRoster.isEmpty) {
      return const EmptyState(
        title: 'No Students Found',
        description: 'No students enrolled in this session roster.',
      );
    }

    final filteredList = _filterRoster(fullRoster);

    if (filteredList.isEmpty) {
      return const EmptyState(
        title: 'No Matching Results',
        description: 'No students match search or filter criteria.',
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 10, left: 4),
          child: Text(
            'Roster Students (${filteredList.length} of ${fullRoster.length})',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: AppColors.textSecondary,
            ),
          ),
        ),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: filteredList.length,
          separatorBuilder: (context, index) => const SizedBox(height: 10),
          itemBuilder: (context, index) {
            final student = filteredList[index];
            return _buildStudentCard(student);
          },
        ),
      ],
    );
  }

  Widget _buildStudentCard(AttendanceRosterStudentModel student) {
    final initials = (student.firstName.isNotEmpty ? student.firstName[0] : '') +
        (student.lastName.isNotEmpty ? student.lastName[0] : '');

    return AppCard(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          // Initials Avatar
          CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.primary.withOpacity(0.12),
            child: Text(
              initials.toUpperCase(),
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
          ),
          const SizedBox(width: 12),

          // Student Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  student.fullName,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Reg: ${student.registerNumber}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
                if (student.attendanceStatus != AttendanceRosterStatus.absent) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Marked: ${student.formattedMarkedAt}',
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Attendance Status Badge
          StatusBadge(status: student.displayStatus),
        ],
      ),
    );
  }
}
