'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Staff } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { staffService } from '@/services/staff.service';
import { showToast } from '@/hooks/use-toast';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export interface ResetStaffPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
}

export function ResetStaffPasswordModal({ isOpen, onClose, staff }: ResetStaffPasswordModalProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        password: '',
        confirmPassword: '',
      });
    }
  }, [isOpen, reset]);

  const mutation = useMutation({
    mutationFn: (password: string) => {
      if (!staff) throw new Error('No staff member selected');
      return staffService.resetPassword(staff.id, password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      showToast('success', 'Password Reset Successful', 'Staff account password has been updated.');
      reset();
      onClose();
    },
    onError: (err: Error) => {
      showToast('error', 'Password Reset Failed', err.message);
    },
  });

  const onSubmit = (data: ResetPasswordFormData) => {
    mutation.mutate(data.password);
  };

  if (!staff) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Reset Staff Password"
      description={`Set a new password for ${staff.firstName} ${staff.lastName || ''} (${staff.staffId}).`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="New Password"
          type="password"
          placeholder="Minimum 8 characters"
          disabled={mutation.isPending}
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="Confirm New Password"
          type="password"
          placeholder="Re-enter new password"
          disabled={mutation.isPending}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending} variant="default">
            Reset Password
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
