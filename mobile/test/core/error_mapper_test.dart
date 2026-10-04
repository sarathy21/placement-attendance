import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:placement_attendance_mobile/core/errors/error_mapper.dart';
import 'package:placement_attendance_mobile/core/errors/failures.dart';

void main() {
  group('ErrorMapper Tests', () {
    test('connectionTimeout returns NetworkFailure', () {
      final dioErr = DioException(
        requestOptions: RequestOptions(path: '/test'),
        type: DioExceptionType.connectionTimeout,
      );
      final failure = ErrorMapper.fromDioException(dioErr);
      expect(failure, isA<NetworkFailure>());
      expect(failure.message, contains('timed out'));
    });

    test('badResponse 401 returns UnauthorizedFailure', () {
      final dioErr = DioException(
        requestOptions: RequestOptions(path: '/auth/me'),
        type: DioExceptionType.badResponse,
        response: Response(
          requestOptions: RequestOptions(path: '/auth/me'),
          statusCode: 401,
          data: {'message': 'Invalid token'},
        ),
      );
      final failure = ErrorMapper.fromDioException(dioErr);
      expect(failure, isA<UnauthorizedFailure>());
      expect(failure.message, equals('Invalid token'));
      expect(failure.statusCode, equals(401));
    });

    test('badResponse 403 returns ForbiddenFailure', () {
      final dioErr = DioException(
        requestOptions: RequestOptions(path: '/sessions/123/attendance'),
        type: DioExceptionType.badResponse,
        response: Response(
          requestOptions: RequestOptions(path: '/sessions/123/attendance'),
          statusCode: 403,
          data: {'message': 'Forbidden resource'},
        ),
      );
      final failure = ErrorMapper.fromDioException(dioErr);
      expect(failure, isA<ForbiddenFailure>());
      expect(failure.message, equals('Forbidden resource'));
      expect(failure.statusCode, equals(403));
    });

    test('badResponse 409 returns ConflictFailure', () {
      final dioErr = DioException(
        requestOptions: RequestOptions(path: '/devices/tokens'),
        type: DioExceptionType.badResponse,
        response: Response(
          requestOptions: RequestOptions(path: '/devices/tokens'),
          statusCode: 409,
          data: {'message': 'Device token belongs to another user'},
        ),
      );
      final failure = ErrorMapper.fromDioException(dioErr);
      expect(failure, isA<ConflictFailure>());
      expect(failure.message, equals('Device token belongs to another user'));
      expect(failure.statusCode, equals(409));
    });
  });
}
