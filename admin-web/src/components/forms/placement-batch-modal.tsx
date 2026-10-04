'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlacementBatch } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { placementBatchesService } from '@/services/placement-batches.service';
import { showToast } from '@/hooks/use-toast';

const placementBatchSchema = z.object({
  name: z.string().min(1, 'Placement batch name is required'),
  startYear: z.preprocess((val) => (val === '' || val === undefined || val === null || (typeof val === 'number' && isNaN(val)) ? undefined : Number(val)), z.number().min(2000, 'Year must be 2000 or later').optional()),
  endYear: z.preprocess((val) => (val === '' || val === undefined || val === null || (typeof val === 'number' && isNaN(val)) ? undefined : Number(val)), z.number().min(2000, 'Year must be 2000 or later').optional()),
  description: z.string().optional(),
});

type PlacementBatchFormInput = z.input<typeof placementBatchSchema>;
type PlacementBatchFormData = z.output<typeof placementBatchSchema>;

export interface PlacementBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch?: PlacementBatch | null;
}

export function PlacementBatchModal({
  isOpen,
  onClose,
  batch,
}: PlacementBatchModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!batch;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PlacementBatchFormInput, unknown, PlacementBatchFormData>({
    resolver: zodResolver(placementBatchSchema),
    defaultValues: {
      name: '',
      startYear: undefined,
      endYear: undefined,
      description: '',
    },
  });

  useEffect(() => {
    if (batch) {
      reset({
        name: batch.name,
        startYear: batch.startYear ?? undefined,
        endYear: batch.endYear ?? undefined,
        description: batch.description ?? '',
      });
    } else {
      reset({
        name: '',
        startYear: undefined,
        endYear: undefined,
        description: '',
      });
    }
  }, [batch, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: PlacementBatchFormData) => {
      if (isEditing && batch) {
        return placementBatchesService.update(batch.id, data);
      }
      return placementBatchesService.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-batches'] });
      showToast(
        'success',
        isEditing ? 'Placement Batch Updated' : 'Placement Batch Created',
        `Placement Batch has been successfully ${isEditing ? 'updated' : 'created'}.`
      );
      onClose();
    },
    onError: (err: Error & { response?: { data?: { message?: string | string[] } } }) => {
      const msg = err.response?.data?.message || err.message || 'Failed to save placement batch';
      showToast('error', 'Operation Failed', Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const onSubmit = (data: PlacementBatchFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Placement Batch' : 'Create Placement Batch'}
      description={isEditing ? 'Update placement batch details.' : 'Add an independent placement batch for student grouping.'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Placement Batch Name *"
          placeholder="e.g. TCS-Prime-2026, FastTrack-A"
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            label="Start Year (Optional)"
            placeholder="e.g. 2026"
            error={errors.startYear?.message}
            {...register('startYear')}
          />

          <Input
            type="number"
            label="End Year (Optional)"
            placeholder="e.g. 2026"
            error={errors.endYear?.message}
            {...register('endYear')}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            rows={3}
            placeholder="e.g. TCS Prime eligible students across all engineering branches"
            {...register('description')}
          />
          {errors.description && (
            <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditing ? 'Update Placement Batch' : 'Create Placement Batch'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
