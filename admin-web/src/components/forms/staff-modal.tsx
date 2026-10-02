'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Staff, CreateStaffInput, UpdateStaffInput } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { staffService } from '@/services/staff.service';
import { departmentsService } from '@/services/departments.service';
import { showToast } from '@/hooks/use-toast';

function getStaffFormSchema(isEditing: boolean) {
  return z.object({
    staffId: isEditing
      ? z.string().optional()
      : z.string().min(1, 'Staff ID is required').max(50, 'Staff ID too long'),
    email: isEditing
      ? z.string().optional()
      : z.string().min(1, 'Email is required').email('Invalid email address'),
    password: isEditing
      ? z.string().optional()
      : z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
    lastName: z.string().max(50, 'Last name too long').optional(),
    designation: z.string().max(100, 'Designation too long').optional(),
    phoneNumber: z.string().max(20, 'Phone number too long').optional(),
    departmentId: z.string().optional(),
  });
}

type StaffFormData = z.infer<ReturnType<typeof getStaffFormSchema>>;

export interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff?: Staff | null;
}

export function StaffModal({ isOpen, onClose, staff }: StaffModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!staff;

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsService.getAll(),
    enabled: isOpen,
  });

  const departmentOptions = (departments || []).map((dept) => ({
    value: dept.id,
    label: `${dept.code} - ${dept.name}`,
  }));

  const schema = getStaffFormSchema(isEditing);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StaffFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      staffId: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      designation: '',
      phoneNumber: '',
      departmentId: '',
    },
  });

  useEffect(() => {
    if (staff) {
      reset({
        staffId: staff.staffId,
        email: staff.user?.email || '',
        password: '',
        firstName: staff.firstName,
        lastName: staff.lastName || '',
        designation: staff.designation || '',
        phoneNumber: staff.phoneNumber || '',
        departmentId: staff.departmentId || '',
      });
    } else {
      reset({
        staffId: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        designation: '',
        phoneNumber: '',
        departmentId: '',
      });
    }
  }, [staff, reset, isOpen]);

  const createMutation = useMutation({
    mutationFn: (data: CreateStaffInput) => staffService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      showToast('success', 'Staff Member Created', 'New staff member has been successfully created.');
      onClose();
    },
    onError: (err: Error) => {
      showToast('error', 'Creation Failed', err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: UpdateStaffInput }) =>
      staffService.update(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      showToast('success', 'Staff Member Updated', 'Staff member details have been updated.');
      onClose();
    },
    onError: (err: Error) => {
      showToast('error', 'Update Failed', err.message);
    },
  });

  const onSubmit = (formData: StaffFormData) => {
    const departmentId = formData.departmentId ? formData.departmentId : undefined;
    const lastName = formData.lastName?.trim() || undefined;
    const designation = formData.designation?.trim() || undefined;
    const phoneNumber = formData.phoneNumber?.trim() || undefined;

    if (isEditing && staff) {
      // Intentionally omit staffId, email, and password to prevent 400 forbidden field rejection
      const updateData: UpdateStaffInput = {
        firstName: formData.firstName.trim(),
        lastName,
        designation,
        phoneNumber,
        departmentId,
      };
      updateMutation.mutate({ id: staff.id, data: updateData });
    } else {
      const createData: CreateStaffInput = {
        staffId: (formData.staffId || '').trim(),
        email: (formData.email || '').trim(),
        password: formData.password || '',
        firstName: formData.firstName.trim(),
        lastName,
        designation,
        phoneNumber,
        departmentId,
      };
      createMutation.mutate(createData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Staff Member' : 'Add Staff Member'}
      description={
        isEditing
          ? 'Update staff details and department assignment.'
          : 'Create a new staff member account. Role will default to STAFF.'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Staff ID"
            placeholder="e.g. STF001"
            disabled={isEditing || isSubmitting}
            error={errors.staffId?.message}
            {...register('staffId')}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="e.g. staff@kahe.edu.in"
            disabled={isEditing || isSubmitting}
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        {!isEditing && (
          <Input
            label="Initial Password"
            type="password"
            placeholder="Minimum 8 characters"
            disabled={isSubmitting}
            error={errors.password?.message}
            {...register('password')}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name"
            placeholder="First name"
            disabled={isSubmitting}
            error={errors.firstName?.message}
            {...register('firstName')}
          />

          <Input
            label="Last Name (Optional)"
            placeholder="Last name"
            disabled={isSubmitting}
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Designation (Optional)"
            placeholder="e.g. Assistant Professor"
            disabled={isSubmitting}
            error={errors.designation?.message}
            {...register('designation')}
          />

          <Input
            label="Phone Number (Optional)"
            placeholder="e.g. +91 9876543210"
            disabled={isSubmitting}
            error={errors.phoneNumber?.message}
            {...register('phoneNumber')}
          />
        </div>

        <Select
          label="Department (Optional)"
          placeholder="No Department Assigned"
          options={departmentOptions}
          disabled={isSubmitting}
          error={errors.departmentId?.message}
          {...register('departmentId')}
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Update Staff Member' : 'Create Staff Member'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
