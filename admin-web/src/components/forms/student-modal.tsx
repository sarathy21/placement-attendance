'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Student, CreateStudentInput, UpdateStudentInput } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { studentsService } from '@/services/students.service';
import { departmentsService } from '@/services/departments.service';
import { coursesService } from '@/services/courses.service';
import { placementBatchesService } from '@/services/placement-batches.service';
import { showToast } from '@/hooks/use-toast';

const studentSchema = z.object({
  registerNumber: z.string().min(1, 'Register number is required').max(50, 'Register number too long'),
  collegeEmail: z.string().min(1, 'College email is required').email('Invalid college email address'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().max(50, 'Last name too long').optional(),
  phoneNumber: z.string().max(20, 'Phone number too long').optional(),
  departmentId: z.string().optional(),
  courseId: z.string().optional(),
  placementBatchId: z.string().optional(),
  isPlacementEligible: z.boolean(),
});

type StudentFormData = z.infer<typeof studentSchema>;

export interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

export function StudentModal({ isOpen, onClose, student }: StudentModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!student;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      registerNumber: '',
      collegeEmail: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      departmentId: '',
      courseId: '',
      placementBatchId: '',
      isPlacementEligible: true,
    },
  });

  const selectedDepartmentId = watch('departmentId');

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsService.getAll(),
    enabled: isOpen,
  });

  // Fetch courses dependent on department if department is selected, or all courses
  const { data: courses } = useQuery({
    queryKey: ['courses', selectedDepartmentId],
    queryFn: () => coursesService.getAll(selectedDepartmentId || undefined),
    enabled: isOpen,
  });

  // Fetch independent Placement Batches
  const { data: placementBatches } = useQuery({
    queryKey: ['placement-batches'],
    queryFn: () => placementBatchesService.getAll(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (student) {
      reset({
        registerNumber: student.registerNumber,
        collegeEmail: student.collegeEmail,
        firstName: student.firstName,
        lastName: student.lastName || '',
        phoneNumber: student.phoneNumber || '',
        departmentId: student.departmentId || '',
        courseId: student.courseId || '',
        placementBatchId: student.placementBatchId || '',
        isPlacementEligible: student.isPlacementEligible,
      });
    } else {
      reset({
        registerNumber: '',
        collegeEmail: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        departmentId: '',
        courseId: '',
        placementBatchId: '',
        isPlacementEligible: true,
      });
    }
  }, [student, reset, isOpen]);

  const departmentOptions = (departments || []).map((d) => ({
    value: d.id,
    label: `${d.code} - ${d.name}`,
  }));

  const courseOptions = (courses || []).map((c) => ({
    value: c.id,
    label: `${c.code} - ${c.name}`,
  }));

  const placementBatchOptions = (placementBatches || []).map((b) => ({
    value: b.id,
    label: b.name,
  }));

  const createMutation = useMutation({
    mutationFn: (data: CreateStudentInput) => studentsService.create(data),
    onSuccess: (newStudent) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      showToast('success', 'Student Created', `Student ${newStudent.registerNumber} created successfully.`);
      onClose();
    },
    onError: (err: Error & { response?: { data?: { message?: string | string[] } } }) => {
      const msg = err.response?.data?.message || err.message || 'Creation failed';
      showToast('error', 'Creation Failed', Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: UpdateStudentInput }) =>
      studentsService.update(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      showToast('success', 'Student Updated', 'Student profile details updated successfully.');
      onClose();
    },
    onError: (err: Error & { response?: { data?: { message?: string | string[] } } }) => {
      const msg = err.response?.data?.message || err.message || 'Update failed';
      showToast('error', 'Update Failed', Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (formData: StudentFormData) => {
    if (isEdit && student) {
      const payload: UpdateStudentInput = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName?.trim() || undefined,
        phoneNumber: formData.phoneNumber?.trim() || undefined,
        departmentId: formData.departmentId || undefined,
        courseId: formData.courseId || undefined,
        placementBatchId: formData.placementBatchId || undefined,
        isPlacementEligible: formData.isPlacementEligible,
      };
      updateMutation.mutate({ id: student.id, data: payload });
    } else {
      const payload: CreateStudentInput = {
        registerNumber: formData.registerNumber.trim().toUpperCase(),
        collegeEmail: formData.collegeEmail.trim().toLowerCase(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName?.trim() || undefined,
        phoneNumber: formData.phoneNumber?.trim() || undefined,
        departmentId: formData.departmentId || undefined,
        courseId: formData.courseId || undefined,
        placementBatchId: formData.placementBatchId || undefined,
        isPlacementEligible: formData.isPlacementEligible,
      };
      createMutation.mutate(payload);
    }
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeptId = e.target.value;
    setValue('departmentId', newDeptId);
    setValue('courseId', '');
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Placement Student' : 'Add Placement Student'}
      description={
        isEdit
          ? `Update profile and academic/placement details for ${student?.registerNumber}.`
          : 'Manually onboard a single placement student with academic and placement details.'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Identity Fields */}
        {isEdit ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Register Number (Immutable)
              </label>
              <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{student.registerNumber}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                College Email (Immutable)
              </label>
              <p className="font-medium text-slate-900 text-xs truncate mt-0.5">{student.collegeEmail}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Register Number *"
              placeholder="e.g. 25CAP109"
              disabled={isLoading}
              error={errors.registerNumber?.message}
              {...register('registerNumber')}
            />

            <Input
              label="College Email *"
              type="email"
              placeholder="e.g. student@kahedu.edu.in"
              disabled={isLoading}
              error={errors.collegeEmail?.message}
              {...register('collegeEmail')}
            />
          </div>
        )}

        {/* Editable Names */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name *"
            placeholder="First name"
            disabled={isLoading}
            error={errors.firstName?.message}
            {...register('firstName')}
          />

          <Input
            label="Last Name (Optional)"
            placeholder="Last name"
            disabled={isLoading}
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        <Input
          label="Phone Number (Optional)"
          placeholder="e.g. +91 9876543210"
          disabled={isLoading}
          error={errors.phoneNumber?.message}
          {...register('phoneNumber')}
        />

        {/* Academic & Placement Dropdowns */}
        <div className="space-y-4">
          <Select
            label="Department (Optional)"
            placeholder="Select Department (Optional)"
            options={departmentOptions}
            disabled={isLoading}
            error={errors.departmentId?.message}
            {...register('departmentId')}
            onChange={handleDepartmentChange}
          />

          <Select
            label="Course (Optional)"
            placeholder="Select Course (Optional)"
            options={courseOptions}
            disabled={isLoading}
            error={errors.courseId?.message}
            {...register('courseId')}
          />

          <Select
            label="Placement Batch (Optional)"
            placeholder="Select Placement Batch (Optional)"
            options={placementBatchOptions}
            disabled={isLoading}
            error={errors.placementBatchId?.message}
            {...register('placementBatchId')}
          />
        </div>

        {/* Placement Eligibility Toggle */}
        <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Placement Drive Eligibility
            </span>
            <p className="text-xs text-slate-500">
              Eligible students can participate in upcoming placement drives and sessions.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              disabled={isLoading}
              {...register('isPlacementEligible')}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {isEdit ? 'Update Student' : 'Create Student'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
