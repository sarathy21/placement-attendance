'use client';

import React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Staff } from '@/types';
import { formatDate } from '@/lib/utils';
import { Mail, Shield, Building2, Phone, Briefcase, Calendar, IdCard } from 'lucide-react';

export interface StaffDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff | null;
}

export function StaffDetailModal({ isOpen, onClose, staff }: StaffDetailModalProps) {
  if (!staff) return null;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
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
      title="Staff Member Profile"
      description="Detailed view of staff account and departmental assignment."
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
            {staff.firstName[0]}
            {staff.lastName ? staff.lastName[0] : ''}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 truncate">
                {staff.firstName} {staff.lastName || ''}
              </h3>
              <Badge variant={getStatusBadgeVariant(staff.user.status)}>{staff.user.status}</Badge>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {staff.staffId}</p>
          </div>
        </div>

        {/* Profile Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
            <IdCard className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff ID</p>
              <p className="font-bold text-slate-900 font-mono">{staff.staffId}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
            <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</p>
              <p className="font-medium text-slate-900 truncate">{staff.user.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
            <Briefcase className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Designation</p>
              <p className="font-medium text-slate-900">{staff.designation || 'Not Specified'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
            <Building2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</p>
              <p className="font-medium text-slate-900">
                {staff.department ? `${staff.department.code} - ${staff.department.name}` : 'Unassigned'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
            <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone Number</p>
              <p className="font-medium text-slate-900">{staff.phoneNumber || 'Not Provided'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Role</p>
              <Badge variant="sky">{staff.user.role}</Badge>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Created</p>
              <p className="font-medium text-slate-700 text-xs">{formatDate(staff.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Updated</p>
              <p className="font-medium text-slate-700 text-xs">{formatDate(staff.updatedAt)}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
