import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../auth/providers/auth_provider.dart';
import '../data/placement_drives_repository.dart';
import '../domain/placement_drive_model.dart';

final placementDrivesRepositoryProvider = Provider<IPlacementDrivesRepository>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return PlacementDrivesRepository(dioClient);
});

final placementDrivesListProvider = FutureProvider.family<List<PlacementDriveModel>, String?>((ref, statusFilter) async {
  final repo = ref.watch(placementDrivesRepositoryProvider);
  return repo.getDrives(status: statusFilter);
});

final placementDriveDetailProvider = FutureProvider.family<PlacementDriveModel, String>((ref, id) async {
  final repo = ref.watch(placementDrivesRepositoryProvider);
  return repo.getDriveDetail(id);
});
