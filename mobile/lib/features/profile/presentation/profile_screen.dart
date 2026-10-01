import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
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
      _phoneController.text = authState.profile!['phoneNumber'] ?? '';
      _avatarUrlController.text = authState.profile!['avatarUrl'] ?? '';
    }
  }

  void _saveProfile() async {
    setState(() => _isUpdating = true);

    final success = await ref.read(authNotifierProvider.notifier).updateProfile(
          UpdateProfileDto(
            phoneNumber: _phoneController.text.trim(),
            avatarUrl: _avatarUrlController.text.trim(),
          ),
        );

    if (mounted) {
      setState(() {
        _isUpdating = false;
        _isEditing = false;
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
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
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
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final user = authState.user;
    final profile = authState.profile ?? {};

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              ref.read(authNotifierProvider.notifier).logout();
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CircleAvatar(
              radius: 40,
              backgroundColor: AppColors.primary,
              backgroundImage: (profile['avatarUrl'] != null &&
                      profile['avatarUrl'].toString().isNotEmpty)
                  ? NetworkImage(profile['avatarUrl'])
                  : null,
              child: (profile['avatarUrl'] == null ||
                      profile['avatarUrl'].toString().isEmpty)
                  ? Text(
                      user.email.substring(0, 1).toUpperCase(),
                      style: const TextStyle(
                          fontSize: 32, color: Colors.white, fontWeight: FontWeight.bold),
                    )
                  : null,
            ),
            const SizedBox(height: 16),
            Text(
              user.email,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Text(
              'Role: ${user.role.name.toUpperCase()} (${user.status})',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 32),

            // Read-Only Identity & Academic Info Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Account Information',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const Divider(),
                    if (profile['registerNumber'] != null)
                      ListTile(
                        dense: true,
                        title: const Text('Register Number'),
                        subtitle: Text(profile['registerNumber'].toString()),
                        leading: const Icon(Icons.badge_outlined),
                      ),
                    if (profile['collegeEmail'] != null)
                      ListTile(
                        dense: true,
                        title: const Text('College Email'),
                        subtitle: Text(profile['collegeEmail'].toString()),
                        leading: const Icon(Icons.email_outlined),
                      ),
                    ListTile(
                      dense: true,
                      title: const Text('Account Status'),
                      subtitle: Text(user.status),
                      leading: const Icon(Icons.verified_user_outlined),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Permitted Editable Self-Profile Card (phoneNumber & avatarUrl ONLY)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Editable Contact Info',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        IconButton(
                          icon: Icon(_isEditing ? Icons.close : Icons.edit),
                          onPressed: () {
                            setState(() => _isEditing = !_isEditing);
                          },
                        ),
                      ],
                    ),
                    const Divider(),
                    if (!_isEditing) ...[
                      ListTile(
                        dense: true,
                        title: const Text('Phone Number'),
                        subtitle: Text(profile['phoneNumber'] ?? 'Not set'),
                        leading: const Icon(Icons.phone_outlined),
                      ),
                      ListTile(
                        dense: true,
                        title: const Text('Avatar URL'),
                        subtitle: Text(profile['avatarUrl'] ?? 'Not set'),
                        leading: const Icon(Icons.image_outlined),
                      ),
                    ] else ...[
                      TextFormField(
                        controller: _phoneController,
                        decoration: const InputDecoration(
                          labelText: 'Phone Number',
                          prefixIcon: Icon(Icons.phone_outlined),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _avatarUrlController,
                        decoration: const InputDecoration(
                          labelText: 'Avatar URL',
                          prefixIcon: Icon(Icons.image_outlined),
                        ),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _isUpdating ? null : _saveProfile,
                        child: _isUpdating
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                    color: Colors.white, strokeWidth: 2),
                              )
                            : const Text('SAVE CHANGES'),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Change Password & Actions
            OutlinedButton.icon(
              onPressed: _openChangePassword,
              icon: const Icon(Icons.lock_reset),
              label: const Text('CHANGE PASSWORD'),
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: () {
                ref.read(authNotifierProvider.notifier).logout();
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.statusAbsent),
              icon: const Icon(Icons.logout),
              label: const Text('LOG OUT'),
            ),
          ],
        ),
      ),
    );
  }
}
