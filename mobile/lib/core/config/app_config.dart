class AppConfig {
  static const String appName = 'Kahe Placement Attendance';
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000', // Default Android emulator localhost
  );

  static const int connectTimeoutMs = 10000;
  static const int receiveTimeoutMs = 10000;
  static const int sendTimeoutMs = 10000;
}
