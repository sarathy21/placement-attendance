import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/errors/failures.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../devices/data/device_token_service.dart';
import '../data/auth_repository.dart';
import '../domain/auth_state.dart';

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

final dioClientProvider = Provider<DioClient>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return DioClient(storage);
});

final deviceTokenServiceProvider = Provider<IDeviceTokenService>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return DeviceTokenService(dioClient);
});

final authRepositoryProvider = Provider<IAuthRepository>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return AuthRepository(dioClient);
});

final authNotifierProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  final storage = ref.watch(secureStorageProvider);
  final deviceTokenService = ref.watch(deviceTokenServiceProvider);
  return AuthNotifier(repository, storage, deviceTokenService);
});

class AuthNotifier extends StateNotifier<AuthState> {
  final IAuthRepository _repository;
  final SecureStorageService _storage;
  final IDeviceTokenService _deviceTokenService;

  AuthNotifier(this._repository, this._storage, this._deviceTokenService)
      : super(AuthInitial()) {
    restoreSession();
  }

  Future<void> restoreSession() async {
    state = AuthLoading();
    try {
      final token = await _storage.getAccessToken();
      if (token == null || token.isEmpty) {
        state = const Unauthenticated();
        return;
      }

      final meData = await _repository.getMe();
      final userData = meData['user'] ?? meData;
      final profileData = meData['profile'];
      final user = UserIdentity.fromJson(userData);

      await _storage.saveUserData(jsonEncode(meData));
      state = Authenticated(user: user, profile: profileData);
    } catch (e) {
      await _storage.clearAll();
      state = const Unauthenticated();
    }
  }

  Future<bool> login(String email, String password) async {
    state = AuthLoading();
    try {
      final token = await _repository.login(email, password);
      await _storage.saveAccessToken(token);

      final meData = await _repository.getMe();
      final userData = meData['user'] ?? meData;
      final profileData = meData['profile'];
      final user = UserIdentity.fromJson(userData);

      await _storage.saveUserData(jsonEncode(meData));
      state = Authenticated(user: user, profile: profileData);

      // Independently register FCM token without failing login
      _deviceTokenService.registerDeviceToken('fcm_placeholder_token', 'ANDROID');

      return true;
    } catch (e) {
      final msg = e is Failure ? e.message : e.toString().replaceAll('Exception: ', '');
      state = Unauthenticated(message: msg);
      return false;
    }
  }

  Future<bool> updateProfile(UpdateProfileDto dto) async {
    final currentState = state;
    if (currentState is! Authenticated) return false;

    try {
      final updatedProfileRes = await _repository.updateProfile(dto);
      final updatedProfile = updatedProfileRes['profile'] ?? updatedProfileRes;

      state = Authenticated(
        user: currentState.user,
        profile: updatedProfile is Map<String, dynamic> ? updatedProfile : currentState.profile,
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<bool> changePassword(ChangePasswordDto dto) async {
    try {
      await _repository.changePassword(dto);
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<void> logout() async {
    // Attempt device token unregister (silently caught if fails)
    await _deviceTokenService.unregisterDeviceToken('fcm_placeholder_token');

    // Guaranteed local state purge regardless of server status
    await _storage.clearAll();
    state = const Unauthenticated();
  }

  void onSessionExpired() {
    state = const Unauthenticated(message: 'Session expired. Please log in again.');
  }
}
