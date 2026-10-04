class ApiEndpoints {
  static const String login = '/auth/login';
  static const String me = '/auth/me';
  static const String changePassword = '/auth/change-password';
  static const String updateProfile = '/auth/profile';

  static const String registerDeviceToken = '/devices/tokens';
  static const String unregisterDeviceToken = '/devices/tokens';

  static const String mySessions = '/sessions/my';
  static String sessionDetail(String id) => '/sessions/$id';

  static const String generateQrToken = '/attendance/qr/token';
  static const String scanQrToken = '/attendance/qr/scan';
  static String sessionAttendance(String sessionId) => '/sessions/$sessionId/attendance';
  static const String myAttendance = '/attendance/my';

  static const String notifications = '/notifications';
  static const String unreadCount = '/notifications/unread-count';
  static String markRead(String id) => '/notifications/$id/read';
  static const String markAllRead = '/notifications/read-all';
}
