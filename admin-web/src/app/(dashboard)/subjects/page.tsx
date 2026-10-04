'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subjectsService } from '@/services/subjects.service';
import { Subject } from '@/types';
import { SubjectModal } from '@/components/forms/subject-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Plus, Search, BookOpen, Edit2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function SubjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const { data: subjects, isLoading, isError, error } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsService.getAll(),
  });

  const filteredSubjects = (subjects || []).filter((sub) => {
    const q = searchQuery.toLowerCase();
    return (
      sub.code.toLowerCase().includes(q) ||
      sub.title.toLowerCase().includes(q) ||
      (sub.description && sub.description.toLowerCase().includes(q))
    );
  });

  const handleCreate = () => {
    setSelectedSubject(null);
    setIsModalOpen(true);
  };

  const handleEdit = (sub: Subject) => {
    setSelectedSubject(sub);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Subjects & Training Modules</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage placement training subjects, skill modules, and descriptions.
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>Add Subject</span>
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search by code, title, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="text-xs text-slate-500 ml-auto font-medium">
            Total Modules: <span className="font-bold text-slate-900">{filteredSubjects.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Main Table / Data Area */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          Failed to load subjects: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : filteredSubjects.length === 0 ? (
        <EmptyState
          title="No Subjects Found"
          description={searchQuery ? 'No subjects match your search query.' : 'Get started by creating your first placement training subject/module.'}
          icon={BookOpen}
          actionLabel={searchQuery ? undefined : 'Add Subject'}
          onAction={searchQuery ? undefined : handleCreate}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Subject Code</th>
                  <th className="px-6 py-3.5">Module Title</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Class Sessions</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredSubjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <Badge variant="sky">{sub.code}</Badge>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{sub.title}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs max-w-xs truncate">
                      {sub.description || <span className="text-slate-400 font-normal">No description</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {sub._count?.classSessions ?? 0} sessions
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{formatDate(sub.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(sub)}
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
      <SubjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        subject={selectedSubject}
      />
    </div>
  );
}
