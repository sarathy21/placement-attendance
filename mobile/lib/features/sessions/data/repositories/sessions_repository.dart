import 'package:dio/dio.dart';
import '../../../../core/errors/error_mapper.dart';
import '../../../../core/network/dio_client.dart';
import '../models/my_attendance_model.dart';
import '../models/qr_token_model.dart';
import '../models/session_model.dart';

abstract class ISessionsRepository {
  Future<List<SessionModel>> getMySessions({String? status});
  Future<SessionModel> getSessionDetail(String id);
  Future<QrTokenModel> generateQrToken(String sessionId);
  Future<List<MyAttendanceModel>> getMyAttendance();
}

class SessionsRepository implements ISessionsRepository {
  final DioClient _dioClient;

  SessionsRepository(this._dioClient);

  @override
  Future<List<SessionModel>> getMySessions({String? status}) async {
    try {
      final response = await _dioClient.instance.get(
        '/sessions/my',
        queryParameters: status != null && status.isNotEmpty ? {'status': status} : null,
      );

      final data = response.data;
      final List<dynamic> listData = data is Map<String, dynamic> && data.containsKey('data')
          ? data['data']
          : (data is List ? data : []);

      return listData.map((json) => SessionModel.fromJson(json as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  @override
  Future<SessionModel> getSessionDetail(String id) async {
    try {
      final response = await _dioClient.instance.get('/sessions/$id');
      return SessionModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  @override
  Future<QrTokenModel> generateQrToken(String sessionId) async {
    try {
      final response = await _dioClient.instance.post(
        '/attendance/qr/token',
        data: {'sessionId': sessionId},
      );
      return QrTokenModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  @override
  Future<List<MyAttendanceModel>> getMyAttendance() async {
    try {
      final response = await _dioClient.instance.get('/attendance/my');
      final List<dynamic> listData = response.data is List ? response.data : [];
      return listData.map((json) => MyAttendanceModel.fromJson(json as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    } catch (e) {
      throw Exception(e.toString());
    }
  }
}
