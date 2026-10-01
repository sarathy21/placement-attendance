import 'package:flutter/material.dart';

class AppColors {
  // KAHE Brand Palette: Emerald Green Accent on White
  static const Color primary = Color(0xFF059669); // Emerald 600
  static const Color primaryDark = Color(0xFF047857); // Emerald 700
  static const Color primaryLight = Color(0xFFD1FAE5); // Emerald 100
  static const Color secondary = Color(0xFF10B981); // Emerald 500
  static const Color accent = Color(0xFF34D399); // Emerald 400

  // Neutral Surfaces & Backgrounds
  static const Color background = Color(0xFFFFFFFF); // Pure White
  static const Color surface = Color(0xFFFFFFFF); // Surface Card White
  static const Color surfaceVariant = Color(0xFFF8FAFC); // Slate 50
  static const Color border = Color(0xFFE2E8F0); // Slate 200
  static const Color cardBorder = Color(0xFFE2E8F0); // Alias for backward compatibility

  // Typography Tokens
  static const Color textPrimary = Color(0xFF0F172A); // Slate 900
  static const Color textSecondary = Color(0xFF475569); // Slate 600
  static const Color textMuted = Color(0xFF94A3B8); // Slate 400

  // Semantic Status Tokens
  static const Color success = Color(0xFF059669); // Green
  static const Color warning = Color(0xFFD97706); // Amber
  static const Color error = Color(0xFFDC2626); // Red
  static const Color info = Color(0xFF2563EB); // Blue

  // Attendance & Drive Status Aliases
  static const Color statusPresent = Color(0xFF059669);
  static const Color statusLate = Color(0xFFD97706);
  static const Color statusAbsent = Color(0xFFDC2626);
  static const Color statusExcused = Color(0xFF2563EB);

  // Dark Fallbacks (Retained for system compatibility)
  static const Color darkBackground = Color(0xFF0F172A);
  static const Color darkSurface = Color(0xFF1E293B);
  static const Color darkCardBorder = Color(0xFF334155);
}
