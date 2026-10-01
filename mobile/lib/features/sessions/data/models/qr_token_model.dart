class QrTokenModel {
  final String rawToken;
  final DateTime expiresAt;
  final int ttlSeconds;

  const QrTokenModel({
    required this.rawToken,
    required this.expiresAt,
    required this.ttlSeconds,
  });

  factory QrTokenModel.fromJson(Map<String, dynamic> json) {
    return QrTokenModel(
      rawToken: json['rawToken'] ?? '',
      expiresAt: DateTime.tryParse(json['expiresAt'] ?? '') ?? DateTime.now().add(const Duration(seconds: 300)),
      ttlSeconds: json['ttlSeconds'] ?? 300,
    );
  }

  bool get isExpired => DateTime.now().isAfter(expiresAt);
}
