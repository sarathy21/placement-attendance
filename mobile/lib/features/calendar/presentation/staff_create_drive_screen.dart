import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../providers/placement_drives_provider.dart';

class StaffCreateDriveScreen extends ConsumerStatefulWidget {
  const StaffCreateDriveScreen({super.key});

  @override
  ConsumerState<StaffCreateDriveScreen> createState() => _StaffCreateDriveScreenState();
}

class _StaffCreateDriveScreenState extends ConsumerState<StaffCreateDriveScreen> {
  final _formKey = GlobalKey<FormState>();
  final _companyCtrl = TextEditingController();
  final _venueCtrl = TextEditingController();
  final _descCtrl = TextEditingController();

  DateTime _selectedDate = DateTime.now().add(const Duration(days: 7));
  bool _attendanceEnabled = false; // OFF by default as per business rule
  bool _isLoading = false;

  final List<Map<String, dynamic>> _rounds = [];

  @override
  void dispose() {
    _companyCtrl.dispose();
    _venueCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  void _addRound() {
    final nameCtrl = TextEditingController();
    final venueCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Recruitment Round'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Round Name (e.g. Aptitude Test)')),
            const SizedBox(height: 8),
            TextField(controller: venueCtrl, decoration: const InputDecoration(labelText: 'Round Venue (Optional)')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (nameCtrl.text.isNotEmpty) {
                setState(() {
                  _rounds.add({
                    'roundName': nameCtrl.text.trim(),
                    'roundOrder': _rounds.length + 1,
                    if (venueCtrl.text.isNotEmpty) 'venue': venueCtrl.text.trim(),
                  });
                });
                Navigator.pop(context);
              }
            },
            child: const Text('Add Round'),
          ),
        ],
      ),
    );
  }

  void _submit() async {
    if (_formKey.currentState?.validate() ?? false) {
      setState(() => _isLoading = true);

      try {
        final repo = ref.read(placementDrivesRepositoryProvider);
        final dateStr = _selectedDate.toIso8601String().split('T')[0];

        await repo.createDrive(
          companyName: _companyCtrl.text.trim(),
          driveDate: dateStr,
          venue: _venueCtrl.text.trim(),
          description: _descCtrl.text.trim().isNotEmpty ? _descCtrl.text.trim() : null,
          attendanceEnabled: _attendanceEnabled,
          rounds: _rounds.isNotEmpty ? _rounds : null,
        );

        if (mounted) {
          setState(() => _isLoading = false);
          Navigator.pop(context, true);
        }
      } catch (err) {
        if (mounted) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to create drive: $err'),
              backgroundColor: AppColors.statusAbsent,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Create Placement Drive'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _companyCtrl,
                decoration: const InputDecoration(
                  labelText: 'Company Name *',
                  prefixIcon: Icon(Icons.business),
                ),
                validator: (val) => (val == null || val.trim().isEmpty) ? 'Company name is required' : null,
              ),
              const SizedBox(height: 16),

              // Date Picker
              InkWell(
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: _selectedDate,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (picked != null) {
                    setState(() => _selectedDate = picked);
                  }
                },
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Drive Date *',
                    prefixIcon: Icon(Icons.calendar_today),
                  ),
                  child: Text(
                    _selectedDate.toIso8601String().split('T')[0],
                    style: const TextStyle(fontSize: 16),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _venueCtrl,
                decoration: const InputDecoration(
                  labelText: 'Primary Venue *',
                  prefixIcon: Icon(Icons.location_on_outlined),
                ),
                validator: (val) => (val == null || val.trim().isEmpty) ? 'Venue is required' : null,
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _descCtrl,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Overview / Description',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 24),

              // Attendance Tracking Switch (OFF by default)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Attendance Tracking',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                        ),
                        Switch(
                          value: _attendanceEnabled,
                          activeTrackColor: AppColors.primary,
                          onChanged: (val) {
                            setState(() => _attendanceEnabled = val);
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Enable attendance tracking if student attendance will be recorded for this placement drive.',
                      style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Rounds Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Drive Rounds (${_rounds.length})',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  TextButton.icon(
                    onPressed: _addRound,
                    icon: const Icon(Icons.add),
                    label: const Text('Add Round'),
                  ),
                ],
              ),

              if (_rounds.isEmpty)
                const Text(
                  'No rounds added yet. You can add rounds now or later.',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                )
              else
                Column(
                  children: _rounds.map((r) {
                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        dense: true,
                        leading: CircleAvatar(
                          radius: 12,
                          backgroundColor: AppColors.primary,
                          child: Text('${r['roundOrder']}', style: const TextStyle(color: Colors.white, fontSize: 11)),
                        ),
                        title: Text(r['roundName'], style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: r['venue'] != null ? Text('Venue: ${r['venue']}') : null,
                        trailing: IconButton(
                          icon: const Icon(Icons.close, size: 18),
                          onPressed: () {
                            setState(() => _rounds.remove(r));
                          },
                        ),
                      ),
                    );
                  }).toList(),
                ),

              const SizedBox(height: 32),

              ElevatedButton(
                onPressed: _isLoading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Text('CREATE PLACEMENT DRIVE', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
