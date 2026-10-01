import '../../../core/config/api_endpoints.dart';
import '../../../core/network/dio_client.dart';

abstract class IDeviceTokenService {
  Future<bool> registerDeviceToken(String token, String platform);
  Future<bool> unregisterDeviceToken(String token);
}

class DeviceTokenService implements IDeviceTokenService {
  final DioClient _dioClient;

  DeviceTokenService(this._dioClient);

  @override
  Future<bool> registerDeviceToken(String token, String platform) async {
    try {
      final res = await _dioClient.instance.post(
        ApiEndpoints.registerDeviceToken,
        data: {'token': token, 'platform': platform.toUpperCase()},
      );
      return res.statusCode == 201 || res.statusCode == 200;
    } catch (_) {
      // FCM registration failure MUST NOT fail login or throw uncaught exceptions
      return false;
    }
  }

  @override
  Future<bool> unregisterDeviceToken(String token) async {
    try {
      final res = await _dioClient.instance.delete(
        ApiEndpoints.unregisterDeviceToken,
        data: {'token': token},
      );
      return res.statusCode == 200;
    } catch (_) {
      // Unregistration failures MUST NOT block local logout
      return false;
    }
  }
}
