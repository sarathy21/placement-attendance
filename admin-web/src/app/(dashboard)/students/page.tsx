'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsService } from '@/services/students.service';
import { departmentsService } from '@/services/departments.service';
import { coursesService } from '@/services/courses.service';
import { placementBatchesService } from '@/services/placement-batches.service';
import { Student, GetStudentsFilterParams } from '@/types';
import { StudentModal } from '@/components/forms/student-modal';
import { StudentDetailModal } from '@/components/forms/student-detail-modal';
import { StudentStatusModal } from '@/components/forms/student-status-modal';
import { StudentImportModal } from '@/components/forms/student-import-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useDebounce } from '@/hooks/use-debounce';
import { showToast } from '@/hooks/use-toast';
import {
  Upload,
  Search,
  GraduationCap,
  Edit2,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Ban,
  CheckCircle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Plus,
} from 'lucide-react';

export default function StudentsPage() {
  const queryClient = useQueryClient();

  // Filtering & Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');

  const [departmentFilter, setDepartmentFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [placementBatchFilter, setPlacementBatchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState<string>(''); // '', 'true', 'false'

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStudentForStatus, setSelectedStudentForStatus] = useState<Student | null>(null);
  const [targetStatus, setTargetStatus] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Filter Handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDepartmentFilter(e.target.value);
    setCourseFilter('');
    setPage(1);
  };

  const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCourseFilter(e.target.value);
    setPage(1);
  };

  const handlePlacementBatchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPlacementBatchFilter(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleEligibilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEligibilityFilter(e.target.value);
    setPage(1);
  };

  const parseEligibilityFilter = (): boolean | undefined => {
    if (eligibilityFilter === 'true') return true;
    if (eligibilityFilter === 'false') return false;
    return undefined;
  };

  // Query parameters
  const queryParams: GetStudentsFilterParams = {
    page,
    limit,
    ...(departmentFilter ? { departmentId: departmentFilter } : {}),
    ...(courseFilter ? { courseId: courseFilter } : {}),
    ...(placementBatchFilter ? { placementBatchId: placementBatchFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(parseEligibilityFilter() !== undefined ? { isPlacementEligible: parseEligibilityFilter() } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };

  // Fetch Students
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['students', queryParams],
    queryFn: () => studentsService.getAll(queryParams),
  });

  // Fetch Departments
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsService.getAll(),
  });

  // Fetch Courses dependent on department
  const { data: courses } = useQuery({
    queryKey: ['courses', departmentFilter],
    queryFn: () => coursesService.getAll(departmentFilter || undefined),
  });

  // Fetch Placement Batches
  const { data: placementBatches } = useQuery({
    queryKey: ['placement-batches'],
    queryFn: () => placementBatchesService.getAll(),
  });

  const departmentOptions = (departments || []).map((d) => ({
    value: d.id,
    label: `${d.code} - ${d.name}`,
  }));

  const courseOptions = (courses || []).map((c) => ({
    value: c.id,
    label: `${c.code} - ${c.name}`,
  }));

  const placementBatchOptions = (placementBatches || []).map((b) => ({
    value: b.id,
    label: b.name,
  }));

  const statusOptions = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'SUSPENDED', label: 'Suspended' },
  ];

  const eligibilityOptions = [
    { value: 'true', label: 'Eligible' },
    { value: 'false', label: 'Not Eligible' },
  ];

  const studentList = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 20, totalPages: 1 };

  // Eligibility Toggle Mutation
  const eligibilityMutation = useMutation({
    mutationFn: (payload: { id: string; isPlacementEligible: boolean }) =>
      studentsService.update(payload.id, { isPlacementEligible: payload.isPlacementEligible }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      showToast(
        'success',
        'Eligibility Updated',
        `Placement eligibility for ${updated.registerNumber} set to ${updated.isPlacementEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}.`
      );
    },
    onError: (err: Error) => {
      showToast('error', 'Eligibility Update Failed', err.message);
    },
  });

  const handleEdit = (student: Student) => {
    setSelectedStudentForEdit(student);
    setIsEditModalOpen(true);
  };

  const handleViewDetails = (student: Student) => {
    setSelectedStudentForDetail(student);
    setIsDetailModalOpen(true);
  };

  const handleOpenStatusModal = (student: Student, newStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => {
    setSelectedStudentForStatus(student);
    setTargetStatus(newStatus);
    setIsStatusModalOpen(true);
  };

  const handleToggleEligibility = (student: Student) => {
    eligibilityMutation.mutate({
      id: student.id,
      isPlacementEligible: !student.isPlacementEligible,
    });
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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Placement Student Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage student records, bulk Excel onboarding, placement drive eligibility, and account status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </Button>

          <Button onClick={() => setIsImportModalOpen(true)} variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            <span>Import Students (.xlsx)</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="relative col-span-1 sm:col-span-2">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Search register no, email, name..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-9 text-xs"
              />
            </div>

            {/* Department Filter */}
            <Select
              placeholder="All Departments"
              options={departmentOptions}
              value={departmentFilter}
              onChange={handleDepartmentChange}
              className="text-xs"
            />

            {/* Course Filter */}
            <Select
              placeholder="All Courses"
              options={courseOptions}
              value={courseFilter}
              onChange={handleCourseChange}
              className="text-xs"
            />

            {/* Placement Batch Filter */}
            <Select
              placeholder="All Placement Batches"
              options={placementBatchOptions}
              value={placementBatchFilter}
              onChange={handlePlacementBatchChange}
              className="text-xs"
            />

            {/* Status Filter */}
            <Select
              placeholder="All Statuses"
              options={statusOptions}
              value={statusFilter}
              onChange={handleStatusChange}
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <div className="w-48">
              <Select
                placeholder="All Eligibility"
                options={eligibilityOptions}
                value={eligibilityFilter}
                onChange={handleEligibilityChange}
                className="text-xs"
              />
            </div>

            <div className="text-slate-500 font-medium">
              Total Students: <span className="font-bold text-slate-900">{meta.total}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Data Area */}
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : isError ? (
        <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          Failed to load placement students: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : studentList.length === 0 ? (
        <EmptyState
          title="No Placement Students Found"
          description={
            searchQuery || departmentFilter || courseFilter || placementBatchFilter || statusFilter || eligibilityFilter
              ? 'No students match your selected search and filter criteria.'
              : 'Get started by uploading your first batch of placement students using Excel import.'
          }
          icon={GraduationCap}
          actionLabel={
            searchQuery || departmentFilter || courseFilter || placementBatchFilter || statusFilter || eligibilityFilter
              ? undefined
              : 'Import Students'
          }
          onAction={
            searchQuery || departmentFilter || courseFilter || placementBatchFilter || statusFilter || eligibilityFilter
              ? undefined
              : () => setIsImportModalOpen(true)
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Reg Number</th>
                  <th className="px-6 py-3.5">Student Name</th>
                  <th className="px-6 py-3.5">College Email</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Course</th>
                  <th className="px-6 py-3.5">Placement Batch</th>
                  <th className="px-6 py-3.5">Placement Eligibility</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {studentList.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Register Number */}
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      <Badge variant="emerald">{student.registerNumber}</Badge>
                    </td>

                    {/* Student Name */}
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {student.firstName} {student.lastName || ''}
                    </td>

                    {/* College Email */}
                    <td className="px-6 py-4 text-slate-600 text-xs">{student.collegeEmail}</td>

                    {/* Department */}
                    <td className="px-6 py-4 text-slate-600 text-xs">
                      {student.department ? (
                        <span className="font-semibold text-slate-800">{student.department.code}</span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Course */}
                    <td className="px-6 py-4 text-slate-600 text-xs">
                      {student.course ? (
                        <span className="font-semibold text-slate-800">{student.course.code}</span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Placement Batch */}
                    <td className="px-6 py-4 text-slate-600 text-xs">
                      {student.placementBatch ? (
                        <span className="font-semibold text-emerald-800">{student.placementBatch.name}</span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>

                    {/* Placement Eligibility */}
                    <td className="px-6 py-4">
                      {student.isPlacementEligible ? (
                        <Badge variant="emerald" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ELIGIBLE</span>
                        </Badge>
                      ) : (
                        <Badge variant="rose" className="gap-1">
                          <XCircle className="w-3 h-3" />
                          <span>NOT ELIGIBLE</span>
                        </Badge>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <Badge variant={getStatusBadgeVariant(student.status)}>{student.status}</Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Profile Details */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="View Profile Details"
                          onClick={() => handleViewDetails(student)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {/* Edit Student */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit Profile & Academic Assignment"
                          onClick={() => handleEdit(student)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>

                        {/* Toggle Placement Eligibility */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title={
                            student.isPlacementEligible
                              ? 'Mark as Not Eligible for Placement'
                              : 'Mark as Eligible for Placement'
                          }
                          onClick={() => handleToggleEligibility(student)}
                          disabled={eligibilityMutation.isPending}
                          className={`h-8 w-8 p-0 ${
                            student.isPlacementEligible
                              ? 'text-emerald-600 hover:text-rose-700 hover:bg-rose-50'
                              : 'text-rose-600 hover:text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </Button>

                        {/* Status Toggle Actions */}
                        {student.status === 'ACTIVE' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Deactivate Account"
                            onClick={() => handleOpenStatusModal(student, 'INACTIVE')}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}

                        {student.status === 'INACTIVE' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Activate Account"
                            onClick={() => handleOpenStatusModal(student, 'ACTIVE')}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}

                        {student.status === 'SUSPENDED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Reactivate Account"
                            onClick={() => handleOpenStatusModal(student, 'ACTIVE')}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              Showing page <span className="font-semibold text-slate-900">{meta.page}</span> of{' '}
              <span className="font-semibold text-slate-900">{meta.totalPages}</span> ({meta.total} total placement students)
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
                className="gap-1 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages || isFetching}
                className="gap-1 text-xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Create Student Modal */}
      <StudentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        student={null}
      />

      {/* Edit Student Modal */}
      <StudentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        student={selectedStudentForEdit}
      />

      {/* View Student Details Modal */}
      <StudentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        student={selectedStudentForDetail}
      />

      {/* Student Status Modal */}
      <StudentStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        student={selectedStudentForStatus}
        targetStatus={targetStatus}
      />

      {/* Excel Bulk Import Modal */}
      <StudentImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
}
