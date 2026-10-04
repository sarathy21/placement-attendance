'use client';

import React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Student } from '@/types';
import { formatDate } from '@/lib/utils';
import { Mail, Shield, Building2, Phone, Calendar, IdCard, GraduationCap, CheckCircle2, XCircle } from 'lucide-react';

export interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

export function StudentDetailModal({ isOpen, onClose, student }: StudentDetailModalProps) {
  if (!student) return null;

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
      title="Placement Student Profile"
      description="Detailed profile view and academic record."
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
            {student.firstName[0]}
            {student.lastName ? student.lastName[0] : ''}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 truncate">
                {student.firstName} {student.lastName || ''}
              </h3>
              <Badge variant={getStatusBadgeVariant(student.status)}>{student.status}</Badge>
              {student.isPlacementEligible ? (
                <Badge variant="emerald" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Eligible</span>
                </Badge>
              ) : (
                <Badge variant="rose" className="gap-1">
                  <XCircle className="w-3 h-3" />
                  <span>Not Eligible</span>
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Reg No: {student.registerNumber}</p>
          </div>
        </div>

        {/* Profile Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
            <IdCard className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Register Number</p>
              <p className="font-bold text-slate-900 font-mono">{student.registerNumber}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
            <Mail className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">College Email</p>
              <p className="font-medium text-slate-900 truncate">{student.collegeEmail}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
            <Building2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</p>
              <p className="font-medium text-slate-900">
                {student.department ? `${student.department.code} - ${student.department.name}` : 'Unassigned'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
            <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Course</p>
              <p className="font-medium text-slate-900">
                {student.course ? `${student.course.code} - ${student.course.name}` : 'Unassigned'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
            <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Academic Batch</p>
              <p className="font-medium text-slate-900">{student.batch?.name || 'Unassigned'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
            <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone Number</p>
              <p className="font-medium text-slate-900">{student.phoneNumber || 'Not Provided'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Role</p>
              <Badge variant="sky">{student.user?.role || 'STUDENT'}</Badge>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-2xs">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Created At</p>
              <p className="font-medium text-slate-700 text-xs">{formatDate(student.createdAt)}</p>
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
