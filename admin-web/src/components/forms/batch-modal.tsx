'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Batch, Course } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { batchesService } from '@/services/batches.service';
import { showToast } from '@/hooks/use-toast';

const batchSchema = z.object({
  name: z.string().min(1, 'Batch name is required'),
  startYear: z.coerce.number().min(2000, 'Start year must be 2000 or later'),
  endYear: z.coerce.number().min(2000, 'End year must be 2000 or later'),
  courseId: z.string().min(1, 'Course selection is required'),
});

type BatchFormData = z.infer<typeof batchSchema>;

export interface BatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch?: Batch | null;
  courses: Course[];
  defaultCourseId?: string;
}

export function BatchModal({
  isOpen,
  onClose,
  batch,
  courses,
  defaultCourseId = '',
}: BatchModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!batch;

  const currentYear = new Date().getFullYear();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      name: `${currentYear}-${currentYear + 2}`,
      startYear: currentYear,
      endYear: currentYear + 2,
      courseId: defaultCourseId,
    },
  });

  useEffect(() => {
    if (batch) {
      reset({
        name: batch.name,
        startYear: batch.startYear,
        endYear: batch.endYear,
        courseId: batch.courseId,
      });
    } else {
      reset({
        name: `${currentYear}-${currentYear + 2}`,
        startYear: currentYear,
        endYear: currentYear + 2,
        courseId: defaultCourseId,
      });
    }
  }, [batch, defaultCourseId, currentYear, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: BatchFormData) => {
      if (isEditing && batch) {
        return batchesService.update(batch.id, data);
      }
      return batchesService.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      showToast(
        'success',
        isEditing ? 'Batch Updated' : 'Batch Created',
        `Batch has been successfully ${isEditing ? 'updated' : 'created'}.`
      );
      onClose();
    },
    onError: (err: Error) => {
      showToast('error', 'Operation Failed', err.message);
    },
  });

  const onSubmit = (data: BatchFormData) => {
    mutation.mutate(data);
  };

  const courseOptions = courses.map((c) => ({
    value: c.id,
    label: `${c.code} - ${c.name}`,
  }));

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Batch' : 'Create Academic Batch'}
      description={isEditing ? 'Update batch academic years.' : 'Add a new academic batch for a course.'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Course"
          options={courseOptions}
          placeholder="Select Course"
          error={errors.courseId?.message}
          {...register('courseId')}
        />

        <Input
          label="Batch Name"
          placeholder="e.g. 2023-2025"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            label="Start Year"
            placeholder="e.g. 2023"
            error={errors.startYear?.message}
            {...register('startYear')}
          />

          <Input
            type="number"
            label="End Year"
            placeholder="e.g. 2025"
            error={errors.endYear?.message}
            {...register('endYear')}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditing ? 'Update Batch' : 'Create Batch'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
