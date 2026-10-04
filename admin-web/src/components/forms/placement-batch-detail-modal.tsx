'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlacementBatch } from '@/types';
import { studentsService } from '@/services/students.service';
import { showToast } from '@/hooks/use-toast';
import { Search, UserPlus, UserMinus, GraduationCap, RefreshCw } from 'lucide-react';

export interface PlacementBatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: PlacementBatch | null;
}

export function PlacementBatchDetailModal({
  isOpen,
  onClose,
  batch,
}: PlacementBatchDetailModalProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'ADD'>('MEMBERS');

  // Query assigned students for this placement batch
  const { data: assignedData, isLoading: loadingAssigned, refetch: refetchAssigned } = useQuery({
    queryKey: ['students', 'batch', batch?.id],
    queryFn: () => studentsService.getAll({ placementBatchId: batch!.id, limit: 100 }),
    enabled: isOpen && !!batch,
  });

  // Query candidate students for adding to batch (search or all)
  const { data: candidateData, isLoading: loadingCandidates, refetch: refetchCandidates } = useQuery({
    queryKey: ['students', 'search-candidates', search],
    queryFn: () => studentsService.getAll({ search: search.trim() || undefined, limit: 50 }),
    enabled: isOpen && !!batch && activeTab === 'ADD',
  });

  const assignMutation = useMutation({
    mutationFn: (payload: { studentId: string; batchId: string | null }) =>
      studentsService.update(payload.studentId, { placementBatchId: payload.batchId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['placement-batches'] });
      refetchAssigned();
      refetchCandidates();
      showToast(
        'success',
        variables.batchId ? 'Student Assigned' : 'Student Removed',
        variables.batchId
          ? 'Student successfully assigned to placement batch.'
          : 'Student removed from placement batch.'
      );
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) => {
      const msg = err.response?.data?.message || err.message || 'Operation failed';
      showToast('error', 'Assignment Failed', msg);
    },
  });

  if (!batch) return null;

  const assignedStudents = assignedData?.data || [];
  const candidateStudents = (candidateData?.data || []).filter(
    (s) => s.placementBatchId !== batch.id
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Placement Group: ${batch.name}`}
      description={
        batch.description ||
        `Manage student cohort membership for ${batch.name} (${batch.startYear || ''} - ${batch.endYear || ''}).`
      }
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Sub-header tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={activeTab === 'MEMBERS' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('MEMBERS')}
              className="gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Assigned Members ({assignedStudents.length})</span>
            </Button>

            <Button
              type="button"
              variant={activeTab === 'ADD' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('ADD')}
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add / Transfer Students</span>
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              refetchAssigned();
              refetchCandidates();
            }}
            className="text-slate-500 hover:text-slate-900"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Tab 1: Current Assigned Members */}
        {activeTab === 'MEMBERS' && (
          <div className="space-y-3">
            {loadingAssigned ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading batch members...</div>
            ) : assignedStudents.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <GraduationCap className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No Students in this Batch</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Click &apos;Add / Transfer Students&apos; above to assign existing placement students to this group.
                </p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                {assignedStudents.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-white flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="emerald" className="font-mono text-[10px]">
                          {s.registerNumber}
                        </Badge>
                        <span className="font-semibold text-slate-900 text-sm">
                          {s.firstName} {s.lastName || ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {s.collegeEmail} {s.department ? `• ${s.department.code}` : ''}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => assignMutation.mutate({ studentId: s.id, batchId: null })}
                      isLoading={assignMutation.isPending}
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200 text-xs gap-1"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Add / Assign Candidates */}
        {activeTab === 'ADD' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Search register no, name, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {loadingCandidates ? (
              <div className="p-8 text-center text-xs text-slate-500">Searching students...</div>
            ) : candidateStudents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                {search ? 'No matching unassigned students found.' : 'Search for students above to assign them.'}
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                {candidateStudents.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 bg-white flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="slate" className="font-mono text-[10px]">
                          {s.registerNumber}
                        </Badge>
                        <span className="font-semibold text-slate-900 text-sm">
                          {s.firstName} {s.lastName || ''}
                        </span>
                        {s.placementBatch && (
                          <Badge variant="amber" className="text-[10px]">
                            Currently: {s.placementBatch.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {s.collegeEmail} {s.department ? `• ${s.department.code}` : ''}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => assignMutation.mutate({ studentId: s.id, batchId: batch.id })}
                      isLoading={assignMutation.isPending}
                      className="text-emerald-700 hover:bg-emerald-50 border-emerald-300 text-xs gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{s.placementBatch ? 'Move Here' : 'Add to Batch'}</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
