import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/errors/failures.dart';
import '../../../core/widgets/widgets.dart';
import '../../auth/domain/auth_state.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/models/my_attendance_model.dart';
import '../data/models/session_model.dart';
import 'providers/sessions_provider.dart';
import 'qr_attendance_modal.dart';
import 'staff_attendance_roster_screen.dart';
import 'staff_qr_scanner_screen.dart';

class SessionDetailScreen extends ConsumerWidget {
  final String sessionId;

  const SessionDetailScreen({super.key, required this.sessionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider);
    final user = authState is Authenticated ? authState.user : null;
    final isStaff = user != null &&
        (user.role == UserRole.staff ||
         user.role == UserRole.admin ||
         user.role == UserRole.superAdmin);

    final sessionAsync = ref.watch(sessionDetailProvider(sessionId));
    final attendanceHistoryAsync = ref.watch(myAttendanceListProvider);
    final lifecycleState = ref.watch(sessionLifecycleNotifierProvider);
    final isMutating = lifecycleState.isLoading;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Session Details'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: sessionAsync.when(
        loading: () => const LoadingState(message: 'Loading session details...'),
        error: (err, stack) => ErrorState(
          message: err is Failure ? err.message : 'Failed to load session details',
          onRetry: () => ref.refresh(sessionDetailProvider(sessionId)),
        ),
        data: (session) {
          final MyAttendanceModel? myAttendance = attendanceHistoryAsync.maybeWhen(
            data: (records) {
              final match = records.where((r) => r.sessionId == session.id).toList();
              return match.isNotEmpty ? match.first : null;
            },
            orElse: () => null,
          );

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(sessionDetailProvider(sessionId));
              ref.invalidate(myAttendanceListProvider);
            },
            color: AppColors.primary,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(18.0),
              child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Session Header Card
                AppCard(
                  padding: const EdgeInsets.all(20),
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
                                fontSize: 13,
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
                      const SizedBox(height: 10),
                      Text(
                        session.title,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                          height: 1.2,
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Attendance Recorded Banner (if recorded)
                      if (myAttendance != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFD1FAE5),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.primary),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.check_circle_rounded, color: AppColors.primaryDark, size: 24),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Attendance Marked: ${myAttendance.attendanceStatus}',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.primaryDark,
                                      ),
                                    ),
                                    Text(
                                      'Marked at ${myAttendance.formattedMarkedAt} via ${myAttendance.method}',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: Color(0xFF047857),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      const Divider(),
                      const SizedBox(height: 12),

                      // Info Rows
                      _buildInfoRow(
                        icon: Icons.calendar_today_rounded,
                        label: 'Date',
                        value: session.formattedDate,
                      ),
                      const SizedBox(height: 12),
                      _buildInfoRow(
                        icon: Icons.access_time_rounded,
                        label: 'Time',
                        value: session.formattedTime,
                      ),
                      const SizedBox(height: 12),
                      _buildInfoRow(
                        icon: Icons.location_on_outlined,
                        label: 'Venue',
                        value: session.displayVenue,
                      ),
                      const SizedBox(height: 12),
                      _buildInfoRow(
                        icon: Icons.person_outline_rounded,
                        label: 'Conducting Staff',
                        value: session.displayStaff,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Attendance Status Section (for Student & general view)
                const SectionHeader(title: 'Attendance Status'),
                const SizedBox(height: 8),

                if (myAttendance != null) ...[
                  AppCard(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        StatusBadge(status: myAttendance.attendanceStatus),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Text(
                            'Your attendance for this session has already been recorded by staff.',
                            style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                          ),
                        ),
                      ],
                    ),
                  ),
                ] else if (session.status == SessionLifecycleStatus.inProgress) ...[
                  AppCard(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.qr_code_2_rounded, size: 24, color: AppColors.primary),
                            SizedBox(width: 10),
                            Text(
                              'Attendance Open',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'This placement session is currently in progress. Tap below to present your personal attendance QR to the conducting staff member.',
                          style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                        ),
                        if (!isStaff) ...[
                          const SizedBox(height: 16),
                          PrimaryButton(
                            text: 'Show Attendance QR',
                            icon: Icons.qr_code_rounded,
                            onPressed: () {
                              QrAttendanceModal.show(
                                context,
                                sessionId: session.id,
                                sessionTitle: session.title,
                              );
                            },
                          ),
                        ],
                      ],
                    ),
                  ),
                ] else if (session.status == SessionLifecycleStatus.scheduled) ...[
                  AppCard(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline_rounded, color: AppColors.secondary, size: 22),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            isStaff
                                ? 'Attendance operations will open when you start this session.'
                                : 'Attendance QR will become available when conducting staff starts this session.',
                            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                          ),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  AppCard(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Icon(
                          session.status == SessionLifecycleStatus.completed
                              ? Icons.check_circle_outline
                              : Icons.cancel_outlined,
                          color: AppColors.textMuted,
                          size: 22,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'This session is ${session.displayStatus.toUpperCase()}. Attendance registration is closed.',
                            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // Staff Session Lifecycle Management Block
                if (isStaff) ...[
                  const SizedBox(height: 24),
                  const SectionHeader(title: 'Session Management'),
                  const SizedBox(height: 8),

                  if (session.status == SessionLifecycleStatus.scheduled) ...[
                    AppCard(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Session Lifecycle Actions',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Start this session to open attendance recording, or cancel if scheduling changes occur.',
                            style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: PrimaryButton(
                                  text: 'Start Session',
                                  icon: Icons.play_arrow_rounded,
                                  isLoading: isMutating,
                                  onPressed: isMutating ? null : () => _confirmStartSession(context, ref, session.id),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: OutlinedButton.icon(
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.statusAbsent,
                                    side: const BorderSide(color: AppColors.statusAbsent),
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                  icon: const Icon(Icons.cancel_outlined, size: 18),
                                  label: const Text('Cancel Session', style: TextStyle(fontWeight: FontWeight.bold)),
                                  onPressed: isMutating ? null : () => _confirmCancelSession(context, ref, session.id),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ] else if (session.status == SessionLifecycleStatus.inProgress) ...[
                    AppCard(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Session Lifecycle Actions',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Session is active. Complete when all student attendance is recorded, or cancel if needed.',
                            style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 16),
                          PrimaryButton(
                            text: 'Scan Attendance QR',
                            icon: Icons.qr_code_scanner_rounded,
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => StaffQrScannerScreen(
                                    sessionId: session.id,
                                    session: session,
                                  ),
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 10),
                          OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.primary,
                              side: const BorderSide(color: AppColors.primary),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            icon: const Icon(Icons.assignment_turned_in_rounded, size: 18),
                            label: const Text('View Attendance Roster', style: TextStyle(fontWeight: FontWeight.bold)),
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => StaffAttendanceRosterScreen(sessionId: session.id),
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.primary,
                                    side: const BorderSide(color: AppColors.primary),
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                  icon: const Icon(Icons.check_circle_outline_rounded, size: 18),
                                  label: const Text('Complete Session', style: TextStyle(fontWeight: FontWeight.bold)),
                                  onPressed: isMutating ? null : () => _confirmCompleteSession(context, ref, session.id),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: OutlinedButton.icon(
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.statusAbsent,
                                    side: const BorderSide(color: AppColors.statusAbsent),
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  ),
                                  icon: const Icon(Icons.cancel_outlined, size: 18),
                                  label: const Text('Cancel Session', style: TextStyle(fontWeight: FontWeight.bold)),
                                  onPressed: isMutating ? null : () => _confirmCancelSession(context, ref, session.id),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ] else if (session.status == SessionLifecycleStatus.completed) ...[
                    AppCard(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 24),
                              SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'This session has been marked as COMPLETED.',
                                  style: TextStyle(fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          PrimaryButton(
                            text: 'View Attendance Roster',
                            icon: Icons.assignment_turned_in_rounded,
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => StaffAttendanceRosterScreen(sessionId: session.id),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ] else if (session.status == SessionLifecycleStatus.cancelled) ...[
                    AppCard(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          const Icon(Icons.cancel_rounded, color: AppColors.statusAbsent, size: 24),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Text(
                              'This session has been CANCELLED. No further lifecycle actions can be performed.',
                              style: TextStyle(fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ],
            ),
          ),
        );
      },
    ),
  );
}

  Future<void> _confirmStartSession(BuildContext context, WidgetRef ref, String sessionId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Start Session?'),
        content: const Text(
          'The session will become active and attendance can be recorded.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Start Session'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      _executeMutation(
        context,
        ref,
        () => ref.read(sessionLifecycleNotifierProvider.notifier).updateStatus(sessionId, 'IN_PROGRESS'),
        'Session started successfully',
      );
    }
  }

  Future<void> _confirmCompleteSession(BuildContext context, WidgetRef ref, String sessionId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Complete Session?'),
        content: const Text(
          'The session will be marked completed and active attendance operations will stop.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Keep Session'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Complete Session'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      _executeMutation(
        context,
        ref,
        () => ref.read(sessionLifecycleNotifierProvider.notifier).updateStatus(sessionId, 'COMPLETED'),
        'Session marked as completed',
      );
    }
  }

  Future<void> _confirmCancelSession(BuildContext context, WidgetRef ref, String sessionId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Session?'),
        content: const Text(
          'Cancelling preserves the session record but prevents it from proceeding normally.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Keep Session'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: AppColors.statusAbsent),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Cancel Session'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      _executeMutation(
        context,
        ref,
        () => ref.read(sessionLifecycleNotifierProvider.notifier).cancelSession(sessionId),
        'Session cancelled successfully',
      );
    }
  }

  Future<void> _executeMutation(
    BuildContext context,
    WidgetRef ref,
    Future<SessionModel?> Function() action,
    String successMsg,
  ) async {
    try {
      final result = await action();
      if (result != null && context.mounted) {
        ref.invalidate(sessionDetailProvider(sessionId));
        ref.invalidate(studentSessionsListProvider(null));
        ref.invalidate(staffSessionsListProvider(null));
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(successMsg),
            backgroundColor: AppColors.primary,
          ),
        );
      }
    } catch (e) {
      if (!context.mounted) return;
      String errorMsg = 'Failed to update session lifecycle state';
      if (e is Failure) {
        errorMsg = e.message;
      } else {
        errorMsg = e.toString().replaceAll('Exception: ', '');
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMsg),
          backgroundColor: AppColors.statusAbsent,
        ),
      );
    }
  }

  Widget _buildInfoRow({required IconData icon, required String label, required String value}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppColors.textSecondary),
        const SizedBox(width: 10),
        SizedBox(
          width: 110,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
        ),
      ],
    );
  }
}
