class MyAttendanceModel {
  final String id;
  final String sessionId;
  final String sessionTitle;
  final String subjectCode;
  final String subjectTitle;
  final String venueName;
  final String conductingStaffName;
  final String attendanceStatus;
  final String method;
  final DateTime markedAt;

  const MyAttendanceModel({
    required this.id,
    required this.sessionId,
    required this.sessionTitle,
    required this.subjectCode,
    required this.subjectTitle,
    required this.venueName,
    required this.conductingStaffName,
    required this.attendanceStatus,
    required this.method,
    required this.markedAt,
  });

  factory MyAttendanceModel.fromJson(Map<String, dynamic> json) {
    return MyAttendanceModel(
      id: json['id'] ?? '',
      sessionId: json['sessionId'] ?? '',
      sessionTitle: json['sessionTitle'] ?? '',
      subjectCode: json['subjectCode'] ?? '',
      subjectTitle: json['subjectTitle'] ?? '',
      venueName: json['venueName'] ?? '',
      conductingStaffName: json['conductingStaffName'] ?? '',
      attendanceStatus: json['attendanceStatus'] ?? 'PRESENT',
      method: json['method'] ?? 'QR',
      markedAt: DateTime.tryParse(json['markedAt'] ?? '') ?? DateTime.now(),
    );
  }

  String get formattedMarkedAt {
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final dt = markedAt.toLocal();
    final hour = dt.hour == 0 ? 12 : (dt.hour > 12 ? dt.hour - 12 : dt.hour);
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    final minute = dt.minute.toString().padLeft(2, '0');
    return '${dt.day} ${months[dt.month - 1]} ${dt.year}, $hour:$minute $period';
  }
}
