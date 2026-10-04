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

final placementDrivesProvider = FutureProvider<List<PlacementDriveModel>>((ref) async {
  final repo = ref.watch(placementDrivesRepositoryProvider);
  return repo.getDrives();
});

final nextUpcomingDriveProvider = FutureProvider<PlacementDriveModel?>((ref) async {
  final drives = await ref.watch(placementDrivesProvider.future);
  if (drives.isEmpty) return null;
  final upcoming = drives.where((d) => d.status == DriveStatus.upcoming || d.status == DriveStatus.ongoing).toList();
  if (upcoming.isEmpty) return null;
  upcoming.sort((a, b) => a.driveDate.compareTo(b.driveDate));
  return upcoming.first;
});

final placementDriveDetailProvider = FutureProvider.family<PlacementDriveModel, String>((ref, id) async {
  final repo = ref.watch(placementDrivesRepositoryProvider);
  return repo.getDriveDetail(id);
});

