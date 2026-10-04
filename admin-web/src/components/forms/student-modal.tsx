'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Student, UpdateStudentInput } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { studentsService } from '@/services/students.service';
import { departmentsService } from '@/services/departments.service';
import { coursesService } from '@/services/courses.service';
import { batchesService } from '@/services/batches.service';
import { showToast } from '@/hooks/use-toast';

const updateStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().max(50, 'Last name too long').optional(),
  phoneNumber: z.string().max(20, 'Phone number too long').optional(),
  departmentId: z.string().min(1, 'Department is required'),
  courseId: z.string().min(1, 'Course is required'),
  batchId: z.string().min(1, 'Batch is required'),
  isPlacementEligible: z.boolean(),
});

type StudentFormData = z.infer<typeof updateStudentSchema>;

export interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

export function StudentModal({ isOpen, onClose, student }: StudentModalProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(updateStudentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      departmentId: '',
      courseId: '',
      batchId: '',
      isPlacementEligible: true,
    },
  });

  const selectedDepartmentId = watch('departmentId');
  const selectedCourseId = watch('courseId');

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsService.getAll(),
    enabled: isOpen,
  });

  // Fetch courses dependent on department
  const { data: courses } = useQuery({
    queryKey: ['courses', selectedDepartmentId],
    queryFn: () => coursesService.getAll(selectedDepartmentId || undefined),
    enabled: isOpen && !!selectedDepartmentId,
  });

  // Fetch batches dependent on course
  const { data: batches } = useQuery({
    queryKey: ['batches', selectedCourseId],
    queryFn: () => batchesService.getAll(selectedCourseId || undefined),
    enabled: isOpen && !!selectedCourseId,
  });

  useEffect(() => {
    if (student) {
      reset({
        firstName: student.firstName,
        lastName: student.lastName || '',
        phoneNumber: student.phoneNumber || '',
        departmentId: student.departmentId,
        courseId: student.courseId,
        batchId: student.batchId,
        isPlacementEligible: student.isPlacementEligible,
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

  const batchOptions = (batches || []).map((b) => ({
    value: b.id,
    label: b.name,
  }));

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: UpdateStudentInput }) =>
      studentsService.update(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      showToast('success', 'Student Updated', 'Student profile details updated successfully.');
      onClose();
    },
    onError: (err: Error) => {
      showToast('error', 'Update Failed', err.message);
    },
  });

  const onSubmit = (formData: StudentFormData) => {
    if (!student) return;

    const payload: UpdateStudentInput = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName?.trim() || undefined,
      phoneNumber: formData.phoneNumber?.trim() || undefined,
      departmentId: formData.departmentId,
      courseId: formData.courseId,
      batchId: formData.batchId,
      isPlacementEligible: formData.isPlacementEligible,
    };

    updateMutation.mutate({ id: student.id, data: payload });
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeptId = e.target.value;
    setValue('departmentId', newDeptId);
    setValue('courseId', '');
    setValue('batchId', '');
  };

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCourseId = e.target.value;
    setValue('courseId', newCourseId);
    setValue('batchId', '');
  };

  if (!student) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Placement Student"
      description={`Update profile and academic assignments for ${student.registerNumber}.`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Read-Only Identity Fields */}
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

        {/* Editable Names */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name"
            placeholder="First name"
            disabled={updateMutation.isPending}
            error={errors.firstName?.message}
            {...register('firstName')}
          />

          <Input
            label="Last Name (Optional)"
            placeholder="Last name"
            disabled={updateMutation.isPending}
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        <Input
          label="Phone Number (Optional)"
          placeholder="e.g. +91 9876543210"
          disabled={updateMutation.isPending}
          error={errors.phoneNumber?.message}
          {...register('phoneNumber')}
        />

        {/* Academic Hierarchy Cascade Dropdowns */}
        <div className="space-y-4">
          <Select
            label="Department"
            placeholder="Select Department"
            options={departmentOptions}
            disabled={updateMutation.isPending}
            error={errors.departmentId?.message}
            {...register('departmentId')}
            onChange={handleDepartmentChange}
          />

          <Select
            label="Course"
            placeholder={selectedDepartmentId ? 'Select Course' : 'Select Department first'}
            options={courseOptions}
            disabled={!selectedDepartmentId || updateMutation.isPending}
            error={errors.courseId?.message}
            {...register('courseId')}
            onChange={handleCourseChange}
          />

          <Select
            label="Batch"
            placeholder={selectedCourseId ? 'Select Batch' : 'Select Course first'}
            options={batchOptions}
            disabled={!selectedCourseId || updateMutation.isPending}
            error={errors.batchId?.message}
            {...register('batchId')}
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
              disabled={updateMutation.isPending}
              {...register('isPlacementEligible')}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" isLoading={updateMutation.isPending}>
            Update Student
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
