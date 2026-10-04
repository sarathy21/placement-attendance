'use client';

import React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlacementDrive, PlacementDriveStatus } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { placementDrivesService } from '@/services/placement-drives.service';
import { showToast } from '@/hooks/use-toast';
import { CheckCircle2, PlayCircle, XCircle, Clock } from 'lucide-react';

export interface PlacementDriveStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  drive: PlacementDrive | null;
  targetStatus: PlacementDriveStatus | null;
}

export function PlacementDriveStatusModal({
  isOpen,
  onClose,
  drive,
  targetStatus,
}: PlacementDriveStatusModalProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      if (!drive || !targetStatus) throw new Error('Invalid drive status target');
      return placementDrivesService.updateStatus(drive.id, targetStatus);
    },
    onSuccess: (updatedDrive) => {
      queryClient.invalidateQueries({ queryKey: ['placement-drives'] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive', updatedDrive.id] });
      showToast(
        'success',
        'Drive Status Updated',
        `Placement drive status for ${updatedDrive.companyName} changed to ${updatedDrive.status}.`
      );
      onClose();
    },
    onError: (err: Error) => {
      showToast('error', 'Status Update Failed', err.message);
    },
  });

  if (!drive || !targetStatus) return null;

  const currentStatus = drive.status;

  const getStatusBadgeVariant = (s: PlacementDriveStatus) => {
    switch (s) {
      case 'UPCOMING':
        return 'sky';
      case 'ONGOING':
        return 'amber';
      case 'COMPLETED':
        return 'emerald';
      case 'CANCELLED':
        return 'rose';
      default:
        return 'default';
    }
  };

  const getIcon = () => {
    switch (targetStatus) {
      case 'UPCOMING':
        return <Clock className="w-8 h-8 text-sky-600 shrink-0" />;
      case 'ONGOING':
        return <PlayCircle className="w-8 h-8 text-amber-600 shrink-0" />;
      case 'COMPLETED':
        return <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />;
      case 'CANCELLED':
        return <XCircle className="w-8 h-8 text-rose-600 shrink-0" />;
    }
  };

  const getButtonVariant = (): 'default' | 'outline' | 'destructive' => {
    switch (targetStatus) {
      case 'COMPLETED':
        return 'default';
      case 'ONGOING':
      case 'UPCOMING':
        return 'outline';
      case 'CANCELLED':
        return 'destructive';
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Set Drive Status to ${targetStatus}`}
      description="Confirm the drive lifecycle status transition."
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          {getIcon()}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">{drive.companyName}</p>
            <p className="text-xs text-slate-500">Venue: {drive.venue}</p>
            <div className="flex items-center gap-2 text-xs pt-1">
              <span className="text-slate-500">Current:</span>
              <Badge variant={getStatusBadgeVariant(currentStatus)}>{currentStatus}</Badge>
              <span className="text-slate-400">→</span>
              <span className="text-slate-500">New:</span>
              <Badge variant={getStatusBadgeVariant(targetStatus)}>{targetStatus}</Badge>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {targetStatus === 'ONGOING' &&
            'Marking a drive as ONGOING indicates active recruitment activity on campus.'}
          {targetStatus === 'COMPLETED' &&
            'Marking a drive as COMPLETED finalizes all recruitment rounds.'}
          {targetStatus === 'CANCELLED' &&
            'Cancelling a drive preserves historical records while marking the drive inactive.'}
          {targetStatus === 'UPCOMING' &&
            'Resetting status to UPCOMING marks the drive as scheduled for a future date.'}
        </p>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={getButtonVariant()}
            isLoading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Confirm Status Update
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
