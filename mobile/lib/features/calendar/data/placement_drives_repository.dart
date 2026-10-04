import 'package:dio/dio.dart';
import '../../../core/errors/error_mapper.dart';
import '../../../core/network/dio_client.dart';
import '../domain/placement_drive_model.dart';

abstract class IPlacementDrivesRepository {
  Future<List<PlacementDriveModel>> getDrives({
    String? status,
    String? companyName,
    String? fromDate,
    String? toDate,
    bool? attendanceEnabled,
  });

  Future<PlacementDriveModel> getDriveDetail(String id);

  Future<PlacementDriveModel> createDrive({
    required String companyName,
    required String driveDate,
    required String venue,
    String? description,
    bool? attendanceEnabled,
    List<Map<String, dynamic>>? rounds,
  });

  Future<PlacementDriveModel> updateDrive(
    String id, {
    String? companyName,
    String? driveDate,
    String? venue,
    String? description,
    bool? attendanceEnabled,
  });

  Future<PlacementDriveModel> updateDriveStatus(String id, String status);

  Future<PlacementDriveRoundModel> addRound(
    String driveId, {
    required String roundName,
    required int roundOrder,
    String? date,
    String? venue,
    String? description,
    String? sessionId,
  });

  Future<void> deleteRound(String driveId, String roundId);
}

class PlacementDrivesRepository implements IPlacementDrivesRepository {
  final DioClient _dioClient;

  PlacementDrivesRepository(this._dioClient);

  @override
  Future<List<PlacementDriveModel>> getDrives({
    String? status,
    String? companyName,
    String? fromDate,
    String? toDate,
    bool? attendanceEnabled,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        if (status != null) 'status': status,
        if (companyName != null && companyName.isNotEmpty) 'companyName': companyName,
        if (fromDate != null) 'fromDate': fromDate,
        if (toDate != null) 'toDate': toDate,
        if (attendanceEnabled != null) 'attendanceEnabled': attendanceEnabled,
      };

      final res = await _dioClient.instance.get('/placement-drives', queryParameters: queryParams);
      final data = res.data['data'] as List<dynamic>? ?? [];
      return data.map((item) => PlacementDriveModel.fromJson(item as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    }
  }

  @override
  Future<PlacementDriveModel> getDriveDetail(String id) async {
    try {
      final res = await _dioClient.instance.get('/placement-drives/$id');
      return PlacementDriveModel.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    }
  }

  @override
  Future<PlacementDriveModel> createDrive({
    required String companyName,
    required String driveDate,
    required String venue,
    String? description,
    bool? attendanceEnabled,
    List<Map<String, dynamic>>? rounds,
  }) async {
    try {
      final payload = <String, dynamic>{
        'companyName': companyName,
        'driveDate': driveDate,
        'venue': venue,
        if (description != null) 'description': description,
        if (attendanceEnabled != null) 'attendanceEnabled': attendanceEnabled,
        if (rounds != null) 'rounds': rounds,
      };

      final res = await _dioClient.instance.post('/placement-drives', data: payload);
      return PlacementDriveModel.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    }
  }

  @override
  Future<PlacementDriveModel> updateDrive(
    String id, {
    String? companyName,
    String? driveDate,
    String? venue,
    String? description,
    bool? attendanceEnabled,
  }) async {
    try {
      final payload = <String, dynamic>{
        if (companyName != null) 'companyName': companyName,
        if (driveDate != null) 'driveDate': driveDate,
        if (venue != null) 'venue': venue,
        if (description != null) 'description': description,
        if (attendanceEnabled != null) 'attendanceEnabled': attendanceEnabled,
      };

      final res = await _dioClient.instance.patch('/placement-drives/$id', data: payload);
      return PlacementDriveModel.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    }
  }

  @override
  Future<PlacementDriveModel> updateDriveStatus(String id, String status) async {
    try {
      final res = await _dioClient.instance.patch('/placement-drives/$id/status', data: {'status': status});
      return PlacementDriveModel.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    }
  }

  @override
  Future<PlacementDriveRoundModel> addRound(
    String driveId, {
    required String roundName,
    required int roundOrder,
    String? date,
    String? venue,
    String? description,
    String? sessionId,
  }) async {
    try {
      final payload = <String, dynamic>{
        'roundName': roundName,
        'roundOrder': roundOrder,
        if (date != null) 'date': date,
        if (venue != null) 'venue': venue,
        if (description != null) 'description': description,
        if (sessionId != null) 'sessionId': sessionId,
      };

      final res = await _dioClient.instance.post('/placement-drives/$driveId/rounds', data: payload);
      return PlacementDriveRoundModel.fromJson(res.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    }
  }

  @override
  Future<void> deleteRound(String driveId, String roundId) async {
    try {
      await _dioClient.instance.delete('/placement-drives/$driveId/rounds/$roundId');
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    }
  }
}
