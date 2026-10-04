class ScanAttendanceStudentModel {
  final String id;
  final String userId;
  final String registerNumber;
  final String firstName;
  final String lastName;
  final String collegeEmail;

  const ScanAttendanceStudentModel({
    required this.id,
    required this.userId,
    required this.registerNumber,
    required this.firstName,
    required this.lastName,
    required this.collegeEmail,
  });

  String get fullName => '$firstName $lastName'.trim();

  factory ScanAttendanceStudentModel.fromJson(Map<String, dynamic> json) {
    return ScanAttendanceStudentModel(
      id: json['id'] ?? '',
      userId: json['userId'] ?? '',
      registerNumber: json['registerNumber'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      collegeEmail: json['collegeEmail'] ?? '',
    );
  }
}

class ScanAttendanceSessionModel {
  final String id;
  final String title;
  final String status;

  const ScanAttendanceSessionModel({
    required this.id,
    required this.title,
    required this.status,
  });

  factory ScanAttendanceSessionModel.fromJson(Map<String, dynamic> json) {
    return ScanAttendanceSessionModel(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      status: json['status'] ?? '',
    );
  }
}

class ScanAttendanceResultModel {
  final bool success;
  final String id;
  final String sessionId;
  final String studentId;
  final String markedByStaffId;
  final String method;
  final String status;
  final DateTime markedAt;
  final ScanAttendanceStudentModel? student;
  final ScanAttendanceSessionModel? session;

  const ScanAttendanceResultModel({
    required this.success,
    required this.id,
    required this.sessionId,
    required this.studentId,
    required this.markedByStaffId,
    required this.method,
    required this.status,
    required this.markedAt,
    this.student,
    this.session,
  });

  factory ScanAttendanceResultModel.fromJson(Map<String, dynamic> json) {
    final attJson = json['attendance'] is Map<String, dynamic>
        ? json['attendance'] as Map<String, dynamic>
        : json;
    return ScanAttendanceResultModel(
      success: json['success'] ?? true,
      id: attJson['id'] ?? '',
      sessionId: attJson['sessionId'] ?? '',
      studentId: attJson['studentId'] ?? '',
      markedByStaffId: attJson['markedByStaffId'] ?? '',
      method: attJson['method'] ?? 'QR',
      status: attJson['status'] ?? 'PRESENT',
      markedAt: DateTime.tryParse(attJson['markedAt'] ?? '') ?? DateTime.now(),
      student: attJson['student'] != null
          ? ScanAttendanceStudentModel.fromJson(attJson['student'])
          : null,
      session: attJson['session'] != null
          ? ScanAttendanceSessionModel.fromJson(attJson['session'])
          : null,
    );
  }

  String get formattedMarkedAt {
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final dt = markedAt.toLocal();
    final hour = dt.hour == 0 ? 12 : (dt.hour > 12 ? dt.hour - 12 : dt.hour);
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    final minute = dt.minute.toString().padLeft(2, '0');
    return '$hour:$minute $period, ${dt.day} ${months[dt.month - 1]} ${dt.year}';
  }

  String get displayStudentName {
    if (student != null && student!.fullName.isNotEmpty) {
      return student!.fullName;
    }
    return 'Student ($studentId)';
  }

  String get displayRegisterNumber {
    if (student != null && student!.registerNumber.isNotEmpty) {
      return student!.registerNumber;
    }
    return 'N/A';
  }
}
