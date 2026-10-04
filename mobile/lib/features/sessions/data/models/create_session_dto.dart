class CreateSessionDto {
  final String title;
  final String subjectId;
  final String venueId;
  final String? staffId;
  final String? departmentId;
  final String? courseId;
  final String? placementBatchId;
  final String sessionDate;
  final String startTime;
  final String endTime;

  const CreateSessionDto({
    required this.title,
    required this.subjectId,
    required this.venueId,
    this.staffId,
    this.departmentId,
    this.courseId,
    this.placementBatchId,
    required this.sessionDate,
    required this.startTime,
    required this.endTime,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'title': title,
      'subjectId': subjectId,
      'venueId': venueId,
      'sessionDate': sessionDate,
      'startTime': startTime,
      'endTime': endTime,
    };
    if (staffId != null && staffId!.isNotEmpty) map['staffId'] = staffId;
    if (departmentId != null && departmentId!.isNotEmpty) map['departmentId'] = departmentId;
    if (courseId != null && courseId!.isNotEmpty) map['courseId'] = courseId;
    if (placementBatchId != null && placementBatchId!.isNotEmpty) map['placementBatchId'] = placementBatchId;
    return map;
  }
}
