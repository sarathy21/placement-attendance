import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../auth/domain/auth_state.dart';
import '../../auth/providers/auth_provider.dart';
import '../domain/placement_drive_model.dart';
import '../providers/placement_drives_provider.dart';

class DriveDetailScreen extends ConsumerStatefulWidget {
  final String driveId;

  const DriveDetailScreen({super.key, required this.driveId});

  @override
  ConsumerState<DriveDetailScreen> createState() => _DriveDetailScreenState();
}

class _DriveDetailScreenState extends ConsumerState<DriveDetailScreen> {
  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);
    final isStaff = authState is Authenticated &&
        (authState.user.role == UserRole.staff ||
            authState.user.role == UserRole.admin ||
            authState.user.role == UserRole.superAdmin);

    final driveAsync = ref.watch(placementDriveDetailProvider(widget.driveId));

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Drive Details'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: driveAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (err, stack) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: AppColors.statusAbsent),
                const SizedBox(height: 16),
                Text('Failed to load drive details: $err', textAlign: TextAlign.center),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.invalidate(placementDriveDetailProvider(widget.driveId)),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (drive) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              drive.companyName,
                              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                            ),
                          ),
                          _buildStatusBadge(drive.status),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Icon(Icons.calendar_month, size: 18, color: AppColors.textSecondary),
                          const SizedBox(width: 8),
                          Text(
                            drive.driveDate.toIso8601String().split('T')[0],
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined, size: 18, color: AppColors.textSecondary),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              drive.venue,
                              style: const TextStyle(fontSize: 15, color: AppColors.textPrimary),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Attendance Enabled Indicator Banner
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: drive.attendanceEnabled ? const Color(0xFFD1FAE5) : const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              drive.attendanceEnabled ? Icons.check_circle : Icons.info_outline,
                              color: drive.attendanceEnabled ? const Color(0xFF10B981) : const Color(0xFF64748B),
                              size: 20,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                drive.attendanceEnabled
                                    ? 'Attendance Tracking Enabled'
                                    : 'Attendance Not Required for this Drive',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: drive.attendanceEnabled ? const Color(0xFF065F46) : const Color(0xFF334155),
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Description
                if (drive.description != null && drive.description!.isNotEmpty) ...[
                  const Text('Overview & Instructions', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(
                    drive.description!,
                    style: const TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.4),
                  ),
                  const SizedBox(height: 24),
                ],

                // Recruitment Rounds Section
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Recruitment Rounds (${drive.rounds.length})',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    if (isStaff && drive.status != DriveStatus.cancelled)
                      IconButton(
                        icon: const Icon(Icons.add_circle_outline, color: AppColors.primary),
                        onPressed: () => _showAddRoundDialog(context, drive.id),
                        tooltip: 'Add Round',
                      ),
                  ],
                ),
                const SizedBox(height: 8),

                if (drive.rounds.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(24.0),
                    child: Center(
                      child: Text('No rounds specified yet.', style: TextStyle(color: AppColors.textSecondary)),
                    ),
                  )
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: drive.rounds.length,
                    itemBuilder: (context, index) {
                      final round = drive.rounds[index];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        elevation: 1,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                          side: BorderSide(color: Colors.grey.shade200),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    radius: 14,
                                    backgroundColor: AppColors.primary,
                                    child: Text(
                                      '${round.roundOrder}',
                                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      round.roundName,
                                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                  if (isStaff && drive.status != DriveStatus.cancelled)
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline, color: AppColors.statusAbsent, size: 20),
                                      onPressed: () => _confirmDeleteRound(context, drive.id, round.id),
                                    ),
                                ],
                              ),
                              if (round.venue != null || round.description != null) const SizedBox(height: 8),
                              if (round.venue != null)
                                Text('Venue: ${round.venue}', style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                              if (round.description != null)
                                Text(round.description!, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                              if (round.session != null) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.blue.shade50,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.qr_code_2, size: 18, color: Colors.blue),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          'Attendance Session: ${round.session!['title'] ?? 'Linked'}',
                                          style: const TextStyle(fontSize: 13, color: Colors.blue, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  ),

                // Staff Action Buttons
                if (isStaff && drive.status != DriveStatus.cancelled) ...[
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _cancelDrive(context, drive.id),
                          icon: const Icon(Icons.cancel_outlined, color: AppColors.statusAbsent),
                          label: const Text('CANCEL DRIVE', style: TextStyle(color: AppColors.statusAbsent)),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatusBadge(DriveStatus status) {
    Color color;
    switch (status) {
      case DriveStatus.upcoming:
        color = AppColors.secondary;
        break;
      case DriveStatus.ongoing:
        color = AppColors.primary;
        break;
      case DriveStatus.completed:
        color = AppColors.statusPresent;
        break;
      case DriveStatus.cancelled:
        color = AppColors.statusAbsent;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color),
      ),
      child: Text(
        status.name.toUpperCase(),
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold),
      ),
    );
  }

  void _showAddRoundDialog(BuildContext context, String driveId) {
    final nameCtrl = TextEditingController();
    final orderCtrl = TextEditingController(text: '1');
    final venueCtrl = TextEditingController();
    final descCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Recruitment Round'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Round Name (e.g. Technical Interview)')),
            const SizedBox(height: 8),
            TextField(controller: orderCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Round Order (e.g. 1)')),
            const SizedBox(height: 8),
            TextField(controller: venueCtrl, decoration: const InputDecoration(labelText: 'Venue (Optional)')),
            const SizedBox(height: 8),
            TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description (Optional)')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              if (nameCtrl.text.isNotEmpty) {
                final order = int.tryParse(orderCtrl.text) ?? 1;
                final repo = ref.read(placementDrivesRepositoryProvider);
                await repo.addRound(
                  driveId,
                  roundName: nameCtrl.text.trim(),
                  roundOrder: order,
                  venue: venueCtrl.text.trim().isNotEmpty ? venueCtrl.text.trim() : null,
                  description: descCtrl.text.trim().isNotEmpty ? descCtrl.text.trim() : null,
                );
                if (mounted) {
                  Navigator.pop(context);
                  ref.invalidate(placementDriveDetailProvider(driveId));
                }
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _confirmDeleteRound(BuildContext context, String driveId, String roundId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Round'),
        content: const Text('Are you sure you want to remove this round?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.statusAbsent),
            onPressed: () async {
              final repo = ref.read(placementDrivesRepositoryProvider);
              await repo.deleteRound(driveId, roundId);
              if (mounted) {
                Navigator.pop(context);
                ref.invalidate(placementDriveDetailProvider(driveId));
              }
            },
            child: const Text('Remove'),
          ),
        ],
      ),
    );
  }

  void _cancelDrive(BuildContext context, String driveId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Drive'),
        content: const Text('Are you sure you want to cancel this placement drive?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Back')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.statusAbsent),
            onPressed: () async {
              final repo = ref.read(placementDrivesRepositoryProvider);
              await repo.updateDriveStatus(driveId, 'CANCELLED');
              if (mounted) {
                Navigator.pop(context);
                ref.invalidate(placementDriveDetailProvider(driveId));
                ref.invalidate(placementDrivesListProvider(null));
              }
            },
            child: const Text('Confirm Cancel'),
          ),
        ],
      ),
    );
  }
}
