import '../../../core/network/dio_client.dart';
import 'models/placement_batch_model.dart';

class PlacementBatchesRepository {
  final DioClient _dioClient;

  PlacementBatchesRepository(this._dioClient);

  Future<List<PlacementBatchModel>> getPlacementBatches() async {
    final response = await _dioClient.instance.get('/placement-batches');
    final List list = response.data as List;
    return list.map((json) => PlacementBatchModel.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<PlacementBatchModel> createBatch({
    required String name,
    int? startYear,
    int? endYear,
    String? description,
  }) async {
    final Map<String, dynamic> payload = {'name': name.trim()};
    if (startYear != null) payload['startYear'] = startYear;
    if (endYear != null) payload['endYear'] = endYear;
    if (description != null && description.trim().isNotEmpty) payload['description'] = description.trim();

    final response = await _dioClient.instance.post('/placement-batches', data: payload);
    return PlacementBatchModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<PlacementBatchModel> updateBatch({
    required String id,
    String? name,
    int? startYear,
    int? endYear,
    String? description,
  }) async {
    final Map<String, dynamic> payload = {
      'startYear': startYear,
      'endYear': endYear,
      'description': description?.trim(),
    };
    if (name != null) payload['name'] = name.trim();

    final response = await _dioClient.instance.patch('/placement-batches/$id', data: payload);
    return PlacementBatchModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> deleteBatch(String id) async {
    await _dioClient.instance.delete('/placement-batches/$id');
  }

  Future<List<PlacementStudentModel>> getStudents({String? placementBatchId, String? search}) async {
    final Map<String, dynamic> params = {'limit': 100};
    if (placementBatchId != null) params['placementBatchId'] = placementBatchId;
    if (search != null && search.trim().isNotEmpty) params['search'] = search.trim();

    final response = await _dioClient.instance.get('/students', queryParameters: params);
    final List list = response.data['data'] as List;
    return list.map((json) => PlacementStudentModel.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<void> updateStudentBatch({required String studentId, String? placementBatchId}) async {
    await _dioClient.instance.patch('/students/$studentId', data: {
      'placementBatchId': placementBatchId,
    });
  }
}
