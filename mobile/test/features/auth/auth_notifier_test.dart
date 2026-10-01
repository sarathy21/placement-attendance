import 'package:flutter_test/flutter_test.dart';
import 'package:placement_attendance_mobile/core/errors/failures.dart';
import 'package:placement_attendance_mobile/features/auth/data/auth_repository.dart';
import 'package:placement_attendance_mobile/features/auth/domain/auth_state.dart';
import 'package:placement_attendance_mobile/features/auth/providers/auth_provider.dart';
import 'package:placement_attendance_mobile/features/devices/data/device_token_service.dart';
import 'package:placement_attendance_mobile/core/storage/secure_storage_service.dart';

class MockAuthRepository implements IAuthRepository {
  bool shouldFailLogin = false;
  bool shouldFailGetMe = false;
  bool shouldFailChangePassword = false;
  bool shouldFailUpdateProfile = false;
  String failureMessage = 'Error occurred';

  String mockRole = 'STUDENT';
  Map<String, dynamic> mockProfileData = {
    'id': 'st-1',
    'registerNumber': '25cap109',
    'collegeEmail': 'student@kahedu.edu.in',
    'phoneNumber': '+919876543210',
    'avatarUrl': 'https://example.com/avatar.jpg',
  };

  @override
  Future<String> login(String email, String password) async {
    if (shouldFailLogin) {
      throw UnauthorizedFailure(failureMessage);
    }
    return 'mock_jwt_access_token_123';
  }

  @override
  Future<Map<String, dynamic>> getMe() async {
    if (shouldFailGetMe) {
      throw const UnauthorizedFailure('Invalid token');
    }
    return {
      'user': {
        'id': 'u-1',
        'email': 'user@kahedu.edu.in',
        'role': mockRole,
        'status': 'ACTIVE',
      },
      'profile': mockProfileData,
    };
  }

  @override
  Future<void> changePassword(ChangePasswordDto dto) async {
    if (shouldFailChangePassword) {
      throw const UnauthorizedFailure('Current password incorrect');
    }
  }

  @override
  Future<Map<String, dynamic>> updateProfile(UpdateProfileDto dto) async {
    if (shouldFailUpdateProfile) {
      throw const ValidationFailure('Invalid profile field');
    }
    mockProfileData['phoneNumber'] = dto.phoneNumber ?? mockProfileData['phoneNumber'];
    mockProfileData['avatarUrl'] = dto.avatarUrl ?? mockProfileData['avatarUrl'];
    return {'profile': mockProfileData};
  }
}

class MockDeviceTokenService implements IDeviceTokenService {
  bool shouldFailUnregister = false;
  bool registerCalled = false;
  bool unregisterCalled = false;

  @override
  Future<bool> registerDeviceToken(String token, String platform) async {
    registerCalled = true;
    return true;
  }

  @override
  Future<bool> unregisterDeviceToken(String token) async {
    unregisterCalled = true;
    if (shouldFailUnregister) return false;
    return true;
  }
}

class MockSecureStorageService extends SecureStorageService {
  String? _token;
  String? _userData;

  @override
  Future<void> saveAccessToken(String token) async => _token = token;

  @override
  Future<String?> getAccessToken() async => _token;

  @override
  Future<void> deleteAccessToken() async => _token = null;

  @override
  Future<void> saveUserData(String userJson) async => _userData = userJson;

  @override
  Future<String?> getUserData() async => _userData;

  @override
  Future<void> clearAll() async {
    _token = null;
    _userData = null;
  }
}

