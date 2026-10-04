'use client';

import React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Staff } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { staffService } from '@/services/staff.service';
import { showToast } from '@/hooks/use-toast';
import { CheckCircle, Ban, RefreshCw } from 'lucide-react';

export interface StaffStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
  targetStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | null;
}

export function StaffStatusModal({ isOpen, onClose, staff, targetStatus }: StaffStatusModalProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      if (!staff || !targetStatus) throw new Error('Invalid status change target');
      return staffService.updateStatus(staff.id, targetStatus);
    },
    onSuccess: (updatedStaff) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      showToast(
        'success',
        'Status Updated',
        `Staff account status for ${updatedStaff.firstName} ${updatedStaff.lastName || ''} has been changed to ${updatedStaff.user.status}.`
      );
      onClose();
    },
    onError: (err: Error) => {
      showToast('error', 'Status Change Failed', err.message);
    },
  });

  if (!staff || !targetStatus) return null;

  const currentStatus = staff.user.status;

  const getActionTitle = () => {
    switch (targetStatus) {
      case 'ACTIVE':
        return currentStatus === 'SUSPENDED' ? 'Reactivate Staff Member' : 'Activate Staff Member';
      case 'INACTIVE':
        return 'Deactivate Staff Member';
      case 'SUSPENDED':
        return 'Suspend Staff Member';
    }
  };

  const getActionButtonVariant = (): 'default' | 'outline' | 'destructive' => {
    switch (targetStatus) {
      case 'ACTIVE':
        return 'default';
      case 'INACTIVE':
        return 'outline';
      case 'SUSPENDED':
        return 'destructive';
    }
  };

  const getIcon = () => {
    switch (targetStatus) {
      case 'ACTIVE':
        return <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />;
      case 'INACTIVE':
        return <RefreshCw className="w-8 h-8 text-slate-500 shrink-0" />;
      case 'SUSPENDED':
        return <Ban className="w-8 h-8 text-rose-600 shrink-0" />;
    }
  };

  const getStatusBadgeVariant = (s: string) => {
    switch (s) {
      case 'ACTIVE':
        return 'emerald';
      case 'INACTIVE':
        return 'slate';
      case 'SUSPENDED':
        return 'rose';
      default:
        return 'default';
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={getActionTitle()}
      description="Please confirm the account status modification."
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          {getIcon()}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">
              {staff.firstName} {staff.lastName || ''} ({staff.staffId})
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Current status:</span>
              <Badge variant={getStatusBadgeVariant(currentStatus)}>{currentStatus}</Badge>
              <span className="text-slate-400">→</span>
              <span className="text-slate-500">New status:</span>
              <Badge variant={getStatusBadgeVariant(targetStatus)}>{targetStatus}</Badge>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {targetStatus === 'SUSPENDED' &&
            'Suspended staff accounts will be blocked from accessing university systems immediately.'}
          {targetStatus === 'INACTIVE' &&
            'Inactive staff accounts will remain in reference records but will not be active for new assignments.'}
          {targetStatus === 'ACTIVE' &&
            'Activating this account will restore system permissions and access for this staff member.'}
        </p>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={getActionButtonVariant()}
            isLoading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {getActionTitle()}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
