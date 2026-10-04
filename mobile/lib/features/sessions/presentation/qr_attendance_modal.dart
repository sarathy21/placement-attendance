import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/errors/failures.dart';
import '../../../core/widgets/widgets.dart';
import '../data/models/qr_token_model.dart';
import 'providers/sessions_provider.dart';

class QrAttendanceModal extends ConsumerStatefulWidget {
  final String sessionId;
  final String sessionTitle;

  const QrAttendanceModal({
    super.key,
    required this.sessionId,
    required this.sessionTitle,
  });

  static Future<void> show(BuildContext context, {required String sessionId, required String sessionTitle}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => QrAttendanceModal(sessionId: sessionId, sessionTitle: sessionTitle),
    );
  }

  @override
  ConsumerState<QrAttendanceModal> createState() => _QrAttendanceModalState();
}

class _QrAttendanceModalState extends ConsumerState<QrAttendanceModal> {
  Timer? _countdownTimer;
  int _remainingSeconds = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchToken();
    });
  }

  void _fetchToken() {
    ref.read(qrTokenNotifierProvider(widget.sessionId).notifier).requestToken();
  }

  void _startCountdown(QrTokenModel token) {
    _countdownTimer?.cancel();
    _updateRemainingSeconds(token);

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      _updateRemainingSeconds(token);
    });
  }

  void _updateRemainingSeconds(QrTokenModel token) {
    final diff = token.expiresAt.difference(DateTime.now()).inSeconds;
    setState(() {
      _remainingSeconds = diff > 0 ? diff : 0;
    });
    if (diff <= 0) {
      _countdownTimer?.cancel();
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tokenAsync = ref.watch(qrTokenNotifierProvider(widget.sessionId));

    // Listen to token state changes to update countdown
    ref.listen<AsyncValue<QrTokenModel?>>(qrTokenNotifierProvider(widget.sessionId), (prev, next) {
      next.whenData((token) {
        if (token != null) {
          _startCountdown(token);
        }
      });
    });

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.all(24.0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Attendance QR',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      widget.sessionTitle,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          const Divider(height: 24),

          tokenAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 40.0),
              child: LoadingState(message: 'Generating secure QR token...'),
            ),
            error: (err, stack) {
              String msg = 'Failed to generate QR token';
              if (err is Failure) {
                msg = err.message;
              } else if (err is Exception) {
                msg = err.toString().replaceAll('Exception: ', '');
              }

              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 20.0),
                child: ErrorState(
                  message: msg,
                  onRetry: _fetchToken,
                ),
              );
            },
            data: (token) {
              if (token == null) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 20.0),
                  child: PrimaryButton(
                    text: 'Request Attendance QR',
                    onPressed: _fetchToken,
                  ),
                );
              }

              final isExpired = _remainingSeconds <= 0;

              return Column(
                children: [
                  const Text(
                    'Show this QR to your conducting staff member',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),

                  // QR Code Box
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isExpired ? AppColors.surfaceVariant : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isExpired ? AppColors.statusAbsent : AppColors.primary,
                        width: 2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.08),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: isExpired
                        ? const SizedBox(
                            width: 200,
                            height: 200,
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.timer_off_outlined, size: 48, color: AppColors.statusAbsent),
                                SizedBox(height: 12),
                                Text(
                                  'QR Token Expired',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.statusAbsent,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : QrImageView(
                            data: token.rawToken,
                            version: QrVersions.auto,
                            size: 200.0,
                            eyeStyle: const QrEyeStyle(
                              eyeShape: QrEyeShape.square,
                              color: AppColors.primaryDark,
                            ),
                            dataModuleStyle: const QrDataModuleStyle(
                              dataModuleShape: QrDataModuleShape.square,
                              color: AppColors.textPrimary,
                            ),
                          ),
                  ),
                  const SizedBox(height: 20),

                  // Expiry Countdown Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: isExpired ? const Color(0xFFFEE2E2) : AppColors.primaryLight,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isExpired ? Icons.error_outline : Icons.timer_outlined,
                          size: 16,
                          color: isExpired ? AppColors.statusAbsent : AppColors.primaryDark,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          isExpired
                              ? 'Expired'
                              : 'Valid for: $_remainingSeconds seconds',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: isExpired ? AppColors.statusAbsent : AppColors.primaryDark,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Refresh QR Action
                  SecondaryButton(
                    text: 'Refresh QR',
                    icon: Icons.refresh_rounded,
                    onPressed: _fetchToken,
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }
}
