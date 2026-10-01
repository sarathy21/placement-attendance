import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../data/models/notification_model.dart';
import '../../data/repositories/notifications_repository.dart';

final notificationsRepositoryProvider = Provider<INotificationsRepository>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  return NotificationsRepository(dioClient);
});

class UnreadCountNotifier extends StateNotifier<int> {
  final INotificationsRepository _repository;

  UnreadCountNotifier(this._repository) : super(0) {
    fetchUnreadCount();
  }

  Future<void> fetchUnreadCount() async {
    try {
      final count = await _repository.getUnreadCount();
      state = count;
    } catch (_) {
      // Retain existing state on background fetch failure
    }
  }

  void decrement(int count) {
    state = (state - count) < 0 ? 0 : state - count;
  }

  void reset() {
    state = 0;
  }
}

final unreadCountNotifierProvider = StateNotifierProvider<UnreadCountNotifier, int>((ref) {
  final repo = ref.watch(notificationsRepositoryProvider);
  return UnreadCountNotifier(repo);
});

class NotificationsNotifier extends StateNotifier<AsyncValue<List<NotificationModel>>> {
  final INotificationsRepository _repository;
  final Ref _ref;

  NotificationsNotifier(this._repository, this._ref) : super(const AsyncValue.loading()) {
    fetchNotifications();
  }

  Future<void> fetchNotifications() async {
    state = const AsyncValue.loading();
    try {
      final list = await _repository.getNotifications();
      state = AsyncValue.data(list);
      _ref.read(unreadCountNotifierProvider.notifier).fetchUnreadCount();
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> markAsRead(String id) async {
    final currentState = state;
    if (currentState is! AsyncData<List<NotificationModel>>) return;

    final currentList = currentState.value;
    final itemIndex = currentList.indexWhere((item) => item.id == id);
    if (itemIndex == -1 || currentList[itemIndex].isRead) return;

    // Optimistic update
    final updatedList = List<NotificationModel>.from(currentList);
    updatedList[itemIndex] = currentList[itemIndex].copyWith(isRead: true);
    state = AsyncValue.data(updatedList);
    _ref.read(unreadCountNotifierProvider.notifier).decrement(1);

    try {
      await _repository.markAsRead(id);
    } catch (_) {
      // Revert if API fails
      state = AsyncValue.data(currentList);
      _ref.read(unreadCountNotifierProvider.notifier).fetchUnreadCount();
    }
  }

  Future<void> markAllAsRead() async {
    final currentState = state;
    if (currentState is! AsyncData<List<NotificationModel>>) return;

    final currentList = currentState.value;
    final updatedList = currentList.map((item) => item.copyWith(isRead: true)).toList();
    state = AsyncValue.data(updatedList);
    _ref.read(unreadCountNotifierProvider.notifier).reset();

    try {
      await _repository.markAllAsRead();
    } catch (_) {
      // Revert on API failure
      state = AsyncValue.data(currentList);
      _ref.read(unreadCountNotifierProvider.notifier).fetchUnreadCount();
    }
  }
}

final notificationsNotifierProvider = StateNotifierProvider<NotificationsNotifier, AsyncValue<List<NotificationModel>>>((ref) {
  final repo = ref.watch(notificationsRepositoryProvider);
  return NotificationsNotifier(repo, ref);
});
