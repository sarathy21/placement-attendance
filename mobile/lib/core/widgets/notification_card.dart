import 'package:flutter/material.dart';
import '../constants/app_colors.dart';
import 'app_card.dart';

class NotificationCard extends StatelessWidget {
  final String title;
  final String message;
  final String timestamp;
  final bool isRead;
  final String? type;
  final VoidCallback? onTap;

  const NotificationCard({
    super.key,
    required this.title,
    required this.message,
    required this.timestamp,
    required this.isRead,
    this.type,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final typeIcon = _getTypeIcon(type);

    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.all(16.0),
      margin: const EdgeInsets.only(bottom: 10.0),
      backgroundColor: isRead ? AppColors.surface : const Color(0xFFF0FDF4), // Emerald 50 tint for unread
      borderColor: isRead ? AppColors.border : AppColors.primary.withValues(alpha: 0.3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isRead ? AppColors.surfaceVariant : AppColors.primaryLight,
              shape: BoxShape.circle,
            ),
            child: Icon(
              typeIcon,
              size: 20,
              color: isRead ? AppColors.textSecondary : AppColors.primaryDark,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: isRead ? FontWeight.w600 : FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    if (!isRead)
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  message,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  timestamp,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  IconData _getTypeIcon(String? type) {
    if (type == null) return Icons.notifications_outlined;
    final normalized = type.toUpperCase();
    if (normalized.contains('SCHEDULED') || normalized.contains('SESSION_CREATED')) {
      return Icons.event_available_outlined;
    } else if (normalized.contains('UPDATED') || normalized.contains('CHANGED')) {
      return Icons.edit_calendar_outlined;
    } else if (normalized.contains('CANCELLED')) {
      return Icons.event_busy_outlined;
    } else if (normalized.contains('ATTENDANCE') || normalized.contains('RECORDED')) {
      return Icons.fact_check_outlined;
    } else if (normalized.contains('DRIVE')) {
      return Icons.business_center_outlined;
    }
    return Icons.notifications_outlined;
  }
}
