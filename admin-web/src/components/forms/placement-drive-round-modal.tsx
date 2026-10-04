'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DriveRound } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { placementDrivesService } from '@/services/placement-drives.service';
import { sessionsService } from '@/services/sessions.service';
import { showToast } from '@/hooks/use-toast';

const roundSchema = z.object({
  roundName: z.string().min(1, 'Round name is required'),
  roundOrder: z.number().min(1, 'Round order must be at least 1'),
  date: z.string().optional(),
  venue: z.string().optional(),
  description: z.string().optional(),
  sessionId: z.string().optional(),
});

type RoundFormData = z.infer<typeof roundSchema>;

export interface PlacementDriveRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  driveId: string;
  round?: DriveRound | null;
  nextOrder?: number;
}

export function PlacementDriveRoundModal({
  isOpen,
  onClose,
  driveId,
  round,
  nextOrder = 1,
}: PlacementDriveRoundModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!round;

  const { data: sessionsData } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsService.getAll({ page: 1, limit: 50 }),
    enabled: isOpen,
  });

  const sessions = sessionsData?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoundFormData>({
    resolver: zodResolver(roundSchema),
    defaultValues: {
      roundName: '',
      roundOrder: nextOrder,
      date: '',
      venue: '',
      description: '',
      sessionId: '',
    },
  });

  useEffect(() => {
    if (round) {
      const formattedDate = round.date
        ? new Date(round.date).toISOString().slice(0, 16)
        : '';
      reset({
        roundName: round.roundName,
        roundOrder: round.roundOrder,
        date: formattedDate,
        venue: round.venue || '',
        description: round.description || '',
        sessionId: round.sessionId || '',
      });
    } else {
      reset({
        roundName: '',
        roundOrder: nextOrder,
        date: '',
        venue: '',
        description: '',
        sessionId: '',
      });
    }
  }, [round, nextOrder, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: RoundFormData) => {
      const payload = {
        roundName: data.roundName,
        roundOrder: Number(data.roundOrder),
        date: data.date ? new Date(data.date).toISOString() : undefined,
        venue: data.venue || undefined,
        description: data.description || undefined,
        sessionId: data.sessionId || undefined,
      };

      if (isEditing && round) {
        return placementDrivesService.updateRound(driveId, round.id, payload);
      }
      return placementDrivesService.createRound(driveId, payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['placement-drives'] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive', driveId] });
      showToast(
        'success',
        isEditing ? 'Round Updated' : 'Recruitment Round Added',
        `Round "${res.roundName}" has been successfully ${isEditing ? 'updated' : 'added'}.`
      );
      onClose();
    },
    onError: (err: Error) => {
      showToast('error', 'Operation Failed', err.message);
    },
  });

  const onSubmit = (data: RoundFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Recruitment Round' : 'Add Recruitment Round'}
      description={
        isEditing
          ? 'Modify round sequence, name, schedule, or linked class session.'
          : 'Add a new selection round (e.g. Aptitude Test, Tech Interview, HR).'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Round Name *"
              placeholder="e.g. Aptitude Test, Technical Interview, HR Round"
              error={errors.roundName?.message}
              {...register('roundName')}
            />
          </div>
          <div>
            <Input
              type="number"
              label="Order Number *"
              placeholder="1, 2, 3..."
              error={errors.roundOrder?.message}
              {...register('roundOrder', { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="datetime-local"
            label="Schedule Date & Time (Optional)"
            error={errors.date?.message}
            {...register('date')}
          />

          <Input
            label="Venue (Optional)"
            placeholder="e.g. Lab 302, Conference Room B"
            error={errors.venue?.message}
            {...register('venue')}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Link Attendance Session (Optional)</label>
          <select
            className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            {...register('sessionId')}
          >
            <option value="">-- No Session Linked --</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sessionCode} - {s.topic} ({new Date(s.scheduledDate).toLocaleDateString()}) [{s.status}]
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">
            Linking a ClassSession allows QR attendance records to be attached to this recruitment round.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Description / Criteria (Optional)</label>
          <textarea
            className="w-full min-h-[70px] px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Details, cutoff marks, or instructions for candidates..."
            {...register('description')}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditing ? 'Update Round' : 'Add Round'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
