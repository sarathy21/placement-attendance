enum DriveStatus { upcoming, ongoing, completed, cancelled }

class PlacementDriveRoundModel {
  final String id;
  final String driveId;
  final String roundName;
  final int roundOrder;
  final DateTime? date;
  final String? venue;
  final String? description;
  final String? sessionId;
  final Map<String, dynamic>? session;

  const PlacementDriveRoundModel({
    required this.id,
    required this.driveId,
    required this.roundName,
    required this.roundOrder,
    this.date,
    this.venue,
    this.description,
    this.sessionId,
    this.session,
  });

  factory PlacementDriveRoundModel.fromJson(Map<String, dynamic> json) {
    return PlacementDriveRoundModel(
      id: json['id'] ?? '',
      driveId: json['driveId'] ?? '',
      roundName: json['roundName'] ?? '',
      roundOrder: json['roundOrder'] ?? 1,
      date: json['date'] != null ? DateTime.tryParse(json['date']) : null,
      venue: json['venue'],
      description: json['description'],
      sessionId: json['sessionId'],
      session: json['session'] is Map<String, dynamic> ? json['session'] : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'roundName': roundName,
        'roundOrder': roundOrder,
        if (date != null) 'date': date!.toIso8601String(),
        if (venue != null) 'venue': venue,
        if (description != null) 'description': description,
        if (sessionId != null) 'sessionId': sessionId,
      };
}

class PlacementDriveModel {
  final String id;
  final String companyName;
  final DateTime driveDate;
  final String venue;
  final String? description;
  final DriveStatus status;
  final bool attendanceEnabled;
  final String createdById;
  final Map<String, dynamic>? createdBy;
  final List<PlacementDriveRoundModel> rounds;

  const PlacementDriveModel({
    required this.id,
    required this.companyName,
    required this.driveDate,
    required this.venue,
    this.description,
    required this.status,
    required this.attendanceEnabled,
    required this.createdById,
    this.createdBy,
    required this.rounds,
  });

  factory PlacementDriveModel.fromJson(Map<String, dynamic> json) {
    DriveStatus parsedStatus = DriveStatus.upcoming;
    final statusStr = json['status']?.toString().toUpperCase();
    if (statusStr == 'ONGOING') parsedStatus = DriveStatus.ongoing;
    if (statusStr == 'COMPLETED') parsedStatus = DriveStatus.completed;
    if (statusStr == 'CANCELLED') parsedStatus = DriveStatus.cancelled;

    final roundsList = (json['rounds'] as List<dynamic>?)
            ?.map((r) => PlacementDriveRoundModel.fromJson(r as Map<String, dynamic>))
            .toList() ??
        [];

    return PlacementDriveModel(
      id: json['id'] ?? '',
      companyName: json['companyName'] ?? '',
      driveDate: DateTime.tryParse(json['driveDate']) ?? DateTime.now(),
      venue: json['venue'] ?? '',
      description: json['description'],
      status: parsedStatus,
      attendanceEnabled: json['attendanceEnabled'] ?? false,
      createdById: json['createdById'] ?? '',
      createdBy: json['createdBy'] is Map<String, dynamic> ? json['createdBy'] : null,
      rounds: roundsList,
    );
  }
}
