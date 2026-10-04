'use client';

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlacementDrive, DriveRound, PlacementDriveStatus } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { placementDrivesService } from '@/services/placement-drives.service';
import { showToast } from '@/hooks/use-toast';
import {
  Building,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  Link as LinkIcon,
  AlertTriangle,
} from 'lucide-react';
import { PlacementDriveRoundModal } from './placement-drive-round-modal';
import { PlacementDriveStatusModal } from './placement-drive-status-modal';

export interface PlacementDriveDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  driveId: string | null;
  onEditDrive: (drive: PlacementDrive) => void;
}

export function PlacementDriveDetailModal({
  isOpen,
  onClose,
  driveId,
  onEditDrive,
}: PlacementDriveDetailModalProps) {
  const queryClient = useQueryClient();

  const [selectedRound, setSelectedRound] = useState<DriveRound | null>(null);
  const [isRoundModalOpen, setIsRoundModalOpen] = useState(false);
  const [roundToDelete, setRoundToDelete] = useState<DriveRound | null>(null);
  const [targetStatus, setTargetStatus] = useState<PlacementDriveStatus | null>(null);

  const { data: drive, isLoading } = useQuery({
    queryKey: ['placement-drive', driveId],
    queryFn: () => (driveId ? placementDrivesService.getById(driveId) : null),
    enabled: isOpen && !!driveId,
  });

  const deleteRoundMutation = useMutation({
    mutationFn: (roundId: string) => {
      if (!driveId) throw new Error('Missing drive ID');
      return placementDrivesService.deleteRound(driveId, roundId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-drives'] });
      queryClient.invalidateQueries({ queryKey: ['placement-drive', driveId] });
      showToast('success', 'Round Removed', 'Recruitment round deleted successfully.');
      setRoundToDelete(null);
    },
    onError: (err: Error) => {
      showToast('error', 'Failed to Delete Round', err.message);
    },
  });

  if (!isOpen || !driveId) return null;

  const getStatusBadgeVariant = (s?: PlacementDriveStatus) => {
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

  const rounds = (drive?.rounds || []).slice().sort((a, b) => a.roundOrder - b.roundOrder);
  const nextOrder = rounds.length > 0 ? Math.max(...rounds.map((r) => r.roundOrder)) + 1 : 1;

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title={drive ? drive.companyName : 'Loading Placement Drive...'}
        description="Comprehensive placement drive details, recruitment rounds pipeline, and session links."
        maxWidth="xl"
      >
        {isLoading || !drive ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <Clock className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
            <p className="text-sm">Fetching placement drive details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Cards & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                  <Building className="w-4 h-4 text-emerald-600" /> Company Name
                </div>
                <p className="text-sm font-bold text-slate-900">{drive.companyName}</p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                  <Calendar className="w-4 h-4 text-emerald-600" /> Scheduled Date
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {new Date(drive.driveDate).toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                  <MapPin className="w-4 h-4 text-emerald-600" /> Primary Venue
                </div>
                <p className="text-sm font-bold text-slate-900">{drive.venue}</p>
              </div>
            </div>

            {/* Config & Audit Metadata */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 text-white shadow-sm">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Status:</span>
                  <Badge variant={getStatusBadgeVariant(drive.status)}>{drive.status}</Badge>
                </div>

                <div className="h-4 w-[1px] bg-slate-700 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Attendance Verification:</span>
                  {drive.attendanceEnabled ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      ON (Enabled)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-semibold">
                      OFF (Disabled)
                    </span>
                  )}
                </div>

                <div className="h-4 w-[1px] bg-slate-700 hidden sm:block" />

                {drive.createdBy && (
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      Created by {drive.createdBy.firstName} {drive.createdBy.lastName || ''} ({drive.createdBy.staffId})
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white"
                  onClick={() => onEditDrive(drive)}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit Drive
                </Button>

                <select
                  className="h-8 px-2 text-xs rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setTargetStatus(e.target.value as PlacementDriveStatus);
                    }
                  }}
                >
                  <option value="">Change Status...</option>
                  <option value="UPCOMING">UPCOMING</option>
                  <option value="ONGOING">ONGOING</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            {/* Description */}
            {drive.description && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Drive Guidelines & Overview
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {drive.description}
                </p>
              </div>
            )}

            {/* Recruitment Rounds Timeline / Pipeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Recruitment Rounds Pipeline ({rounds.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Selection stages conducted during this campus drive.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedRound(null);
                    setIsRoundModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Round
                </Button>
              </div>

              {rounds.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">No recruitment rounds configured</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Add selection stages such as Online Aptitude Test, Group Discussion, Technical Interview, or HR Interview.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedRound(null);
                      setIsRoundModalOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add First Round
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {rounds.map((round) => (
                    <div
                      key={round.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-200 transition-all shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center shrink-0 border border-emerald-200">
                          #{round.roundOrder}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{round.roundName}</h4>
                            {round.session && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <LinkIcon className="w-3 h-3" /> Linked to Session {round.session.sessionCode}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            {round.date && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {new Date(round.date).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                            {round.venue && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {round.venue}
                              </span>
                            )}
                          </div>
                          {round.description && (
                            <p className="text-xs text-slate-600 pt-1">{round.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRound(round);
                            setIsRoundModalOpen(true);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRoundToDelete(round)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Add / Edit Round Modal */}
      {driveId && (
        <PlacementDriveRoundModal
          isOpen={isRoundModalOpen}
          onClose={() => {
            setIsRoundModalOpen(false);
            setSelectedRound(null);
          }}
          driveId={driveId}
          round={selectedRound}
          nextOrder={nextOrder}
        />
      )}

      {/* Drive Status Modal */}
      {drive && targetStatus && (
        <PlacementDriveStatusModal
          isOpen={!!targetStatus}
          onClose={() => setTargetStatus(null)}
          drive={drive}
          targetStatus={targetStatus}
        />
      )}

      {/* Delete Round Confirmation Modal */}
      {roundToDelete && (
        <Dialog
          isOpen={!!roundToDelete}
          onClose={() => setRoundToDelete(null)}
          title="Delete Recruitment Round"
          description="Are you sure you want to delete this recruitment round?"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
              <AlertTriangle className="w-8 h-8 text-rose-600 shrink-0" />
              <div>
                <p className="text-sm font-bold">
                  Round #{roundToDelete.roundOrder}: {roundToDelete.roundName}
                </p>
                <p className="text-xs text-rose-700 mt-1">
                  This action will remove the round from the placement drive sequence. It will not delete the overall drive or any linked session records.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRoundToDelete(null)}
                disabled={deleteRoundMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                isLoading={deleteRoundMutation.isPending}
                onClick={() => deleteRoundMutation.mutate(roundToDelete.id)}
              >
                Delete Round
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
