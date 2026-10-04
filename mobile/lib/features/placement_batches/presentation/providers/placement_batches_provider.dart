import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../data/models/placement_batch_model.dart';
import '../../data/placement_batches_repository.dart';

final placementBatchesRepositoryProvider = Provider<PlacementBatchesRepository>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return PlacementBatchesRepository(dioClient);
});

final placementBatchesListProvider = FutureProvider<List<PlacementBatchModel>>((ref) async {
  final repo = ref.watch(placementBatchesRepositoryProvider);
  return repo.getPlacementBatches();
});

final batchMembersProvider = FutureProvider.family<List<PlacementStudentModel>, String>((ref, batchId) async {
  final repo = ref.watch(placementBatchesRepositoryProvider);
  return repo.getStudents(placementBatchId: batchId);
});

final searchStudentsProvider = FutureProvider.family<List<PlacementStudentModel>, String>((ref, search) async {
  final repo = ref.watch(placementBatchesRepositoryProvider);
  return repo.getStudents(search: search);
});
