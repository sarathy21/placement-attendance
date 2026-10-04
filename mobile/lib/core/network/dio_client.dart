import 'package:dio/dio.dart';
import '../config/app_config.dart';
import '../storage/secure_storage_service.dart';
import 'auth_interceptor.dart';
import 'error_interceptor.dart';

class DioClient {
  final Dio _dio;

  DioClient(SecureStorageService storageService, {void Function()? onUnauthorized, String? baseUrl})
      : _dio = Dio(
          BaseOptions(
            baseUrl: baseUrl ?? AppConfig.apiBaseUrl,
            connectTimeout: const Duration(milliseconds: AppConfig.connectTimeoutMs),
            receiveTimeout: const Duration(milliseconds: AppConfig.receiveTimeoutMs),
            sendTimeout: const Duration(milliseconds: AppConfig.sendTimeoutMs),
            headers: {'Content-Type': 'application/json'},
          ),
        ) {
    _dio.interceptors.addAll([
      AuthInterceptor(storageService),
      ErrorInterceptor(storageService, onUnauthorized: onUnauthorized),
      LogInterceptor(requestBody: true, responseBody: true, error: true),
    ]);
  }

  Dio get instance => _dio;
}
