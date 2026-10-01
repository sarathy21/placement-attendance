import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../data/models/my_attendance_model.dart';
import '../../data/models/qr_token_model.dart';
import '../../data/models/session_model.dart';
import '../../data/repositories/sessions_repository.dart';

final sessionsRepositoryProvider = Provider<ISessionsRepository>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return SessionsRepository(dioClient);
});

final studentSessionsListProvider = FutureProvider.family<List<SessionModel>, String?>((ref, statusFilter) async {
  final repo = ref.watch(sessionsRepositoryProvider);
  return repo.getMySessions(status: statusFilter);
});

final sessionDetailProvider = FutureProvider.family<SessionModel, String>((ref, id) async {
  final repo = ref.watch(sessionsRepositoryProvider);
  return repo.getSessionDetail(id);
});

final myAttendanceListProvider = FutureProvider<List<MyAttendanceModel>>((ref) async {
  final repo = ref.watch(sessionsRepositoryProvider);
  return repo.getMyAttendance();
});

class QrTokenNotifier extends StateNotifier<AsyncValue<QrTokenModel?>> {
  final ISessionsRepository _repository;
  final String _sessionId;

  QrTokenNotifier(this._repository, this._sessionId) : super(const AsyncValue.data(null));

  Future<void> requestToken() async {
    state = const AsyncValue.loading();
    try {
      final token = await _repository.generateQrToken(_sessionId);
      state = AsyncValue.data(token);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  void clearToken() {
    state = const AsyncValue.data(null);
  }
}

final qrTokenNotifierProvider = StateNotifierProvider.family<QrTokenNotifier, AsyncValue<QrTokenModel?>, String>((ref, sessionId) {
  final repo = ref.watch(sessionsRepositoryProvider);
  return QrTokenNotifier(repo, sessionId);
});
