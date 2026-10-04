class PlacementBatchModel {
  final String id;
  final String name;
  final int? startYear;
  final int? endYear;
  final String? description;
  final int studentCount;
  final int sessionCount;
  final DateTime? createdAt;

  const PlacementBatchModel({
    required this.id,
    required this.name,
    this.startYear,
    this.endYear,
    this.description,
    this.studentCount = 0,
    this.sessionCount = 0,
    this.createdAt,
  });

  factory PlacementBatchModel.fromJson(Map<String, dynamic> json) {
    final count = json['_count'] as Map<String, dynamic>?;
    return PlacementBatchModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      startYear: json['startYear'],
      endYear: json['endYear'],
      description: json['description'],
      studentCount: count?['students'] ?? json['studentCount'] ?? 0,
      sessionCount: count?['classSessions'] ?? json['sessionCount'] ?? 0,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
    );
  }
}

class PlacementStudentModel {
  final String id;
  final String registerNumber;
  final String firstName;
  final String? lastName;
  final String collegeEmail;
  final String? departmentCode;
  final String? placementBatchId;
  final String? placementBatchName;

  const PlacementStudentModel({
    required this.id,
    required this.registerNumber,
    required this.firstName,
    this.lastName,
    required this.collegeEmail,
    this.departmentCode,
    this.placementBatchId,
    this.placementBatchName,
  });

  String get fullName => lastName != null && lastName!.isNotEmpty ? '$firstName $lastName' : firstName;

  factory PlacementStudentModel.fromJson(Map<String, dynamic> json) {
    return PlacementStudentModel(
      id: json['id'] ?? '',
      registerNumber: json['registerNumber'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'],
      collegeEmail: json['collegeEmail'] ?? '',
      departmentCode: json['department']?['code'],
      placementBatchId: json['placementBatchId'],
      placementBatchName: json['placementBatch']?['name'],
    );
  }
}
