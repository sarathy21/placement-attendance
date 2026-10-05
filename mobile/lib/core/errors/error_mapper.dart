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

        final cleanMsg = _sanitize(serverMsg);

        switch (statusCode) {
          case 400:
            return ValidationFailure(cleanMsg.isNotEmpty ? cleanMsg : 'Invalid request details provided.', statusCode);
          case 401:
            return UnauthorizedFailure(cleanMsg.isNotEmpty ? cleanMsg : 'Your session has expired. Please sign in again.', statusCode);
          case 403:
            return ForbiddenFailure(cleanMsg.isNotEmpty ? cleanMsg : 'You do not have permission to perform this action.', statusCode);
          case 404:
            return NotFoundFailure(cleanMsg.isNotEmpty ? cleanMsg : 'The requested item was not found.', statusCode);
          case 409:
            return ConflictFailure(cleanMsg.isNotEmpty ? cleanMsg : 'Action could not be completed due to a data conflict.', statusCode);
          case 500:
          default:
            return ServerFailure(cleanMsg.isNotEmpty ? cleanMsg : 'An unexpected server error occurred. Please try again later.', statusCode);
        }

      case DioExceptionType.cancel:
        return const NetworkFailure('Request was cancelled.');

      case DioExceptionType.unknown:
      default:
        return NetworkFailure(_sanitize(exception.message ?? 'An unexpected network connection error occurred.'));
    }
  }

  static String _sanitize(String msg) {
    if (msg.isEmpty) return '';
    final lower = msg.toLowerCase();
    if (lower.contains('prisma') ||
        lower.contains('dioexception') ||
        lower.contains('httpexception') ||
        lower.contains('foreign key') ||
        lower.contains('unique constraint') ||
        lower.contains('p2002') ||
        lower.contains('p2003')) {
      return 'The requested operation could not be completed due to a server constraint conflict.';
    }
    return msg;
  }
}
