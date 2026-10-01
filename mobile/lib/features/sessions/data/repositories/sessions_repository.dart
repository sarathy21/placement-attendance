import 'package:dio/dio.dart';
import '../../../../core/errors/error_mapper.dart';
import '../../../../core/network/dio_client.dart';
import '../models/attendance_roster_model.dart';
import '../models/create_session_dto.dart';
import '../models/my_attendance_model.dart';
import '../models/qr_token_model.dart';
import '../models/scan_attendance_result_model.dart';
import '../models/session_model.dart';
import '../models/session_reference_models.dart';

abstract class ISessionsRepository {
  Future<List<SessionModel>> getMySessions({String? status});
  Future<SessionModel> getSessionDetail(String id);
  Future<QrTokenModel> generateQrToken(String sessionId);
  Future<List<MyAttendanceModel>> getMyAttendance();
  Future<SessionModel> updateSessionStatus(String sessionId, String status);
  Future<SessionModel> cancelSession(String sessionId);
  Future<SessionModel> createSession(CreateSessionDto dto);
  Future<List<SubjectReferenceModel>> getSubjects();
  Future<List<VenueReferenceModel>> getVenues();
  Future<List<DepartmentReferenceModel>> getDepartments();
  Future<ScanAttendanceResultModel> scanQrToken(String rawToken);
  Future<AttendanceRosterResponseModel> getSessionAttendance(String sessionId);
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

  @override
  Future<SessionModel> updateSessionStatus(String sessionId, String status) async {
    try {
      final response = await _dioClient.instance.patch(
        '/sessions/$sessionId/status',
        data: {'status': status},
      );
      return SessionModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  @override
  Future<SessionModel> cancelSession(String sessionId) async {
    try {
      final response = await _dioClient.instance.post(
        '/sessions/$sessionId/cancel',
      );
      return SessionModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  @override
  Future<SessionModel> createSession(CreateSessionDto dto) async {
    try {
      final response = await _dioClient.instance.post(
        '/sessions',
        data: dto.toJson(),
      );
      return SessionModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  @override
  Future<List<SubjectReferenceModel>> getSubjects() async {
    try {
      final response = await _dioClient.instance.get('/subjects');
      final data = response.data;
      final List<dynamic> listData = data is List ? data : (data is Map<String, dynamic> && data['data'] is List ? data['data'] : []);
      return listData.map((json) => SubjectReferenceModel.fromJson(json as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  @override
  Future<List<VenueReferenceModel>> getVenues() async {
    try {
      final response = await _dioClient.instance.get('/venues');
      final data = response.data;
      final List<dynamic> listData = data is List ? data : (data is Map<String, dynamic> && data['data'] is List ? data['data'] : []);
      return listData.map((json) => VenueReferenceModel.fromJson(json as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  @override
  Future<List<DepartmentReferenceModel>> getDepartments() async {
    try {
      final response = await _dioClient.instance.get('/departments');
      final data = response.data;
      final List<dynamic> listData = data is List ? data : (data is Map<String, dynamic> && data['data'] is List ? data['data'] : []);
      return listData.map((json) => DepartmentReferenceModel.fromJson(json as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  @override
  Future<ScanAttendanceResultModel> scanQrToken(String rawToken) async {
    try {
      final response = await _dioClient.instance.post(
        '/attendance/qr/scan',
        data: {'rawToken': rawToken},
      );
      return ScanAttendanceResultModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  @override
  Future<AttendanceRosterResponseModel> getSessionAttendance(String sessionId) async {
    try {
      final response = await _dioClient.instance.get('/sessions/$sessionId/attendance');
      return AttendanceRosterResponseModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    } catch (e) {
      throw Exception(e.toString());
    }
  }
}
