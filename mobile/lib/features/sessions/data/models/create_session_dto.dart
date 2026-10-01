class CreateSessionDto {
  final String title;
  final String subjectId;
  final String venueId;
  final String? staffId;
  final String departmentId;
  final String? courseId;
  final String? batchId;
  final String sessionDate;
  final String startTime;
  final String endTime;

  const CreateSessionDto({
    required this.title,
    required this.subjectId,
    required this.venueId,
    this.staffId,
    required this.departmentId,
    this.courseId,
    this.batchId,
    required this.sessionDate,
    required this.startTime,
    required this.endTime,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'title': title,
      'subjectId': subjectId,
      'venueId': venueId,
      'departmentId': departmentId,
      'sessionDate': sessionDate,
      'startTime': startTime,
      'endTime': endTime,
    };
    if (staffId != null && staffId!.isNotEmpty) map['staffId'] = staffId;
    if (courseId != null && courseId!.isNotEmpty) map['courseId'] = courseId;
    if (batchId != null && batchId!.isNotEmpty) map['batchId'] = batchId;
    return map;
  }
}
