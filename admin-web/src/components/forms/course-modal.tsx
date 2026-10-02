'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Course, Department } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesService } from '@/services/courses.service';
import { showToast } from '@/hooks/use-toast';

const courseSchema = z.object({
  code: z.string().min(1, 'Course code is required'),
  name: z.string().min(1, 'Course name is required'),
  departmentId: z.string().min(1, 'Department selection is required'),
});

type CourseFormData = z.infer<typeof courseSchema>;

export interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course?: Course | null;
  departments: Department[];
  defaultDepartmentId?: string;
}

export function CourseModal({
  isOpen,
  onClose,
  course,
  departments,
  defaultDepartmentId = '',
}: CourseModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!course;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      code: '',
      name: '',
      departmentId: defaultDepartmentId,
    },
  });

  useEffect(() => {
    if (course) {
      reset({
        code: course.code,
        name: course.name,
        departmentId: course.departmentId,
      });
    } else {
      reset({
        code: '',
        name: '',
        departmentId: defaultDepartmentId,
      });
    }
  }, [course, defaultDepartmentId, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: CourseFormData) => {
      if (isEditing && course) {
        return coursesService.update(course.id, data);
      }
      return coursesService.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      showToast(
        'success',
        isEditing ? 'Course Updated' : 'Course Created',
        `Course has been successfully ${isEditing ? 'updated' : 'created'}.`
      );
      onClose();
    },
    onError: (err: Error) => {
      showToast('error', 'Operation Failed', err.message);
    },
  });

  const onSubmit = (data: CourseFormData) => {
    mutation.mutate(data);
  };

  const departmentOptions = departments.map((d) => ({
    value: d.id,
    label: `${d.code} - ${d.name}`,
  }));

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Course' : 'Create Course'}
      description={isEditing ? 'Update course details.' : 'Add a new course under a department.'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Department"
          options={departmentOptions}
          placeholder="Select Department"
          error={errors.departmentId?.message}
          {...register('departmentId')}
        />

        <Input
          label="Course Code"
          placeholder="e.g. MCA-FT, BTECH-CSE"
          error={errors.code?.message}
          {...register('code')}
        />

        <Input
          label="Course Full Name"
          placeholder="e.g. Master of Computer Applications (Full Time)"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditing ? 'Update Course' : 'Create Course'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
