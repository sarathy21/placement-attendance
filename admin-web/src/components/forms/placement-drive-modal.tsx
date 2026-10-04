'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlacementDrive } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { placementDrivesService } from '@/services/placement-drives.service';
import { venuesService } from '@/services/venues.service';
import { showToast } from '@/hooks/use-toast';

const driveSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  driveDate: z.string().min(1, 'Drive date is required'),
  venue: z.string().min(1, 'Venue is required'),
  description: z.string().optional(),
  attendanceEnabled: z.boolean(),
});

type DriveFormData = z.infer<typeof driveSchema>;

export interface PlacementDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  drive?: PlacementDrive | null;
}

export function PlacementDriveModal({ isOpen, onClose, drive }: PlacementDriveModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!drive;

  const { data: venues = [] } = useQuery({
    queryKey: ['venues'],
    queryFn: () => venuesService.getAll(),
    enabled: isOpen,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DriveFormData>({
    resolver: zodResolver(driveSchema),
    defaultValues: {
      companyName: '',
      driveDate: new Date().toISOString().split('T')[0],
      venue: '',
      description: '',
      attendanceEnabled: false,
    },
  });

  const attendanceEnabledValue = watch('attendanceEnabled');

  useEffect(() => {
    if (drive) {
      const formattedDate = drive.driveDate
        ? new Date(drive.driveDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      reset({
        companyName: drive.companyName,
        driveDate: formattedDate,
        venue: drive.venue,
        description: drive.description || '',
        attendanceEnabled: !!drive.attendanceEnabled,
      });
    } else {
      reset({
        companyName: '',
        driveDate: new Date().toISOString().split('T')[0],
        venue: venues.length > 0 ? venues[0].name : '',
        description: '',
        attendanceEnabled: false,
      });
    }
  }, [drive, reset, isOpen, venues]);

  const mutation = useMutation({
    mutationFn: (data: DriveFormData) => {
      if (isEditing && drive) {
        return placementDrivesService.update(drive.id, data);
      }
      return placementDrivesService.create(data);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['placement-drives'] });
      showToast(
        'success',
        isEditing ? 'Drive Updated' : 'Placement Drive Created',
        `Placement drive for ${res.companyName} has been successfully ${isEditing ? 'updated' : 'scheduled'}.`
      );
      onClose();
    },
    onError: (err: Error) => {
      showToast('error', 'Operation Failed', err.message);
    },
  });

  const onSubmit = (data: DriveFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Placement Drive' : 'Schedule New Placement Drive'}
      description={
        isEditing
          ? 'Update recruiting company details, date, venue, or attendance tracking configuration.'
          : 'Create a new placement recruitment drive for campus candidates.'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Company Name *"
          placeholder="e.g. Tata Consultancy Services, Infosys, Zoho"
          error={errors.companyName?.message}
          {...register('companyName')}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="date"
            label="Drive Date *"
            error={errors.driveDate?.message}
            {...register('driveDate')}
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Venue *</label>
            {venues.length > 0 ? (
              <div className="space-y-2">
                <select
                  className="w-full h-10 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  onChange={(e) => {
                    if (e.target.value) {
                      setValue('venue', e.target.value);
                    }
                  }}
                  value={venues.some((v) => v.name === watch('venue')) ? watch('venue') : ''}
                >
                  <option value="">-- Select Master Venue or Custom --</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.name}>
                      {v.name} {v.building ? `(${v.building})` : ''}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Or enter custom venue name"
                  error={errors.venue?.message}
                  {...register('venue')}
                />
              </div>
            ) : (
              <Input
                placeholder="e.g. Main Auditorium, Placement Hall A"
                error={errors.venue?.message}
                {...register('venue')}
              />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Description / Guidelines (Optional)</label>
          <textarea
            className="w-full min-h-[90px] px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Overview, candidate instructions, dress code, required documents..."
            {...register('description')}
          />
          {errors.description?.message && (
            <p className="text-xs text-rose-500 mt-1">{errors.description.message}</p>
          )}
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
          <input
            type="checkbox"
            id="attendanceEnabled"
            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            checked={attendanceEnabledValue}
            onChange={(e) => setValue('attendanceEnabled', e.target.checked)}
          />
          <label htmlFor="attendanceEnabled" className="text-xs text-slate-700 font-medium cursor-pointer select-none">
            <span className="font-semibold text-slate-900 block text-sm">Enable QR Attendance Tracking</span>
            Allow staff to conduct QR code attendance verification for linked drive sessions (Default is OFF).
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditing ? 'Update Drive' : 'Create Drive'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
