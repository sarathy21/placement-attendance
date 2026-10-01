import 'package:dio/dio.dart';
import '../storage/secure_storage_service.dart';

class ErrorInterceptor extends Interceptor {
  final SecureStorageService _storageService;
  final void Function()? _onUnauthorized;

  ErrorInterceptor(this._storageService, {this._onUnauthorized});

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      await _storageService.clearAll();
      _onUnauthorized?.call();
    }
    handler.next(err);
  }
}
