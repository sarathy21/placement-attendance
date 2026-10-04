import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/widgets.dart';
import '../../auth/domain/auth_state.dart';
import '../../auth/providers/auth_provider.dart';
import 'change_password_modal.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _phoneController = TextEditingController();
  final _avatarUrlController = TextEditingController();
  bool _isEditing = false;
  bool _isUpdating = false;

  @override
  void initState() {
    super.initState();
    _initControllers();
  }

  void _initControllers() {
    final authState = ref.read(authNotifierProvider);
    if (authState is Authenticated && authState.profile != null) {
      _phoneController.text = authState.profile!['phoneNumber']?.toString() ?? '';
      _avatarUrlController.text = authState.profile!['avatarUrl']?.toString() ?? '';
    }
  }

  void _toggleEdit() {
    setState(() {
      if (_isEditing) {
        // Discard local changes on cancel
        _initControllers();
        _isEditing = false;
      } else {
        _initControllers();
        _isEditing = true;
      }
    });
  }

  void _saveProfile() async {
    final phone = _phoneController.text.trim();
    final avatar = _avatarUrlController.text.trim();

    final phoneRegex = RegExp(r'^[0-9]{10}$');
    if (phone.isNotEmpty && !phoneRegex.hasMatch(phone)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Phone number must be strictly a 10-digit number format (e.g. 9876543210)'),
          backgroundColor: AppColors.statusAbsent,
        ),
      );
      return;
    }

    setState(() => _isUpdating = true);

    final success = await ref.read(authNotifierProvider.notifier).updateProfile(
          UpdateProfileDto(
            phoneNumber: phone,
            avatarUrl: avatar,
          ),
        );

    if (mounted) {
      setState(() {
        _isUpdating = false;
        if (success) {
          _isEditing = false;
        }
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success ? 'Profile updated successfully' : 'Failed to update profile',
          ),
          backgroundColor: success ? AppColors.statusPresent : AppColors.statusAbsent,
        ),
      );
    }
  }

  void _openChangePassword() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => const ChangePasswordModal(),
    );
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _avatarUrlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);

    if (authState is! Authenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('My Profile')),
        body: const LoadingState(message: 'Loading profile...'),
      );
    }

    final user = authState.user;
    final profile = authState.profile ?? {};

    final firstName = user.firstName ?? profile['firstName'] ?? '';
    final lastName = user.lastName ?? profile['lastName'] ?? '';
    final fullName = firstName.isNotEmpty ? '$firstName $lastName'.trim() : user.email;

    final isStudent = user.role == UserRole.student;
    final isEligible = profile['isPlacementEligible'] ?? true;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Profile'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'Logout',
            onPressed: () {
              ref.read(authNotifierProvider.notifier).logout();
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(18.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Profile Header Card
            ProfileHeader(
              name: fullName,
              subtitle: '${user.email}\nRole: ${user.role.name.toUpperCase()} • ${user.status}',
              avatarUrl: profile['avatarUrl']?.toString(),
            ),
            const SizedBox(height: 20),

            // Read-Only Academic & Identity Info Card
            const SectionHeader(title: 'Account Identity (Read-Only)'),
            const SizedBox(height: 8),
            AppCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _buildReadOnlyRow(
                    icon: Icons.badge_outlined,
                    label: 'Register Number',
                    value: profile['registerNumber']?.toString() ?? 'N/A',
                  ),
                  const Divider(height: 20),
                  _buildReadOnlyRow(
                    icon: Icons.email_outlined,
                    label: 'College Email',
                    value: profile['collegeEmail']?.toString() ?? user.email,
                  ),
                  const Divider(height: 20),
                  _buildReadOnlyRow(
                    icon: Icons.school_outlined,
                    label: 'Department',
                    value: profile['department']?['name']?.toString() ??
                        profile['departmentId']?.toString() ??
                        'Department of Computer Applications',
                  ),
                  if (profile['course'] != null || profile['courseId'] != null) ...[
                    const Divider(height: 20),
                    _buildReadOnlyRow(
                      icon: Icons.book_outlined,
                      label: 'Course',
                      value: profile['course']?['name']?.toString() ?? profile['courseId']?.toString() ?? 'MCA',
                    ),
                  ],
                  if (profile['placementBatch'] != null || profile['placementBatchId'] != null || profile['batch'] != null || profile['batchId'] != null) ...[
                    const Divider(height: 20),
                    _buildReadOnlyRow(
                      icon: Icons.group_outlined,
                      label: 'Placement Batch',
                      value: profile['placementBatch']?['name']?.toString() ??
                          profile['batch']?['name']?.toString() ??
                          profile['placementBatchId']?.toString() ??
                          profile['batchId']?.toString() ??
                          'N/A',
                    ),
                  ],
                  if (isStudent) ...[
                    const Divider(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.verified_user_outlined, size: 18, color: AppColors.textSecondary),
                            SizedBox(width: 10),
                            Text(
                              'Placement Status',
                              style: TextStyle(fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                        StatusBadge(status: isEligible ? 'ELIGIBLE' : 'INELIGIBLE'),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Permitted Editable Section (Phone Number & Avatar URL ONLY)
            SectionHeader(
              title: 'Editable Contact Info',
              actionLabel: _isEditing ? 'Cancel' : 'Edit',
              onAction: _toggleEdit,
            ),
            const SizedBox(height: 8),
            AppCard(
              padding: const EdgeInsets.all(16),
              child: !_isEditing
                  ? Column(
                      children: [
                        _buildReadOnlyRow(
                          icon: Icons.phone_outlined,
                          label: 'Phone Number',
                          value: (profile['phoneNumber'] != null && profile['phoneNumber'].toString().isNotEmpty)
                              ? profile['phoneNumber'].toString()
                              : 'Not provided',
                        ),
                        const Divider(height: 20),
                        _buildReadOnlyRow(
                          icon: Icons.image_outlined,
                          label: 'Avatar URL',
                          value: (profile['avatarUrl'] != null && profile['avatarUrl'].toString().isNotEmpty)
                              ? profile['avatarUrl'].toString()
                              : 'Not provided',
                        ),
                      ],
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextFormField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(
                            labelText: 'Phone Number',
                            prefixIcon: Icon(Icons.phone_outlined),
                          ),
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _avatarUrlController,
                          decoration: const InputDecoration(
                            labelText: 'Avatar URL',
                            prefixIcon: Icon(Icons.image_outlined),
                          ),
                        ),
                        const SizedBox(height: 18),
                        PrimaryButton(
                          text: 'SAVE CHANGES',
                          isLoading: _isUpdating,
                          onPressed: _isUpdating ? null : _saveProfile,
                        ),
                      ],
                    ),
            ),
            const SizedBox(height: 24),

            // Security Actions Section
            const SectionHeader(title: 'Account Security'),
            const SizedBox(height: 8),
            SecondaryButton(
              text: 'CHANGE PASSWORD',
              icon: Icons.lock_reset_rounded,
              onPressed: _openChangePassword,
            ),
            const SizedBox(height: 12),
            PrimaryButton(
              text: 'LOG OUT',
              icon: Icons.logout_rounded,
              onPressed: () {
                ref.read(authNotifierProvider.notifier).logout();
              },
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildReadOnlyRow({required IconData icon, required String label, required String value}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppColors.textSecondary),
        const SizedBox(width: 10),
        SizedBox(
          width: 120,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
            textAlign: TextAlign.end,
          ),
        ),
      ],
    );
  }
}
