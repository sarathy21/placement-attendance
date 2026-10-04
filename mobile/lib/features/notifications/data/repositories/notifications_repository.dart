import 'package:dio/dio.dart';
import '../../../../core/errors/error_mapper.dart';
import '../../../../core/network/dio_client.dart';
import '../models/notification_model.dart';

abstract class INotificationsRepository {
  Future<List<NotificationModel>> getNotifications({int page = 1, int limit = 20, bool? unreadOnly});
  Future<int> getUnreadCount();
  Future<NotificationModel> markAsRead(String id);
  Future<int> markAllAsRead();
}

class NotificationsRepository implements INotificationsRepository {
  final DioClient _dioClient;

  NotificationsRepository(this._dioClient);

  @override
  Future<List<NotificationModel>> getNotifications({int page = 1, int limit = 20, bool? unreadOnly}) async {
    try {
      final response = await _dioClient.instance.get(
        '/notifications',
        queryParameters: {
          'page': page,
          'limit': limit,
          if (unreadOnly != null) 'unreadOnly': unreadOnly,
        },
      );

      final data = response.data;
      final List<dynamic> listData = data is Map<String, dynamic> && data.containsKey('data')
          ? data['data']
          : (data is List ? data : []);

      return listData.map((json) => NotificationModel.fromJson(json as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  @override
  Future<int> getUnreadCount() async {
    try {
      final response = await _dioClient.instance.get('/notifications/unread-count');
      final data = response.data;
      if (data is Map<String, dynamic> && data.containsKey('unreadCount')) {
        return (data['unreadCount'] as num).toInt();
      }
      return 0;
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    } catch (e) {
      return 0;
    }
  }

  @override
  Future<NotificationModel> markAsRead(String id) async {
    try {
      final response = await _dioClient.instance.patch('/notifications/$id/read');
      return NotificationModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    } catch (e) {
      throw Exception(e.toString());
    }
  }

  @override
  Future<int> markAllAsRead() async {
    try {
      final response = await _dioClient.instance.patch('/notifications/read-all');
      final data = response.data;
      if (data is Map<String, dynamic> && data.containsKey('count')) {
        return (data['count'] as num).toInt();
      }
      return 0;
    } on DioException catch (e) {
      throw ErrorMapper.fromDioException(e);
    } catch (e) {
      throw Exception(e.toString());
    }
  }
}