void main() {
  late MockAuthRepository mockRepo;
  late MockSecureStorageService mockStorage;
  late MockDeviceTokenService mockDeviceService;
  late AuthNotifier authNotifier;

  beforeEach() {
    mockRepo = MockAuthRepository();
    mockStorage = MockSecureStorageService();
    mockDeviceService = MockDeviceTokenService();
  }

  group('AuthNotifier Tests', () {
    test('Initial startup with no token results in Unauthenticated state', () async {
      beforeEach();
      authNotifier = AuthNotifier(mockRepo, mockStorage, mockDeviceService);
      await authNotifier.restoreSession();

      expect(authNotifier.state, isA<Unauthenticated>());
    });

    test('Startup with valid token restores Authenticated state via GET /auth/me', () async {
      beforeEach();
      await mockStorage.saveAccessToken('valid_token');
      authNotifier = AuthNotifier(mockRepo, mockStorage, mockDeviceService);
      await authNotifier.restoreSession();

      expect(authNotifier.state, isA<Authenticated>());
      final authState = authNotifier.state as Authenticated;
      expect(authState.user.email, equals('user@kahedu.edu.in'));
      expect(authState.user.role, equals(UserRole.student));
    });

    test('Startup with invalid token clears storage and sets Unauthenticated state', () async {
      beforeEach();
      await mockStorage.saveAccessToken('expired_token');
      mockRepo.shouldFailGetMe = true;

      authNotifier = AuthNotifier(mockRepo, mockStorage, mockDeviceService);
      await authNotifier.restoreSession();

      expect(authNotifier.state, isA<Unauthenticated>());
      expect(await mockStorage.getAccessToken(), isNull);
    });

    test('Successful login saves token, establishes role, and registers FCM token independently', () async {
      beforeEach();
      authNotifier = AuthNotifier(mockRepo, mockStorage, mockDeviceService);

      final success = await authNotifier.login('user@kahedu.edu.in', 'password123');

      expect(success, isTrue);
      expect(authNotifier.state, isA<Authenticated>());
      expect(await mockStorage.getAccessToken(), equals('mock_jwt_access_token_123'));
      expect(mockDeviceService.registerCalled, isTrue);
    });

    test('Failed login with 401 invalid credentials sets Unauthenticated with error message', () async {
      beforeEach();
      mockRepo.shouldFailLogin = true;
      mockRepo.failureMessage = 'Invalid email or password';
      authNotifier = AuthNotifier(mockRepo, mockStorage, mockDeviceService);

      final success = await authNotifier.login('wrong@kahedu.edu.in', 'badpass');

      expect(success, isFalse);
      expect(authNotifier.state, isA<Unauthenticated>());
      final unauth = authNotifier.state as Unauthenticated;
      expect(unauth.message, contains('Invalid email or password'));
    });

    test('Profile update permits updating phoneNumber and avatarUrl ONLY', () async {
      beforeEach();
      await mockStorage.saveAccessToken('valid_token');
      authNotifier = AuthNotifier(mockRepo, mockStorage, mockDeviceService);
      await authNotifier.restoreSession();

      final success = await authNotifier.updateProfile(
        const UpdateProfileDto(phoneNumber: '+919999999999', avatarUrl: 'https://newavatar.com/img.png'),
      );

      expect(success, isTrue);
      final authState = authNotifier.state as Authenticated;
      expect(authState.profile?['phoneNumber'], equals('+919999999999'));
      expect(authState.profile?['avatarUrl'], equals('https://newavatar.com/img.png'));
    });

    test('Change password success and failure handling', () async {
      beforeEach();
      authNotifier = AuthNotifier(mockRepo, mockStorage, mockDeviceService);

      final ok = await authNotifier.changePassword(
        const ChangePasswordDto(currentPassword: 'pass', newPassword: 'newpass'),
      );
      expect(ok, isTrue);

      mockRepo.shouldFailChangePassword = true;
      final fail = await authNotifier.changePassword(
        const ChangePasswordDto(currentPassword: 'wrong', newPassword: 'newpass'),
      );
      expect(fail, isFalse);
    });

    test('Logout clears local authentication even if DELETE /devices/tokens fails', () async {
      beforeEach();
      await mockStorage.saveAccessToken('valid_token');
      mockDeviceService.shouldFailUnregister = true; // FCM unregister server failure

      authNotifier = AuthNotifier(mockRepo, mockStorage, mockDeviceService);
      await authNotifier.restoreSession();

      expect(authNotifier.state, isA<Authenticated>());

      await authNotifier.logout();

      expect(authNotifier.state, isA<Unauthenticated>());
      expect(await mockStorage.getAccessToken(), isNull);
      expect(mockDeviceService.unregisterCalled, isTrue);
    });
  });
}
