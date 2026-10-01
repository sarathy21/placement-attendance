import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import 'app_card.dart';
import 'status_badge.dart';

class SessionCard extends StatelessWidget {
  final String title;
  final String date;
  final String timeRange;
  final String venue;
  final String? staffName;
  final String status;
  final String? attendanceStatus;
  final VoidCallback? onTap;
  final VoidCallback? onShowQrTap;

  const SessionCard({
    super.key,
    required this.title,
    required this.date,
    required this.timeRange,
    required this.venue,
    this.staffName,
    required this.status,
    this.attendanceStatus,
    this.onTap,
    this.onShowQrTap,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.all(16.0),
      margin: const EdgeInsets.only(bottom: 12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              StatusBadge(status: status, isCompact: true),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.access_time_outlined, size: 16, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                '$date  •  $timeRange',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.location_on_outlined, size: 16, color: AppColors.textSecondary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  venue,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          if (staffName != null && staffName!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.person_outline, size: 16, color: AppColors.textSecondary),
                const SizedBox(width: 8),
                Text(
                  staffName!,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ],
          if (attendanceStatus != null || onShowQrTap != null) ...[
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (attendanceStatus != null)
                  StatusBadge(status: attendanceStatus!, isCompact: true)
                else
                  const SizedBox.shrink(),
                if (onShowQrTap != null)
                  ElevatedButton.icon(
                    onPressed: onShowQrTap,
                    icon: const Icon(Icons.qr_code_2_rounded, size: 16),
                    label: const Text('Show QR'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
