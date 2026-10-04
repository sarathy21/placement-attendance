import 'package:dio/dio.dart';
import '../../../core/config/api_endpoints.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/network/dio_client.dart';
import '../domain/auth_state.dart';

abstract class IAuthRepository {
  Future<String> login(String email, String password);
  Future<Map<String, dynamic>> getMe();
  Future<void> changePassword(ChangePasswordDto dto);
  Future<Map<String, dynamic>> updateProfile(UpdateProfileDto dto);
}

class AuthRepository implements IAuthRepository {
  final DioClient _dioClient;

  AuthRepository(this._dioClient);

  @override
  Future<String> login(String email, String password) async {
    try {
      final res = await _dioClient.instance.post(
        ApiEndpoints.login,
        data: {'email': email.trim(), 'password': password},
      );

      final token = res.data['accessToken'];
      if (token == null || token.toString().isEmpty) {
        throw Exception('Server returned empty access token');
      }
      return token.toString();
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    }
  }

  @override
  Future<Map<String, dynamic>> getMe() async {
    try {
      final res = await _dioClient.instance.get(ApiEndpoints.me);
      if (res.data is Map<String, dynamic>) {
        return res.data as Map<String, dynamic>;
      }
      throw Exception('Malformed user identity response');
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    }
  }

  @override
  Future<void> changePassword(ChangePasswordDto dto) async {
    try {
      await _dioClient.instance.post(
        ApiEndpoints.changePassword,
        data: dto.toJson(),
      );
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    }
  }

  @override
  Future<Map<String, dynamic>> updateProfile(UpdateProfileDto dto) async {
    try {
      final res = await _dioClient.instance.patch(
        ApiEndpoints.updateProfile,
        data: dto.toJson(),
      );
      if (res.data is Map<String, dynamic>) {
        return res.data as Map<String, dynamic>;
      }
      return {};
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    }
  }
}
