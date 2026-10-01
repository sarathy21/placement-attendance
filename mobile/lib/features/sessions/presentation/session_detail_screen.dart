import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/widgets.dart';
import '../data/models/my_attendance_model.dart';
import '../data/models/session_model.dart';
import 'providers/sessions_provider.dart';
import 'qr_attendance_modal.dart';

class SessionDetailScreen extends ConsumerWidget {
  final String sessionId;

  const SessionDetailScreen({super.key, required this.sessionId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionAsync = ref.watch(sessionDetailProvider(sessionId));
    final attendanceHistoryAsync = ref.watch(myAttendanceListProvider);

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
          message: 'Failed to load session details',
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

          return SingleChildScrollView(
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
                          StatusBadge(status: session.status.name.toUpperCase()),
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

                // Attendance Action / Information Section
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
                    ),
                  ),
                ] else if (session.status == SessionLifecycleStatus.scheduled) ...[
                  const AppCard(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline_rounded, color: AppColors.secondary, size: 22),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Attendance QR will become available when conducting staff starts this session.',
                            style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
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
                            'This session is ${session.status.name.toUpperCase()}. Attendance registration is closed.',
                            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
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
