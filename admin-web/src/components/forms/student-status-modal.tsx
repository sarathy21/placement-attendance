'use client';

import React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Student } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsService } from '@/services/students.service';
import { showToast } from '@/hooks/use-toast';
import { CheckCircle, Ban, RefreshCw } from 'lucide-react';

export interface StudentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  targetStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | null;
}

export function StudentStatusModal({ isOpen, onClose, student, targetStatus }: StudentStatusModalProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      if (!student || !targetStatus) throw new Error('Invalid status change target');
      return studentsService.updateStatus(student.id, targetStatus);
    },
    onSuccess: (updatedStudent) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      showToast(
        'success',
        'Status Updated',
        `Student account status for ${updatedStudent.registerNumber} (${updatedStudent.firstName}) has been updated to ${updatedStudent.status}.`
      );
      onClose();
    },
    onError: (err: Error) => {
      showToast('error', 'Status Change Failed', err.message);
    },
  });

  if (!student || !targetStatus) return null;

  const currentStatus = student.status;

  const getActionTitle = () => {
    switch (targetStatus) {
      case 'ACTIVE':
        return currentStatus === 'SUSPENDED' ? 'Reactivate Student Account' : 'Activate Student Account';
      case 'INACTIVE':
        return 'Deactivate Student Account';
      case 'SUSPENDED':
        return 'Suspend Student Account';
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
      description="Please confirm the student account status modification."
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          {getIcon()}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">
              {student.firstName} {student.lastName || ''} ({student.registerNumber})
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
            'Suspended student accounts will be blocked from logging into the mobile application and participating in placement sessions immediately.'}
          {targetStatus === 'INACTIVE' &&
            'Inactive student accounts will remain in reference records but will be excluded from active rosters.'}
          {targetStatus === 'ACTIVE' &&
            'Activating this account will restore mobile application access and placement session eligibility.'}
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
