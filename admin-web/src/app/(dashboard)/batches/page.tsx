'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { batchesService } from '@/services/batches.service';
import { coursesService } from '@/services/courses.service';
import { Batch } from '@/types';
import { BatchModal } from '@/components/forms/batch-modal';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Plus, Users, Edit2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function BatchesPage() {
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => coursesService.getAll(),
  });

  const { data: batches, isLoading, isError, error } = useQuery({
    queryKey: ['batches', selectedCourseId],
    queryFn: () => batchesService.getAll(selectedCourseId || undefined),
  });

  const handleCreate = () => {
    setSelectedBatch(null);
    setIsModalOpen(true);
  };

  const handleEdit = (batch: Batch) => {
    setSelectedBatch(batch);
    setIsModalOpen(true);
  };

  const courseOptions = courses.map((c) => ({
    value: c.id,
    label: `${c.code} - ${c.name}`,
  }));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Academic Batches</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage academic cohort batches, start years, and end years.
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>Add Batch</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="w-full md:w-80">
            <Select
              options={courseOptions}
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              placeholder="All Courses"
            />
          </div>

          <div className="text-xs text-slate-500 ml-auto font-medium">
            Total Batches: <span className="font-bold text-slate-900">{batches?.length ?? 0}</span>
          </div>
        </CardContent>
      </Card>

      {/* Main Table / Data Area */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          Failed to load batches: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : !batches || batches.length === 0 ? (
        <EmptyState
          title="No Batches Found"
          description={selectedCourseId ? 'No batches match your selected course filter.' : 'Get started by creating your first academic cohort batch.'}
          icon={Users}
          actionLabel={selectedCourseId ? undefined : 'Add Batch'}
          onAction={selectedCourseId ? undefined : handleCreate}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Batch Name</th>
                  <th className="px-6 py-3.5">Academic Period</th>
                  <th className="px-6 py-3.5">Course Program</th>
                  <th className="px-6 py-3.5">Enrolled Students</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <Badge variant="amber">{batch.name}</Badge>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      {batch.startYear} – {batch.endYear}
                    </td>
                    <td className="px-6 py-4">
                      {batch.course ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs">{batch.course.code}</span>
                          <span className="text-slate-500 text-xs truncate max-w-xs">{batch.course.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {batch._count?.students ?? 0} students
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{formatDate(batch.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(batch)}
                        className="gap-1.5 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
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
      <BatchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        batch={selectedBatch}
        courses={courses}
        defaultCourseId={selectedCourseId}
      />
    </div>
  );
}
