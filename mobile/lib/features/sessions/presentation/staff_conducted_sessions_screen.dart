import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/widgets.dart';
import 'providers/sessions_provider.dart';
import 'session_detail_screen.dart';

import 'schedule_session_screen.dart';

class StaffConductedSessionsScreen extends ConsumerStatefulWidget {
  const StaffConductedSessionsScreen({super.key});

  @override
  ConsumerState<StaffConductedSessionsScreen> createState() => _StaffConductedSessionsScreenState();
}

class _StaffConductedSessionsScreenState extends ConsumerState<StaffConductedSessionsScreen> {
  String? _selectedFilter; // null = ALL, otherwise 'IN_PROGRESS', 'SCHEDULED', 'COMPLETED', 'CANCELLED'

  final Map<String?, String> _filterLabels = const {
    null: 'ALL',
    'IN_PROGRESS': 'IN PROGRESS',
    'SCHEDULED': 'SCHEDULED',
    'COMPLETED': 'COMPLETED',
    'CANCELLED': 'CANCELLED',
  };

  @override
  Widget build(BuildContext context) {
    final sessionsAsync = ref.watch(staffSessionsListProvider(_selectedFilter));

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Conducted Sessions'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Schedule Session', style: TextStyle(fontWeight: FontWeight.bold)),
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => const ScheduleSessionScreen(),
            ),
          );
        },
      ),
      body: Column(
        children: [
          // Filter Chips Row
          Container(
            color: AppColors.surface,
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _filterLabels.entries.map((entry) {
                  final filterValue = entry.key;
                  final label = entry.value;
                  final isSelected = _selectedFilter == filterValue;

                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: ChoiceChip(
                      label: Text(label),
                      selected: isSelected,
                      selectedColor: AppColors.primaryLight,
                      backgroundColor: AppColors.surfaceVariant,
                      labelStyle: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: isSelected ? AppColors.primaryDark : AppColors.textSecondary,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                        side: BorderSide(
                          color: isSelected ? AppColors.primary : AppColors.border,
                        ),
                      ),
                      onSelected: (selected) {
                        if (selected) {
                          setState(() => _selectedFilter = filterValue);
                        }
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          const Divider(height: 1, color: AppColors.border),

          // Main Sessions List
          Expanded(
            child: sessionsAsync.when(
              loading: () => const LoadingState(message: 'Fetching your conducted sessions...'),
              error: (err, stack) => ErrorState(
                message: 'Failed to load conducted sessions',
                onRetry: () => ref.invalidate(staffSessionsListProvider(_selectedFilter)),
              ),
              data: (sessions) {
                if (sessions.isEmpty) {
                  return RefreshIndicator(
                    onRefresh: () async {
                      ref.invalidate(staffSessionsListProvider(_selectedFilter));
                    },
                    color: AppColors.primary,
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      child: SizedBox(
                        height: MediaQuery.of(context).size.height * 0.5,
                        child: EmptyState(
                          icon: Icons.event_note_outlined,
                          title: 'No Sessions Found',
                          description: _selectedFilter == null
                              ? 'You have not conducted or been assigned to any placement sessions yet.'
                              : 'No sessions matching filter "${_filterLabels[_selectedFilter]}".',
                        ),
                      ),
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(staffSessionsListProvider(_selectedFilter));
                  },
                  color: AppColors.primary,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16.0),
                    itemCount: sessions.length,
                    itemBuilder: (context, index) {
                      final session = sessions[index];
                      return SessionCard(
                        title: session.title,
                        date: session.formattedDate,
                        timeRange: session.formattedTime,
                        venue: session.displayVenue,
                        staffName: session.displayStaff,
                        status: session.displayStatus,
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => SessionDetailScreen(sessionId: session.id),
                            ),
                          );
                        },
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
