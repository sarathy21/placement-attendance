import 'package:intl/intl.dart';
import 'session_model.dart';

enum AttendanceRosterStatus {
  present,
  late,
  absent,
  excused;

  static AttendanceRosterStatus fromString(String? status) {
    if (status == null) return AttendanceRosterStatus.absent;
    switch (status.toUpperCase()) {
      case 'PRESENT':
        return AttendanceRosterStatus.present;
      case 'LATE':
        return AttendanceRosterStatus.late;
      case 'EXCUSED':
        return AttendanceRosterStatus.excused;
      case 'ABSENT':
      default:
        return AttendanceRosterStatus.absent;
    }
  }
}

class AttendanceSummaryModel {
  final int totalRoster;
  final int presentCount;
  final int lateCount;
  final int absentCount;
  final int excusedCount;

  const AttendanceSummaryModel({
    required this.totalRoster,
    required this.presentCount,
    required this.lateCount,
    required this.absentCount,
    required this.excusedCount,
  });

  factory AttendanceSummaryModel.fromJson(Map<String, dynamic> json) {
    return AttendanceSummaryModel(
      totalRoster: (json['totalRoster'] ?? json['total'] ?? 0) as int,
      presentCount: (json['presentCount'] ?? json['present'] ?? 0) as int,
      lateCount: (json['lateCount'] ?? json['late'] ?? 0) as int,
      absentCount: (json['absentCount'] ?? json['absent'] ?? 0) as int,
      excusedCount: (json['excusedCount'] ?? json['excused'] ?? 0) as int,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'totalRoster': totalRoster,
      'presentCount': presentCount,
      'lateCount': lateCount,
      'absentCount': absentCount,
      'excusedCount': excusedCount,
    };
  }
}

class AttendanceRosterStudentModel {
  final String studentId;
  final String registerNumber;
  final String firstName;
  final String lastName;
  final String? collegeEmail;
  final String? phoneNumber;
  final AttendanceRosterStatus attendanceStatus;
  final DateTime? markedAt;
  final String? method;

  const AttendanceRosterStudentModel({
    required this.studentId,
    required this.registerNumber,
    required this.firstName,
    required this.lastName,
    this.collegeEmail,
    this.phoneNumber,
    required this.attendanceStatus,
    this.markedAt,
    this.method,
  });

  String get fullName => '$firstName $lastName'.trim();

  String get displayStatus {
    switch (attendanceStatus) {
      case AttendanceRosterStatus.present:
        return 'PRESENT';
      case AttendanceRosterStatus.late:
        return 'LATE';
      case AttendanceRosterStatus.excused:
        return 'EXCUSED';
      case AttendanceRosterStatus.absent:
        return 'ABSENT';
    }
  }

  String get formattedMarkedAt {
    if (markedAt == null) return 'Not Marked';
    return DateFormat('hh:mm a').format(markedAt!.toLocal());
  }

  factory AttendanceRosterStudentModel.fromJson(Map<String, dynamic> json) {
    DateTime? parsedMarkedAt;
    if (json['markedAt'] != null) {
      parsedMarkedAt = DateTime.tryParse(json['markedAt'].toString());
    }

    final rawStatus = (json['attendanceStatus'] ?? json['status'])?.toString();

    return AttendanceRosterStudentModel(
      studentId: (json['studentId'] ?? json['id'] ?? '').toString(),
      registerNumber: (json['registerNumber'] ?? '').toString(),
      firstName: (json['firstName'] ?? '').toString(),
      lastName: (json['lastName'] ?? '').toString(),
      collegeEmail: json['collegeEmail']?.toString(),
      phoneNumber: json['phoneNumber']?.toString(),
      attendanceStatus: AttendanceRosterStatus.fromString(rawStatus),
      markedAt: parsedMarkedAt,
      method: json['method']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'studentId': studentId,
      'registerNumber': registerNumber,
      'firstName': firstName,
      'lastName': lastName,
      'collegeEmail': collegeEmail,
      'phoneNumber': phoneNumber,
      'attendanceStatus': displayStatus,
      'markedAt': markedAt?.toIso8601String(),
      'method': method,
    };
  }
}

class AttendanceRosterResponseModel {
  final SessionModel session;
  final AttendanceSummaryModel summary;
  final List<AttendanceRosterStudentModel> roster;

  const AttendanceRosterResponseModel({
    required this.session,
    required this.summary,
    required this.roster,
  });

  factory AttendanceRosterResponseModel.fromJson(Map<String, dynamic> json) {
    final rawRoster = (json['roster'] as List<dynamic>?) ?? [];
    return AttendanceRosterResponseModel(
      session: SessionModel.fromJson(json['session'] as Map<String, dynamic>),
      summary: AttendanceSummaryModel.fromJson(json['summary'] as Map<String, dynamic>),
      roster: rawRoster
          .map((e) => AttendanceRosterStudentModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'summary': summary.toJson(),
      'roster': roster.map((e) => e.toJson()).toList(),
    };
  }
}
