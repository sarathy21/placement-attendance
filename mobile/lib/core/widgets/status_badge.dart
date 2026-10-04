import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  final String? labelOverride;
  final IconData? icon;
  final bool isCompact;

  const StatusBadge({
    super.key,
    required this.status,
    this.labelOverride,
    this.icon,
    this.isCompact = false,
  });

  @override
  Widget build(BuildContext context) {
    final normalized = status.toUpperCase().replaceAll(' ', '_');
    final style = _getBadgeStyle(normalized);

    final displayLabel = labelOverride ?? _formatLabel(normalized);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isCompact ? 8 : 10,
        vertical: isCompact ? 3 : 5,
      ),
      decoration: BoxDecoration(
        color: style.backgroundColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: style.borderColor, width: 1.0),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (icon != null) ...[
            Icon(icon, size: isCompact ? 12 : 14, color: style.textColor),
            const SizedBox(width: 4),
          ] else ...[
            Container(
              width: isCompact ? 6 : 8,
              height: isCompact ? 6 : 8,
              decoration: BoxDecoration(
                color: style.textColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
          ],
          Text(
            displayLabel,
            style: TextStyle(
              fontSize: isCompact ? 11 : 12,
              fontWeight: FontWeight.w600,
              color: style.textColor,
              height: 1.1,
            ),
          ),
        ],
      ),
    );
  }

  String _formatLabel(String status) {
    switch (status) {
      case 'UPCOMING':
        return 'Upcoming';
      case 'ONGOING':
        return 'Ongoing';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      case 'SCHEDULED':
        return 'Scheduled';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'PRESENT':
        return 'Present';
      case 'LATE':
        return 'Late';
      case 'ABSENT':
        return 'Absent';
      case 'EXCUSED':
        return 'Excused';
      case 'REQUIRED':
      case 'ATTENDANCE_REQUIRED':
        return 'Attendance Required';
      case 'NOT_REQUIRED':
      case 'ATTENDANCE_NOT_REQUIRED':
        return 'Attendance Optional';
      default:
        return status.replaceAll('_', ' ');
    }
  }

  _BadgeStyle _getBadgeStyle(String status) {
    switch (status) {
      case 'UPCOMING':
      case 'SCHEDULED':
        return const _BadgeStyle(
          backgroundColor: Color(0xFFEFF6FF), // Blue 50
          borderColor: Color(0xFFBFDBFE), // Blue 200
          textColor: Color(0xFF1D4ED8), // Blue 700
        );
      case 'ONGOING':
      case 'IN_PROGRESS':
        return const _BadgeStyle(
          backgroundColor: Color(0xFFFEF3C7), // Amber 100
          borderColor: Color(0xFFFDE68A), // Amber 200
          textColor: Color(0xFFB45309), // Amber 700
        );
      case 'COMPLETED':
      case 'PRESENT':
      case 'SUCCESS':
        return const _BadgeStyle(
          backgroundColor: Color(0xFFECFDF5), // Emerald 50
          borderColor: Color(0xFFA7F3D0), // Emerald 200
          textColor: AppColors.primary, // Emerald 700
        );
      case 'CANCELLED':
      case 'ABSENT':
      case 'ERROR':
        return const _BadgeStyle(
          backgroundColor: Color(0xFFFEF2F2), // Red 50
          borderColor: Color(0xFFFECACA), // Red 200
          textColor: AppColors.error, // Red 700
        );
      case 'LATE':
        return const _BadgeStyle(
          backgroundColor: Color(0xFFFFFBEB), // Yellow 50
          borderColor: Color(0xFFFDE68A), // Yellow 200
          textColor: AppColors.warning, // Yellow 700
        );
      case 'EXCUSED':
        return const _BadgeStyle(
          backgroundColor: Color(0xFFEEF2FF), // Indigo 50
          borderColor: Color(0xFFC7D2FE), // Indigo 200
          textColor: AppColors.info, // Indigo 700
        );
      case 'REQUIRED':
      case 'ATTENDANCE_REQUIRED':
        return const _BadgeStyle(
          backgroundColor: Color(0xFFECFDF5),
          borderColor: Color(0xFFA7F3D0),
          textColor: AppColors.primary,
        );
      case 'NOT_REQUIRED':
      case 'ATTENDANCE_NOT_REQUIRED':
        return const _BadgeStyle(
          backgroundColor: Color(0xFFF1F5F9), // Slate 100
          borderColor: Color(0xFFCBD5E1), // Slate 300
          textColor: AppColors.textSecondary,
        );
      default:
        return const _BadgeStyle(
          backgroundColor: Color(0xFFF1F5F9),
          borderColor: Color(0xFFCBD5E1),
          textColor: AppColors.textSecondary,
        );
    }
  }
}

class _BadgeStyle {
  final Color backgroundColor;
  final Color borderColor;
  final Color textColor;

  const _BadgeStyle({
    required this.backgroundColor,
    required this.borderColor,
    required this.textColor,
  });
}
