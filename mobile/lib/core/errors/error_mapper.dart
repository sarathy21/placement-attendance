import 'package:dio/dio.dart';
import 'failures.dart';

class ErrorMapper {
  static Failure fromDioException(DioException exception) {
    switch (exception.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.connectionError:
        return const NetworkFailure('Network connection timed out. Please check your internet connection.');

      case DioExceptionType.badResponse:
        final statusCode = exception.response?.statusCode;
        final responseData = exception.response?.data;
        String serverMsg = '';

        if (responseData is Map<String, dynamic>) {
          if (responseData['message'] is String) {
            serverMsg = responseData['message'];
          } else if (responseData['message'] is List) {
            serverMsg = (responseData['message'] as List).join(', ');
          }
        }

        switch (statusCode) {
          case 400:
            return ValidationFailure(serverMsg.isNotEmpty ? serverMsg : 'Bad Request (400)', statusCode);
          case 401:
            return UnauthorizedFailure(serverMsg.isNotEmpty ? serverMsg : 'Unauthorized Access (401)', statusCode);
          case 403:
            return ForbiddenFailure(serverMsg.isNotEmpty ? serverMsg : 'Access Forbidden (403)', statusCode);
          case 404:
            return NotFoundFailure(serverMsg.isNotEmpty ? serverMsg : 'Resource Not Found (404)', statusCode);
          case 409:
            return ConflictFailure(serverMsg.isNotEmpty ? serverMsg : 'Conflict State (409)', statusCode);
          case 500:
          default:
            return ServerFailure(serverMsg.isNotEmpty ? serverMsg : 'Server Error ($statusCode)', statusCode);
        }

      case DioExceptionType.cancel:
        return const NetworkFailure('Request was cancelled.');

      case DioExceptionType.unknown:
      default:
        return NetworkFailure(exception.message ?? 'An unexpected network error occurred.');
    }
  }
}
