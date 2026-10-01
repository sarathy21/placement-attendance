import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../data/models/attendance_roster_model.dart';
import '../../data/models/create_session_dto.dart';
import '../../data/models/my_attendance_model.dart';
import '../../data/models/qr_token_model.dart';
import '../../data/models/scan_attendance_result_model.dart';
import '../../data/models/session_model.dart';
import '../../data/models/session_reference_models.dart';
import '../../data/repositories/sessions_repository.dart';

final sessionsRepositoryProvider = Provider<ISessionsRepository>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return SessionsRepository(dioClient);
});

final studentSessionsListProvider = FutureProvider.family<List<SessionModel>, String?>((ref, statusFilter) async {
  final repo = ref.watch(sessionsRepositoryProvider);
  return repo.getMySessions(status: statusFilter);
});

final staffSessionsListProvider = FutureProvider.family<List<SessionModel>, String?>((ref, statusFilter) async {
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

final subjectsProvider = FutureProvider<List<SubjectReferenceModel>>((ref) async {
  final repo = ref.watch(sessionsRepositoryProvider);
  return repo.getSubjects();
});

final venuesProvider = FutureProvider<List<VenueReferenceModel>>((ref) async {
  final repo = ref.watch(sessionsRepositoryProvider);
  return repo.getVenues();
});

final departmentsProvider = FutureProvider<List<DepartmentReferenceModel>>((ref) async {
  final repo = ref.watch(sessionsRepositoryProvider);
  return repo.getDepartments();
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

class SessionLifecycleNotifier extends StateNotifier<AsyncValue<SessionModel?>> {
  final ISessionsRepository _repository;
  final Ref _ref;

  SessionLifecycleNotifier(this._repository, this._ref) : super(const AsyncValue.data(null));

  Future<SessionModel?> updateStatus(String sessionId, String status) async {
    if (state.isLoading) return null;
    state = const AsyncValue.loading();
    try {
      final updated = await _repository.updateSessionStatus(sessionId, status);
      state = AsyncValue.data(updated);
      _invalidateProviders(sessionId);
      return updated;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<SessionModel?> cancelSession(String sessionId) async {
    if (state.isLoading) return null;
    state = const AsyncValue.loading();
    try {
      final updated = await _repository.cancelSession(sessionId);
      state = AsyncValue.data(updated);
      _invalidateProviders(sessionId);
      return updated;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  void _invalidateProviders(String sessionId) {
    _ref.invalidate(sessionDetailProvider(sessionId));
    _ref.invalidate(staffSessionsListProvider);
    _ref.invalidate(studentSessionsListProvider);
  }
}

final sessionLifecycleNotifierProvider = StateNotifierProvider<SessionLifecycleNotifier, AsyncValue<SessionModel?>>((ref) {
  final repo = ref.watch(sessionsRepositoryProvider);
  return SessionLifecycleNotifier(repo, ref);
});

class CreateSessionNotifier extends StateNotifier<AsyncValue<SessionModel?>> {
  final ISessionsRepository _repository;
  final Ref _ref;

  CreateSessionNotifier(this._repository, this._ref) : super(const AsyncValue.data(null));

  Future<SessionModel?> createSession(CreateSessionDto dto) async {
    if (state.isLoading) return null;
    state = const AsyncValue.loading();
    try {
      final created = await _repository.createSession(dto);
      state = AsyncValue.data(created);
      _ref.invalidate(staffSessionsListProvider);
      _ref.invalidate(studentSessionsListProvider);
      return created;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }
}

final createSessionNotifierProvider = StateNotifierProvider<CreateSessionNotifier, AsyncValue<SessionModel?>>((ref) {
  final repo = ref.watch(sessionsRepositoryProvider);
  return CreateSessionNotifier(repo, ref);
});

class ScanAttendanceNotifier extends StateNotifier<AsyncValue<ScanAttendanceResultModel?>> {
  final ISessionsRepository _repository;
  final Ref _ref;

  ScanAttendanceNotifier(this._repository, this._ref) : super(const AsyncValue.data(null));

  Future<ScanAttendanceResultModel?> scanToken(String rawToken) async {
    if (state.isLoading) return null;
    state = const AsyncValue.loading();
    try {
      final result = await _repository.scanQrToken(rawToken);
      state = AsyncValue.data(result);
      _ref.invalidate(staffSessionsListProvider);
      _ref.invalidate(studentSessionsListProvider);
      _ref.invalidate(sessionDetailProvider(result.sessionId));
      _ref.invalidate(sessionAttendanceProvider(result.sessionId));
      _ref.invalidate(myAttendanceListProvider);
      return result;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  void resetState() {
    state = const AsyncValue.data(null);
  }
}

final scanAttendanceNotifierProvider = StateNotifierProvider<ScanAttendanceNotifier, AsyncValue<ScanAttendanceResultModel?>>((ref) {
  final repo = ref.watch(sessionsRepositoryProvider);
  return ScanAttendanceNotifier(repo, ref);
});

final sessionAttendanceProvider = FutureProvider.family<AttendanceRosterResponseModel, String>((ref, sessionId) async {
  final repo = ref.watch(sessionsRepositoryProvider);
  return repo.getSessionAttendance(sessionId);
});
