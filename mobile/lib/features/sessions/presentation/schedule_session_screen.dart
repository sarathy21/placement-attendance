import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/errors/failures.dart';
import '../../../core/widgets/widgets.dart';
import '../data/models/create_session_dto.dart';
import 'providers/sessions_provider.dart';

class ScheduleSessionScreen extends ConsumerStatefulWidget {
  final TimeOfDay? initialStartTime;
  final TimeOfDay? initialEndTime;

  const ScheduleSessionScreen({
    super.key,
    this.initialStartTime,
    this.initialEndTime,
  });

  @override
  ConsumerState<ScheduleSessionScreen> createState() => _ScheduleSessionScreenState();
}

class _ScheduleSessionScreenState extends ConsumerState<ScheduleSessionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();

  String? _selectedSubjectId;
  String? _selectedVenueId;
  String? _selectedDepartmentId;
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  late TimeOfDay _startTime = widget.initialStartTime ?? const TimeOfDay(hour: 9, minute: 0);
  late TimeOfDay _endTime = widget.initialEndTime ?? const TimeOfDay(hour: 11, minute: 0);

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: now.subtract(const Duration(days: 1)),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _pickStartTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _startTime,
    );
    if (picked != null) {
      setState(() => _startTime = picked);
    }
  }

  Future<void> _pickEndTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _endTime,
    );
    if (picked != null) {
      setState(() => _endTime = picked);
    }
  }

  bool _isEndTimeValid() {
    final startMinutes = _startTime.hour * 60 + _startTime.minute;
    final endMinutes = _endTime.hour * 60 + _endTime.minute;
    return endMinutes > startMinutes;
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedSubjectId == null) {
      _showErrorSnackBar('Please select a subject');
      return;
    }
    if (_selectedVenueId == null) {
      _showErrorSnackBar('Please select a venue');
      return;
    }
    if (_selectedDepartmentId == null) {
      _showErrorSnackBar('Please select a target department');
      return;
    }

    if (!_isEndTimeValid()) {
      _showErrorSnackBar('End time must be after start time');
      return;
    }

    final dateStr = '${_selectedDate.year.toString().padLeft(4, '0')}-'
        '${_selectedDate.month.toString().padLeft(2, '0')}-'
        '${_selectedDate.day.toString().padLeft(2, '0')}';

    final startDateTime = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _startTime.hour,
      _startTime.minute,
    );

    final endDateTime = DateTime(
      _selectedDate.year,
      _selectedDate.month,
      _selectedDate.day,
      _endTime.hour,
      _endTime.minute,
    );

    final dto = CreateSessionDto(
      title: _titleController.text.trim(),
      subjectId: _selectedSubjectId!,
      venueId: _selectedVenueId!,
      departmentId: _selectedDepartmentId!,
      sessionDate: dateStr,
      startTime: startDateTime.toIso8601String(),
      endTime: endDateTime.toIso8601String(),
    );

    try {
      final result = await ref.read(createSessionNotifierProvider.notifier).createSession(dto);
      if (result != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Session scheduled successfully!'),
            backgroundColor: AppColors.primary,
          ),
        );
        if (Navigator.of(context).canPop()) {
          Navigator.of(context).pop();
        }
      }
    } catch (e) {
      if (!mounted) return;
      String msg = 'Failed to schedule session';
      if (e is Failure) {
        msg = e.message;
      } else {
        msg = e.toString().replaceAll('Exception: ', '');
      }
      _showErrorSnackBar(msg);
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.statusAbsent,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final subjectsAsync = ref.watch(subjectsProvider);
    final venuesAsync = ref.watch(venuesProvider);
    final departmentsAsync = ref.watch(departmentsProvider);
    final createSessionState = ref.watch(createSessionNotifierProvider);
    final isSubmitting = createSessionState.isLoading;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Schedule New Session'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header Card
              const AppCard(
                padding: EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(Icons.event_available_rounded, size: 28, color: AppColors.primary),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Fill in the details below to schedule a new placement training or assessment session.',
                        style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Session Title
              TextFormField(
                controller: _titleController,
                decoration: InputDecoration(
                  labelText: 'Session Title',
                  hintText: 'e.g. Java Collections & Data Structures Mock Test',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) {
                    return 'Session title is required';
                  }
                  if (val.trim().length < 3) {
                    return 'Title must be at least 3 characters long';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Subject Dropdown
              const Text(
                'Subject / Training Module',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 6),
              subjectsAsync.when(
                loading: () => const LoadingState(message: 'Loading subjects...'),
                error: (err, _) => Text('Error loading subjects: $err', style: const TextStyle(color: AppColors.statusAbsent)),
                data: (subjects) {
                  return DropdownButtonFormField<String>(
                    initialValue: _selectedSubjectId,
                    decoration: InputDecoration(
                      hintText: 'Select Subject',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                    ),
                    items: subjects.map((sub) {
                      return DropdownMenuItem<String>(
                        value: sub.id,
                        child: Text(sub.displayTitle, style: const TextStyle(fontSize: 14)),
                      );
                    }).toList(),
                    onChanged: isSubmitting ? null : (val) => setState(() => _selectedSubjectId = val),
                  );
                },
              ),
              const SizedBox(height: 16),

              // Venue Dropdown
              const Text(
                'Venue',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 6),
              venuesAsync.when(
                loading: () => const LoadingState(message: 'Loading venues...'),
                error: (err, _) => Text('Error loading venues: $err', style: const TextStyle(color: AppColors.statusAbsent)),
                data: (venues) {
                  return DropdownButtonFormField<String>(
                    initialValue: _selectedVenueId,
                    decoration: InputDecoration(
                      hintText: 'Select Venue',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                    ),
                    items: venues.map((ven) {
                      return DropdownMenuItem<String>(
                        value: ven.id,
                        child: Text(ven.displayName, style: const TextStyle(fontSize: 14)),
                      );
                    }).toList(),
                    onChanged: isSubmitting ? null : (val) => setState(() => _selectedVenueId = val),
                  );
                },
              ),
              const SizedBox(height: 16),

              // Department Dropdown
              const Text(
                'Target Department',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 6),
              departmentsAsync.when(
                loading: () => const LoadingState(message: 'Loading departments...'),
                error: (err, _) => Text('Error loading departments: $err', style: const TextStyle(color: AppColors.statusAbsent)),
                data: (departments) {
                  return DropdownButtonFormField<String>(
                    initialValue: _selectedDepartmentId,
                    decoration: InputDecoration(
                      hintText: 'Select Department',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                    ),
                    items: departments.map((dept) {
                      return DropdownMenuItem<String>(
                        value: dept.id,
                        child: Text(dept.displayName, style: const TextStyle(fontSize: 14)),
                      );
                    }).toList(),
                    onChanged: isSubmitting ? null : (val) => setState(() => _selectedDepartmentId = val),
                  );
                },
              ),
              const SizedBox(height: 16),

              // Date Picker Field
              const Text(
                'Session Date',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 6),
              InkWell(
                onTap: isSubmitting ? null : _pickDate,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.border),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today_rounded, size: 20, color: AppColors.primary),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          '${_selectedDate.day.toString().padLeft(2, '0')}/${_selectedDate.month.toString().padLeft(2, '0')}/${_selectedDate.year}',
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Time Pickers Row
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Start Time',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 6),
                        InkWell(
                          onTap: isSubmitting ? null : _pickStartTime,
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                            decoration: BoxDecoration(
                              border: Border.all(color: AppColors.border),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.access_time_rounded, size: 18, color: AppColors.primary),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _startTime.format(context),
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'End Time',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 6),
                        InkWell(
                          onTap: isSubmitting ? null : _pickEndTime,
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                            decoration: BoxDecoration(
                              border: Border.all(color: AppColors.border),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.access_time_filled_rounded, size: 18, color: AppColors.primary),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _endTime.format(context),
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),

              // Submit Button
              PrimaryButton(
                text: 'Schedule Session',
                icon: Icons.check_circle_rounded,
                isLoading: isSubmitting,
                onPressed: isSubmitting ? null : _submitForm,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
