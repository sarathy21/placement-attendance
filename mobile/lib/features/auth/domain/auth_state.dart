enum UserRole { student, staff, admin, superAdmin }

class UserIdentity {
  final String id;
  final String email;
  final UserRole role;
  final String status;
  final String? firstName;
  final String? lastName;

  const UserIdentity({
    required this.id,
    required this.email,
    required this.role,
    required this.status,
    this.firstName,
    this.lastName,
  });

  factory UserIdentity.fromJson(Map<String, dynamic> json) {
    UserRole parsedRole = UserRole.student;
    final roleStr = json['role']?.toString().toUpperCase();
    if (roleStr == 'STAFF') {
      parsedRole = UserRole.staff;
    } else if (roleStr == 'ADMIN') {
      parsedRole = UserRole.admin;
    } else if (roleStr == 'SUPER_ADMIN') {
      parsedRole = UserRole.superAdmin;
    }

    return UserIdentity(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      role: parsedRole,
      status: json['status'] ?? 'ACTIVE',
      firstName: json['firstName'],
      lastName: json['lastName'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'role': role.name.toUpperCase(),
        'status': status,
        'firstName': firstName,
        'lastName': lastName,
      };
}

class StudentProfileModel {
  final String id;
  final String userId;
  final String registerNumber;
  final String collegeEmail;
  final String firstName;
  final String? lastName;
  final String? phoneNumber;
  final String? avatarUrl;
  final String departmentId;
  final String? courseId;
  final String? batchId;
  final bool isPlacementEligible;
  final String status;

  const StudentProfileModel({
    required this.id,
    required this.userId,
    required this.registerNumber,
    required this.collegeEmail,
    required this.firstName,
    this.lastName,
    this.phoneNumber,
    this.avatarUrl,
    required this.departmentId,
    this.courseId,
    this.batchId,
    required this.isPlacementEligible,
    required this.status,
  });

  factory StudentProfileModel.fromJson(Map<String, dynamic> json) {
    return StudentProfileModel(
      id: json['id'] ?? '',
      userId: json['userId'] ?? '',
      registerNumber: json['registerNumber'] ?? '',
      collegeEmail: json['collegeEmail'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'],
      phoneNumber: json['phoneNumber'],
      avatarUrl: json['avatarUrl'],
      departmentId: json['departmentId'] ?? '',
      courseId: json['courseId'],
      batchId: json['batchId'],
      isPlacementEligible: json['isPlacementEligible'] ?? false,
      status: json['status'] ?? 'ACTIVE',
    );
  }
}

class StaffProfileModel {
  final String id;
  final String userId;
  final String staffEmployeeId;
  final String firstName;
  final String? lastName;
  final String collegeEmail;
  final String? phoneNumber;
  final String? avatarUrl;
  final String departmentId;
  final String status;

  const StaffProfileModel({
    required this.id,
    required this.userId,
    required this.staffEmployeeId,
    required this.firstName,
    this.lastName,
    required this.collegeEmail,
    this.phoneNumber,
    this.avatarUrl,
    required this.departmentId,
    required this.status,
  });

  factory StaffProfileModel.fromJson(Map<String, dynamic> json) {
    return StaffProfileModel(
      id: json['id'] ?? '',
      userId: json['userId'] ?? '',
      staffEmployeeId: json['staffEmployeeId'] ?? json['employeeId'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'],
      collegeEmail: json['collegeEmail'] ?? '',
      phoneNumber: json['phoneNumber'],
      avatarUrl: json['avatarUrl'],
      departmentId: json['departmentId'] ?? '',
      status: json['status'] ?? 'ACTIVE',
    );
  }
}

class UpdateProfileDto {
  final String? phoneNumber;
  final String? avatarUrl;

  const UpdateProfileDto({this.phoneNumber, this.avatarUrl});

  Map<String, dynamic> toJson() {
    final Map<String, dynamic> map = {};
    if (phoneNumber != null) map['phoneNumber'] = phoneNumber;
    if (avatarUrl != null) map['avatarUrl'] = avatarUrl;
    return map;
  }
}

class ChangePasswordDto {
  final String currentPassword;
  final String newPassword;

  const ChangePasswordDto({
    required this.currentPassword,
    required this.newPassword,
  });

  Map<String, dynamic> toJson() => {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      };
}

abstract class AuthState {
  const AuthState();
}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class Authenticated extends AuthState {
  final UserIdentity user;
  final Map<String, dynamic>? profile;

  const Authenticated({required this.user, this.profile});
}

class Unauthenticated extends AuthState {
  final String? message;
  const Unauthenticated({this.message});
}
