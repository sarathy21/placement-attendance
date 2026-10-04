class SubjectReferenceModel {
  final String id;
  final String code;
  final String title;

  const SubjectReferenceModel({
    required this.id,
    required this.code,
    required this.title,
  });

  String get displayTitle => '$code - $title';

  factory SubjectReferenceModel.fromJson(Map<String, dynamic> json) {
    return SubjectReferenceModel(
      id: json['id'] ?? '',
      code: json['code'] ?? '',
      title: json['title'] ?? '',
    );
  }
}

class VenueReferenceModel {
  final String id;
  final String name;
  final String? building;
  final int? capacity;

  const VenueReferenceModel({
    required this.id,
    required this.name,
    this.building,
    this.capacity,
  });

  String get displayName {
    if (building != null && building!.isNotEmpty) {
      return '$name ($building)';
    }
    return name;
  }

  factory VenueReferenceModel.fromJson(Map<String, dynamic> json) {
    return VenueReferenceModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      building: json['building'],
      capacity: json['capacity'] is int ? json['capacity'] : null,
    );
  }
}

class DepartmentReferenceModel {
  final String id;
  final String code;
  final String name;

  const DepartmentReferenceModel({
    required this.id,
    required this.code,
    required this.name,
  });

  String get displayName => '$code - $name';

  factory DepartmentReferenceModel.fromJson(Map<String, dynamic> json) {
    return DepartmentReferenceModel(
      id: json['id'] ?? '',
      code: json['code'] ?? '',
      name: json['name'] ?? '',
    );
  }
}
