import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/widgets.dart';
import '../data/models/placement_batch_model.dart';
import 'providers/placement_batches_provider.dart';

class StaffPlacementBatchesScreen extends ConsumerStatefulWidget {
  const StaffPlacementBatchesScreen({super.key});

  @override
  ConsumerState<StaffPlacementBatchesScreen> createState() => _StaffPlacementBatchesScreenState();
}

class _StaffPlacementBatchesScreenState extends ConsumerState<StaffPlacementBatchesScreen> {
  String _searchQuery = '';

  void _refresh() {
    ref.invalidate(placementBatchesListProvider);
  }

  void _showBatchFormModal({PlacementBatchModel? batch}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _BatchFormBottomSheet(
        batch: batch,
        onSuccess: () {
          _refresh();
          Navigator.of(ctx).pop();
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(batch == null ? 'Placement Batch created' : 'Placement Batch updated'),
              backgroundColor: AppColors.statusPresent,
            ),
          );
        },
      ),
    );
  }

  Future<void> _deleteBatch(PlacementBatchModel batch) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Placement Batch'),
        content: Text('Are you sure you want to delete "${batch.name}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppColors.statusAbsent),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final repo = ref.read(placementBatchesRepositoryProvider);
      await repo.deleteBatch(batch.id);
      _refresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Placement batch deleted successfully'),
            backgroundColor: AppColors.statusPresent,
          ),
        );
      }
    } catch (e) {
      String msg = 'Failed to delete batch';
      if (e is DioException && e.response?.data is Map) {
        msg = e.response?.data['message']?.toString() ?? msg;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg),
            backgroundColor: AppColors.statusAbsent,
          ),
        );
      }
    }
  }

  void _showMembersModal(PlacementBatchModel batch) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _BatchMembersBottomSheet(
        batch: batch,
        onMembershipChanged: () {
          _refresh();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final batchesAsync = ref.watch(placementBatchesListProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Placement Batches',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refresh,
            tooltip: 'Refresh',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showBatchFormModal(),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('New Batch', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => _refresh(),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: TextField(
                  onChanged: (val) => setState(() => _searchQuery = val.trim().toLowerCase()),
                  decoration: InputDecoration(
                    hintText: 'Search placement batches...',
                    prefixIcon: const Icon(Icons.search),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey.shade300),
                    ),
                    filled: true,
                    fillColor: Colors.white,
                  ),
                ),
              ),
              Expanded(
                child: batchesAsync.when(
                  loading: () => const LoadingState(message: 'Loading placement batches...'),
                  error: (err, stack) => ErrorState(
                    message: 'Failed to load placement batches',
                    onRetry: _refresh,
                  ),
                  data: (batches) {
                    final filtered = batches.where((b) {
                      if (_searchQuery.isEmpty) return true;
                      return b.name.toLowerCase().contains(_searchQuery) ||
                          (b.description != null && b.description!.toLowerCase().contains(_searchQuery));
                    }).toList();

                    if (filtered.isEmpty) {
                      return EmptyState(
                        icon: Icons.groups_outlined,
                        title: _searchQuery.isEmpty ? 'No Placement Batches' : 'No Batches Found',
                        description: _searchQuery.isEmpty
                            ? 'Tap "+ New Batch" below to create your first placement batch.'
                            : 'No batches match your search query.',
                      );
                    }

                    return ListView.separated(
                      padding: const EdgeInsets.only(left: 16, right: 16, bottom: 80),
                      itemCount: filtered.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (ctx, idx) {
                        final batch = filtered[idx];
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
                                      batch.name,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: AppColors.primaryLight,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      batch.startYear != null && batch.endYear != null
                                          ? '${batch.startYear} - ${batch.endYear}'
                                          : 'Placement Batch',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.primaryDark,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              if (batch.description != null && batch.description!.isNotEmpty) ...[
                                const SizedBox(height: 6),
                                Text(
                                  batch.description!,
                                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Icon(Icons.person_outline, size: 16, color: Colors.grey.shade600),
                                  const SizedBox(width: 4),
                                  Text(
                                    '${batch.studentCount} Students',
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.grey.shade700),
                                  ),
                                  const SizedBox(width: 16),
                                  Icon(Icons.event_note_outlined, size: 16, color: Colors.grey.shade600),
                                  const SizedBox(width: 4),
                                  Text(
                                    '${batch.sessionCount} Sessions',
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.grey.shade700),
                                  ),
                                ],
                              ),
                              const Divider(height: 20),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  TextButton.icon(
                                    onPressed: () => _showMembersModal(batch),
                                    icon: const Icon(Icons.group_add_outlined, size: 18),
                                    label: const Text('Members'),
                                    style: TextButton.styleFrom(foregroundColor: AppColors.primary),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.edit_outlined, size: 20),
                                    onPressed: () => _showBatchFormModal(batch: batch),
                                    tooltip: 'Edit Batch',
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.statusAbsent),
                                    onPressed: () => _deleteBatch(batch),
                                    tooltip: 'Delete Batch',
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BatchFormBottomSheet extends ConsumerStatefulWidget {
  final PlacementBatchModel? batch;
  final VoidCallback onSuccess;

  const _BatchFormBottomSheet({this.batch, required this.onSuccess});

  @override
  ConsumerState<_BatchFormBottomSheet> createState() => _BatchFormBottomSheetState();
}

class _BatchFormBottomSheetState extends ConsumerState<_BatchFormBottomSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameCtrl;
  late final TextEditingController _startYearCtrl;
  late final TextEditingController _endYearCtrl;
  late final TextEditingController _descCtrl;
  bool _submitting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController(text: widget.batch?.name ?? '');
    _startYearCtrl = TextEditingController(text: widget.batch?.startYear?.toString() ?? '');
    _endYearCtrl = TextEditingController(text: widget.batch?.endYear?.toString() ?? '');
    _descCtrl = TextEditingController(text: widget.batch?.description ?? '');
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _startYearCtrl.dispose();
    _endYearCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });

    try {
      final repo = ref.read(placementBatchesRepositoryProvider);
      final start = int.tryParse(_startYearCtrl.text.trim());
      final end = int.tryParse(_endYearCtrl.text.trim());

      if (widget.batch == null) {
        await repo.createBatch(
          name: _nameCtrl.text.trim(),
          startYear: start,
          endYear: end,
          description: _descCtrl.text.trim(),
        );
      } else {
        await repo.updateBatch(
          id: widget.batch!.id,
          name: _nameCtrl.text.trim(),
          startYear: start,
          endYear: end,
          description: _descCtrl.text.trim(),
        );
      }
      widget.onSuccess();
    } catch (e) {
      String msg = 'Failed to save batch';
      if (e is DioException && e.response?.data is Map) {
        msg = e.response?.data['message']?.toString() ?? msg;
      }
      setState(() {
        _errorMessage = msg;
        _submitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.batch != null;
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isEdit ? 'Edit Placement Batch' : 'Create Placement Batch',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            if (_errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_errorMessage!, style: const TextStyle(color: Colors.red, fontSize: 13)),
              ),
              const SizedBox(height: 12),
            ],
            TextFormField(
              controller: _nameCtrl,
              decoration: const InputDecoration(
                labelText: 'Batch Name *',
                hintText: 'e.g. 2024-2026 CS Batch A',
                border: OutlineInputBorder(),
              ),
              validator: (v) => v == null || v.trim().isEmpty ? 'Name is required' : null,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _startYearCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Start Year',
                      hintText: '2024',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _endYearCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'End Year',
                      hintText: '2026',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _descCtrl,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Description',
                hintText: 'Optional description for batch',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: _submitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(isEdit ? 'Save Changes' : 'Create Batch', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BatchMembersBottomSheet extends ConsumerStatefulWidget {
  final PlacementBatchModel batch;
  final VoidCallback onMembershipChanged;

  const _BatchMembersBottomSheet({required this.batch, required this.onMembershipChanged});

  @override
  ConsumerState<_BatchMembersBottomSheet> createState() => _BatchMembersBottomSheetState();
}

class _BatchMembersBottomSheetState extends ConsumerState<_BatchMembersBottomSheet> {
  int _activeTab = 0; // 0: Assigned Members, 1: Add/Transfer Students
  String _candidateSearch = '';

  void _refreshLists() {
    ref.invalidate(batchMembersProvider(widget.batch.id));
    if (_candidateSearch.isNotEmpty) {
      ref.invalidate(searchStudentsProvider(_candidateSearch));
    }
    widget.onMembershipChanged();
  }

  Future<void> _updateStudentBatch(String studentId, String? targetBatchId) async {
    try {
      final repo = ref.read(placementBatchesRepositoryProvider);
      await repo.updateStudentBatch(studentId: studentId, placementBatchId: targetBatchId);
      _refreshLists();
    } catch (e) {
      String msg = 'Failed to update student membership';
      if (e is DioException && e.response?.data is Map) {
        msg = e.response?.data['message']?.toString() ?? msg;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: AppColors.statusAbsent),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final assignedAsync = ref.watch(batchMembersProvider(widget.batch.id));
    final searchAsync = ref.watch(searchStudentsProvider(_candidateSearch));

    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.85,
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.batch.name,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const Text('Manage Student Members', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Tab Controls
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Center(child: Text('Assigned Members')),
                    selected: _activeTab == 0,
                    selectedColor: AppColors.primaryLight,
                    onSelected: (_) => setState(() => _activeTab = 0),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ChoiceChip(
                    label: const Center(child: Text('Add / Move Students')),
                    selected: _activeTab == 1,
                    selectedColor: AppColors.primaryLight,
                    onSelected: (_) => setState(() => _activeTab = 1),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 20),

          // Content Tab 0: Assigned Members
          if (_activeTab == 0)
            Expanded(
              child: assignedAsync.when(
                loading: () => const LoadingState(message: 'Loading batch members...'),
                error: (err, stack) => ErrorState(message: 'Failed to load members', onRetry: _refreshLists),
                data: (students) {
                  if (students.isEmpty) {
                    return const EmptyState(
                      icon: Icons.person_off_outlined,
                      title: 'No Members Assigned',
                      description: 'Switch to "Add / Move Students" tab to add students to this batch.',
                    );
                  }
                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: students.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (ctx, idx) {
                      final s = students[idx];
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(s.fullName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        subtitle: Text('${s.registerNumber} • ${s.collegeEmail}', style: const TextStyle(fontSize: 12)),
                        trailing: TextButton.icon(
                          onPressed: () => _updateStudentBatch(s.id, null),
                          icon: const Icon(Icons.person_remove_outlined, size: 16, color: Colors.red),
                          label: const Text('Remove', style: TextStyle(color: Colors.red, fontSize: 12)),
                        ),
                      );
                    },
                  );
                },
              ),
            ),

          // Content Tab 1: Search & Add / Move
          if (_activeTab == 1)
            Expanded(
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: TextField(
                      onChanged: (v) => setState(() => _candidateSearch = v),
                      decoration: const InputDecoration(
                        hintText: 'Search register no, name, or email...',
                        prefixIcon: Icon(Icons.search),
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Expanded(
                    child: searchAsync.when(
                      loading: () => const LoadingState(message: 'Searching students...'),
                      error: (err, stack) => ErrorState(message: 'Failed to search students', onRetry: _refreshLists),
                      data: (students) {
                        final candidates = students.where((s) => s.placementBatchId != widget.batch.id).toList();
                        if (candidates.isEmpty) {
                          return const EmptyState(
                            icon: Icons.person_search_outlined,
                            title: 'No Matching Students',
                            description: 'Type in search box to find students to add to this batch.',
                          );
                        }
                        return ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: candidates.length,
                          separatorBuilder: (_, _) => const Divider(height: 1),
                          itemBuilder: (ctx, idx) {
                            final s = candidates[idx];
                            final isMoved = s.placementBatchId != null;
                            return ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Row(
                                children: [
                                  Text(s.fullName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                  if (isMoved) ...[
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: Colors.orange.shade50,
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        'Batch: ${s.placementBatchName ?? 'Other'}',
                                        style: TextStyle(fontSize: 10, color: Colors.orange.shade900),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              subtitle: Text('${s.registerNumber} • ${s.collegeEmail}', style: const TextStyle(fontSize: 12)),
                              trailing: ElevatedButton.icon(
                                onPressed: () => _updateStudentBatch(s.id, widget.batch.id),
                                icon: const Icon(Icons.person_add_alt_1_outlined, size: 16, color: Colors.white),
                                label: Text(isMoved ? 'Move Here' : 'Add to Batch', style: const TextStyle(color: Colors.white, fontSize: 12)),
                                style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
