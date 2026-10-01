enum SessionLifecycleStatus { scheduled, inProgress, completed, cancelled }

class SessionSubjectModel {
  final String id;
  final String code;
  final String title;

  const SessionSubjectModel({
    required this.id,
    required this.code,
    required this.title,
  });

  factory SessionSubjectModel.fromJson(Map<String, dynamic> json) {
    return SessionSubjectModel(
      id: json['id'] ?? '',
      code: json['code'] ?? '',
      title: json['title'] ?? '',
    );
  }
}

class SessionVenueModel {
  final String id;
  final String name;
  final String? building;

  const SessionVenueModel({
    required this.id,
    required this.name,
    this.building,
  });

  factory SessionVenueModel.fromJson(Map<String, dynamic> json) {
    return SessionVenueModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      building: json['building'],
    );
  }
}

class SessionStaffModel {
  final String id;
  final String firstName;
  final String? lastName;

  const SessionStaffModel({
    required this.id,
    required this.firstName,
    this.lastName,
  });

  String get fullName => lastName != null && lastName!.isNotEmpty
      ? '$firstName $lastName'
      : firstName;

  factory SessionStaffModel.fromJson(Map<String, dynamic> json) {
    return SessionStaffModel(
      id: json['id'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'],
    );
  }
}

class SessionModel {
  final String id;
  final String title;
  final DateTime sessionDate;
  final DateTime startTime;
  final DateTime endTime;
  final SessionLifecycleStatus status;
  final SessionSubjectModel? subject;
  final SessionVenueModel? venue;
  final SessionStaffModel? staff;
  final Map<String, dynamic>? department;
  final Map<String, dynamic>? course;
  final Map<String, dynamic>? batch;

  const SessionModel({
    required this.id,
    required this.title,
    required this.sessionDate,
    required this.startTime,
    required this.endTime,
    required this.status,
    this.subject,
    this.venue,
    this.staff,
    this.department,
    this.course,
    this.batch,
  });

  factory SessionModel.fromJson(Map<String, dynamic> json) {
    SessionLifecycleStatus parsedStatus = SessionLifecycleStatus.scheduled;
    final statusStr = json['status']?.toString().toUpperCase();
    if (statusStr == 'IN_PROGRESS') parsedStatus = SessionLifecycleStatus.inProgress;
    if (statusStr == 'COMPLETED') parsedStatus = SessionLifecycleStatus.completed;
    if (statusStr == 'CANCELLED') parsedStatus = SessionLifecycleStatus.cancelled;

    return SessionModel(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      sessionDate: DateTime.tryParse(json['sessionDate'] ?? '') ?? DateTime.now(),
      startTime: DateTime.tryParse(json['startTime'] ?? '') ?? DateTime.now(),
      endTime: DateTime.tryParse(json['endTime'] ?? '') ?? DateTime.now(),
      status: parsedStatus,
      subject: json['subject'] is Map<String, dynamic>
          ? SessionSubjectModel.fromJson(json['subject'])
          : null,
      venue: json['venue'] is Map<String, dynamic>
          ? SessionVenueModel.fromJson(json['venue'])
          : null,
      staff: json['staff'] is Map<String, dynamic>
          ? SessionStaffModel.fromJson(json['staff'])
          : null,
      department: json['department'] is Map<String, dynamic> ? json['department'] : null,
      course: json['course'] is Map<String, dynamic> ? json['course'] : null,
      batch: json['batch'] is Map<String, dynamic> ? json['batch'] : null,
    );
  }

  String get formattedDate {
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${startTime.day} ${months[startTime.month - 1]} ${startTime.year}';
  }

  String get formattedTime {
    final startStr = _formatTime(startTime);
    final endStr = _formatTime(endTime);
    return '$startStr - $endStr';
  }

  String _formatTime(DateTime dt) {
    final hour = dt.hour == 0 ? 12 : (dt.hour > 12 ? dt.hour - 12 : dt.hour);
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    final minute = dt.minute.toString().padLeft(2, '0');
    return '$hour:$minute $period';
  }

  String get displaySubject {
    if (subject != null) {
      return subject!.code.isNotEmpty ? '${subject!.code} • ${subject!.title}' : subject!.title;
    }
    return title;
  }

  String get displayVenue {
    if (venue != null) {
      if (venue!.building != null && venue!.building!.isNotEmpty) {
        return '${venue!.name} (${venue!.building})';
      }
      return venue!.name;
    }
    return 'Campus Venue';
  }

  String get displayStaff => staff?.fullName ?? 'Faculty / Staff';
}
