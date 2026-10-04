import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/errors/failures.dart';
import '../../../core/widgets/widgets.dart';
import '../data/models/scan_attendance_result_model.dart';
import '../data/models/session_model.dart';
import 'providers/sessions_provider.dart';

class StaffQrScannerScreen extends ConsumerStatefulWidget {
  final String? sessionId;
  final SessionModel? session;

  const StaffQrScannerScreen({
    super.key,
    this.sessionId,
    this.session,
  });

  @override
  ConsumerState<StaffQrScannerScreen> createState() => _StaffQrScannerScreenState();
}

class _StaffQrScannerScreenState extends ConsumerState<StaffQrScannerScreen> {
  final _manualFormKey = GlobalKey<FormState>();
  final _tokenController = TextEditingController();
  MobileScannerController? _scannerController;
  bool _isManualEntryExpanded = false;
  bool _isCameraDeniedOrUnavailable = false;
  bool _isTorchOn = false;
  bool _hasProcessedScan = false;

  @override
  void initState() {
    super.initState();
    try {
      _scannerController = MobileScannerController(
        detectionSpeed: DetectionSpeed.noDuplicates,
        facing: CameraFacing.back,
      );
    } catch (_) {
      _isCameraDeniedOrUnavailable = true;
    }
  }

  @override
  void dispose() {
    _scannerController?.dispose();
    _tokenController.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_hasProcessedScan) return;
    final List<Barcode> barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      final String? rawValue = barcode.rawValue;
      if (rawValue != null && rawValue.trim().isNotEmpty) {
        _hasProcessedScan = true;
        _submitToken(rawValue.trim());
        break;
      }
    }
  }

  Future<void> _submitToken(String rawToken) async {
    final cleanToken = rawToken.trim();
    if (cleanToken.isEmpty) {
      _showErrorSnackBar('Token cannot be empty');
      _hasProcessedScan = false;
      return;
    }

    try {
      final result = await ref
          .read(scanAttendanceNotifierProvider.notifier)
          .scanToken(cleanToken);

      if (result != null && mounted) {
        _tokenController.clear();
      }
    } catch (e) {
      if (!mounted) return;
      String message = 'Failed to process QR token';
      if (e is Failure) {
        message = e.message;
      } else {
        message = e.toString().replaceAll('Exception: ', '');
      }
      _showErrorSnackBar(message);
      // Reset scan lock so staff can scan again
      _hasProcessedScan = false;
    }
  }

  void _submitManualToken() {
    if (!_manualFormKey.currentState!.validate()) return;
    final rawToken = _tokenController.text.trim();
    _submitToken(rawToken);
  }

  void _scanNextStudent() {
    ref.read(scanAttendanceNotifierProvider.notifier).resetState();
    _tokenController.clear();
    setState(() {
      _hasProcessedScan = false;
    });
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.statusAbsent,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final scanState = ref.watch(scanAttendanceNotifierProvider);
    final isSubmitting = scanState.isLoading;
    final ScanAttendanceResultModel? resultData = scanState.asData?.value;

    // Session Context Resolution
    final effectiveSessionId = widget.sessionId ?? widget.session?.id;
    final sessionAsync = effectiveSessionId != null
        ? ref.watch(sessionDetailProvider(effectiveSessionId))
        : null;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Scan Attendance'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          if (_scannerController != null && !_isCameraDeniedOrUnavailable && resultData == null)
            IconButton(
              icon: Icon(
                _isTorchOn ? Icons.flash_on_rounded : Icons.flash_off_rounded,
                color: Colors.white,
              ),
              onPressed: () {
                _scannerController?.toggleTorch();
                setState(() => _isTorchOn = !_isTorchOn);
              },
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(18.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Session Context Card (if available)
            if (widget.session != null) ...[
              _buildSessionContextCard(widget.session!),
              const SizedBox(height: 16),
            ] else if (sessionAsync != null) ...[
              sessionAsync.when(
                loading: () => const LoadingState(message: 'Loading session info...'),
                error: (err, st) => const SizedBox.shrink(),
                data: (session) => Column(
                  children: [
                    _buildSessionContextCard(session),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ],

            // Scanner View or Result View
            if (resultData != null) ...[
              _buildSuccessCard(resultData),
            ] else ...[
              // Instruction Card
              const AppCard(
                padding: EdgeInsets.all(14),
                child: Row(
                  children: [
                    Icon(Icons.qr_code_scanner_rounded, size: 26, color: AppColors.primary),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Ask the student to display their attendance QR code from their app screen.',
                        style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Camera View Container
              Container(
                height: 280,
                decoration: BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border, width: 2),
                ),
                clipBehavior: Clip.antiAlias,
                child: _isCameraDeniedOrUnavailable
                    ? _buildCameraUnavailableFallback()
                    : Stack(
                        alignment: Alignment.center,
                        children: [
                          MobileScanner(
                            controller: _scannerController,
                            onDetect: _onDetect,
                            errorBuilder: (context, error) {
                              return _buildCameraUnavailableFallback();
                            },
                          ),
                          // Scanner Overlay Target Frame
                          Container(
                            width: 200,
                            height: 200,
                            decoration: BoxDecoration(
                              border: Border.all(color: AppColors.primary, width: 3),
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          if (isSubmitting)
                            Container(
                              color: Colors.black54,
                              child: const Center(
                                child: LoadingState(message: 'Recording attendance...'),
                              ),
                            ),
                        ],
                      ),
              ),
              const SizedBox(height: 20),

              // Manual Token Entry Section
              AppCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    InkWell(
                      onTap: () {
                        setState(() {
                          _isManualEntryExpanded = !_isManualEntryExpanded;
                        });
                      },
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.keyboard_rounded, size: 20, color: AppColors.primary),
                              SizedBox(width: 10),
                              Text(
                                'Or enter token manually',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ],
                          ),
                          Icon(
                            _isManualEntryExpanded
                                ? Icons.keyboard_arrow_up_rounded
                                : Icons.keyboard_arrow_down_rounded,
                            color: AppColors.textSecondary,
                          ),
                        ],
                      ),
                    ),
                    if (_isManualEntryExpanded || _isCameraDeniedOrUnavailable) ...[
                      const SizedBox(height: 14),
                      const Divider(),
                      const SizedBox(height: 10),
                      Form(
                        key: _manualFormKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextFormField(
                              controller: _tokenController,
                              decoration: InputDecoration(
                                labelText: '64-Char Hex Token',
                                hintText: 'e.g. a1b2c3d4e5f67890...',
                                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(10),
                                  borderSide: const BorderSide(color: AppColors.border),
                                ),
                              ),
                              validator: (val) {
                                if (val == null || val.trim().isEmpty) {
                                  return 'Please enter a QR token';
                                }
                                if (val.trim().length != 64) {
                                  return 'Token must be exactly 64 characters';
                                }
                                final hexRegex = RegExp(r'^[0-9a-fA-F]{64}$');
                                if (!hexRegex.hasMatch(val.trim())) {
                                  return 'Token must contain only hexadecimal characters';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 12),
                            PrimaryButton(
                              text: 'Submit Token',
                              icon: Icons.send_rounded,
                              isLoading: isSubmitting,
                              onPressed: isSubmitting ? null : _submitManualToken,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSessionContextCard(SessionModel session) {
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  session.displaySubject,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              StatusBadge(status: session.displayStatus),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            session.title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.location_on_outlined, size: 14, color: AppColors.textSecondary),
              const SizedBox(width: 4),
              Text(
                session.displayVenue,
                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
              const SizedBox(width: 14),
              const Icon(Icons.access_time_rounded, size: 14, color: AppColors.textSecondary),
              const SizedBox(width: 4),
              Text(
                session.formattedTime,
                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCameraUnavailableFallback() {
    return Container(
      color: const Color(0xFF1E293B),
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.videocam_off_rounded, size: 48, color: Colors.white54),
          const SizedBox(height: 12),
          const Text(
            'Camera Unavailable',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Camera access is denied or not supported on this device. Please use manual token entry below.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12, color: Colors.white70),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessCard(ScanAttendanceResultModel result) {
    return AppCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: const BoxDecoration(
              color: Color(0xFFD1FAE5),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.check_circle_rounded,
              size: 52,
              color: AppColors.primary,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Attendance Recorded',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            result.displayStudentName,
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w600,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Reg: ${result.displayRegisterNumber}',
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Attendance Status:',
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              ),
              StatusBadge(status: result.status),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Marked Time:',
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
              ),
              Text(
                result.formattedMarkedAt,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          PrimaryButton(
            text: 'Scan Next Student',
            icon: Icons.qr_code_scanner_rounded,
            onPressed: _scanNextStudent,
          ),
        ],
      ),
    );
  }
}
