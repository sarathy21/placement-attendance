'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { placementBatchesService } from '@/services/placement-batches.service';
import { PlacementBatch } from '@/types';
import { PlacementBatchModal } from '@/components/forms/placement-batch-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Plus, Users, Edit2, Trash2, Search } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { showToast } from '@/hooks/use-toast';

export default function PlacementBatchesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<PlacementBatch | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);

  const { data: batches = [], isLoading, isError, error } = useQuery({
    queryKey: ['placement-batches'],
    queryFn: () => placementBatchesService.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => placementBatchesService.delete(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['placement-batches'] });
      showToast('success', 'Placement Batch Deleted', data.message || 'Placement batch deleted successfully.');
      setDeletingBatchId(null);
    },
    onError: (err: Error & { response?: { data?: { message?: string | string[] } } }) => {
      const msg = err.response?.data?.message || err.message || 'Failed to delete placement batch';
      showToast('error', 'Cannot Delete Placement Batch', Array.isArray(msg) ? msg.join(', ') : msg);
      setDeletingBatchId(null);
    },
  });

  const handleCreate = () => {
    setSelectedBatch(null);
    setIsModalOpen(true);
  };

  const handleEdit = (batch: PlacementBatch) => {
    setSelectedBatch(batch);
    setIsModalOpen(true);
  };

  const handleDelete = (batch: PlacementBatch) => {
    if (confirm(`Are you sure you want to delete placement batch '${batch.name}'?`)) {
      setDeletingBatchId(batch.id);
      deleteMutation.mutate(batch.id);
    }
  };

  const filteredBatches = batches.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      b.name.toLowerCase().includes(q) ||
      (b.description && b.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Placement Batches</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage independent placement groupings for universities and training cohorts.
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>Add Placement Batch</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search placement batches..."
              className="pl-9"
            />
          </div>

          <div className="text-xs text-slate-500 ml-auto font-medium">
            Total Batches: <span className="font-bold text-slate-900">{filteredBatches.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Main Table / Data Area */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          Failed to load placement batches: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : filteredBatches.length === 0 ? (
        <EmptyState
          title="No Placement Batches Found"
          description={search ? 'No placement batches match your search.' : 'Get started by creating your first placement batch.'}
          icon={Users}
          actionLabel={search ? undefined : 'Add Placement Batch'}
          onAction={search ? undefined : handleCreate}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Batch Name</th>
                  <th className="px-6 py-3.5">Years</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Students</th>
                  <th className="px-6 py-3.5">Sessions</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <Badge variant="emerald">{batch.name}</Badge>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {batch.startYear && batch.endYear
                        ? `${batch.startYear} – ${batch.endYear}`
                        : batch.startYear || batch.endYear || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs max-w-xs truncate">
                      {batch.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {batch._count?.students ?? 0} students
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {batch._count?.classSessions ?? 0} sessions
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{formatDate(batch.createdAt)}</td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(batch)}
                        className="gap-1.5 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(batch)}
                        isLoading={deletingBatchId === batch.id}
                        className="gap-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create / Edit Modal */}
      <PlacementBatchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        batch={selectedBatch}
      />
    </div>
  );
}
