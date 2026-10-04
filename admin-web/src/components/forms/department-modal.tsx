'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Department } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsService } from '@/services/departments.service';
import { showToast } from '@/hooks/use-toast';

const departmentSchema = z.object({
  code: z.string().min(1, 'Department code is required').max(20, 'Code too long'),
  name: z.string().min(1, 'Department name is required'),
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

export interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department?: Department | null;
}

export function DepartmentModal({ isOpen, onClose, department }: DepartmentModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!department;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      code: '',
      name: '',
    },
  });

  useEffect(() => {
    if (department) {
      reset({
        code: department.code,
        name: department.name,
      });
    } else {
      reset({
        code: '',
        name: '',
      });
    }
  }, [department, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: DepartmentFormData) => {
      if (isEditing && department) {
        return departmentsService.update(department.id, data);
      }
      return departmentsService.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      showToast(
        'success',
        isEditing ? 'Department Updated' : 'Department Created',
        `Department has been successfully ${isEditing ? 'updated' : 'created'}.`
      );
      onClose();
    },
    onError: (err: Error) => {
      showToast('error', 'Operation Failed', err.message);
    },
  });

  const onSubmit = (data: DepartmentFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Department' : 'Create Department'}
      description={isEditing ? 'Update department code or name.' : 'Add a new academic department.'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Department Code"
          placeholder="e.g. MCA, CSE, ECE"
          error={errors.code?.message}
          {...register('code')}
        />

        <Input
          label="Department Full Name"
          placeholder="e.g. Master of Computer Applications"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditing ? 'Update Department' : 'Create Department'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
