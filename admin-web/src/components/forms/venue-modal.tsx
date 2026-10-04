'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Venue } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { venuesService } from '@/services/venues.service';
import { showToast } from '@/hooks/use-toast';

const venueSchema = z.object({
  name: z.string().min(1, 'Venue name is required'),
  building: z.string().optional(),
  capacity: z.number().min(1, 'Capacity must be at least 1').optional(),
});

type VenueFormData = z.infer<typeof venueSchema>;

export interface VenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue?: Venue | null;
}

export function VenueModal({ isOpen, onClose, venue }: VenueModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!venue;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VenueFormData>({
    resolver: zodResolver(venueSchema),
    defaultValues: {
      name: '',
      building: '',
      capacity: undefined,
    },
  });

  useEffect(() => {
    if (venue) {
      reset({
        name: venue.name,
        building: venue.building || '',
        capacity: venue.capacity ?? undefined,
      });
    } else {
      reset({
        name: '',
        building: '',
        capacity: undefined,
      });
    }
  }, [venue, reset, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: VenueFormData) => {
      if (isEditing && venue) {
        return venuesService.update(venue.id, data);
      }
      return venuesService.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] });
      showToast(
        'success',
        isEditing ? 'Venue Updated' : 'Venue Created',
        `Venue has been successfully ${isEditing ? 'updated' : 'created'}.`
      );
      onClose();
    },
    onError: (err: Error) => {
      showToast('error', 'Operation Failed', err.message);
    },
  });

  const onSubmit = (data: VenueFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Venue' : 'Create Campus Venue'}
      description={isEditing ? 'Update venue capacity or location.' : 'Add a new hall, lab, or auditorium venue.'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Venue Name"
          placeholder="e.g. Placement Hall A, Auditorium 1"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Building / Location (Optional)"
          placeholder="e.g. Main Block 2nd Floor, IT Block"
          error={errors.building?.message}
          {...register('building')}
        />

        <Input
          type="number"
          label="Seating Capacity (Optional)"
          placeholder="e.g. 120"
          error={errors.capacity?.message}
          {...register('capacity', {
            setValueAs: (v) => (v === '' || v === undefined || isNaN(v) ? undefined : Number(v)),
          })}
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditing ? 'Update Venue' : 'Create Venue'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
