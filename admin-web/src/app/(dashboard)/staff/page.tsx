'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { staffService } from '@/services/staff.service';
import { departmentsService } from '@/services/departments.service';
import { Staff, GetStaffFilterParams } from '@/types';
import { StaffModal } from '@/components/forms/staff-modal';
import { ResetStaffPasswordModal } from '@/components/forms/reset-staff-password-modal';
import { StaffDetailModal } from '@/components/forms/staff-detail-modal';
import { StaffStatusModal } from '@/components/forms/staff-status-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useDebounce } from '@/hooks/use-debounce';
import {
  Plus,
  Search,
  Users,
  Edit2,
  KeyRound,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Ban,
  CheckCircle,
} from 'lucide-react';

export default function StaffPage() {
  // State for filtering & pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [selectedStaffForEdit, setSelectedStaffForEdit] = useState<Staff | null>(null);

  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedStaffForReset, setSelectedStaffForReset] = useState<Staff | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedStaffForDetail, setSelectedStaffForDetail] = useState<Staff | null>(null);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStaffForStatus, setSelectedStaffForStatus] = useState<Staff | null>(null);
  const [targetStatus, setTargetStatus] = useState<'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Search/Filter handlers that reset pagination to page 1
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDepartmentFilter(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  // Query params
  const queryParams: GetStaffFilterParams = {
    page,
    limit,
    ...(departmentFilter ? { departmentId: departmentFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  };

  // Fetch staff
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['staff', queryParams],
    queryFn: () => staffService.getAll(queryParams),
  });

  // Fetch departments for filter dropdown
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsService.getAll(),
  });

  const departmentOptions = (departments || []).map((d) => ({
    value: d.id,
    label: `${d.code} - ${d.name}`,
  }));

  const statusOptions = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'SUSPENDED', label: 'Suspended' },
  ];

  const staffList = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

  // Handlers
  const handleCreate = () => {
    setSelectedStaffForEdit(null);
    setIsStaffModalOpen(true);
  };

  const handleEdit = (staff: Staff) => {
    setSelectedStaffForEdit(staff);
    setIsStaffModalOpen(true);
  };

  const handleViewDetails = (staff: Staff) => {
    setSelectedStaffForDetail(staff);
    setIsDetailModalOpen(true);
  };

  const handleResetPassword = (staff: Staff) => {
    setSelectedStaffForReset(staff);
    setIsResetPasswordModalOpen(true);
  };

  const handleOpenStatusModal = (
    staff: Staff,
    newStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  ) => {
    setSelectedStaffForStatus(staff);
    setTargetStatus(newStatus);
    setIsStatusModalOpen(true);
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
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Staff Members</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage faculty, staff accounts, department assignments, and account status.
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
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search staff ID, name, email..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-9"
            />
          </div>

          {/* Department Filter */}
          <div className="w-full md:w-64">
            <Select
              placeholder="All Departments"
              options={departmentOptions}
              value={departmentFilter}
              onChange={handleDepartmentChange}
            />
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-48">
            <Select
              placeholder="All Statuses"
              options={statusOptions}
              value={statusFilter}
              onChange={handleStatusChange}
            />
          </div>

          {/* Summary stats */}
          <div className="text-xs text-slate-500 ml-auto font-medium hidden lg:block shrink-0">
            Total Staff: <span className="font-bold text-slate-900">{meta.total}</span>
          </div>
        </CardContent>
      </Card>

      {/* Main Table / Data Area */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          Failed to load staff members: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : staffList.length === 0 ? (
        <EmptyState
          title="No Staff Members Found"
          description={
            searchQuery || departmentFilter || statusFilter
              ? 'No staff members match your filter criteria.'
              : 'Get started by creating your first university staff member account.'
          }
          icon={Users}
          actionLabel={searchQuery || departmentFilter || statusFilter ? undefined : 'Add Staff Member'}
          onAction={searchQuery || departmentFilter || statusFilter ? undefined : handleCreate}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Staff ID</th>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Designation</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Staff ID */}
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      <Badge variant="emerald">{staff.staffId}</Badge>
                    </td>

                    {/* Name */}
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {staff.firstName} {staff.lastName || ''}
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4 text-slate-600 text-xs">{staff.user?.email}</td>

                    {/* Designation */}
                    <td className="px-6 py-4 text-slate-600 text-xs">
                      {staff.designation || '—'}
                    </td>

                    {/* Department */}
                    <td className="px-6 py-4 text-slate-600 text-xs">
                      {staff.department ? (
                        <span className="font-semibold text-slate-800">{staff.department.code}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <Badge variant={getStatusBadgeVariant(staff.user?.status)}>
                        {staff.user?.status}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Details */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="View Details"
                          onClick={() => handleViewDetails(staff)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit Details"
                          onClick={() => handleEdit(staff)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>

                        {/* Reset Password */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Reset Password"
                          onClick={() => handleResetPassword(staff)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-amber-700 hover:bg-amber-50"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>

                        {/* Status Toggle Actions */}
                        {staff.user?.status === 'ACTIVE' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Deactivate Account"
                            onClick={() => handleOpenStatusModal(staff, 'INACTIVE')}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}

                        {staff.user?.status === 'INACTIVE' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Activate Account"
                            onClick={() => handleOpenStatusModal(staff, 'ACTIVE')}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}

                        {staff.user?.status === 'SUSPENDED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Reactivate Account"
                            onClick={() => handleOpenStatusModal(staff, 'ACTIVE')}
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
              <span className="font-semibold text-slate-900">{meta.totalPages}</span> ({meta.total} total staff)
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

      {/* Staff Create / Edit Modal */}
      <StaffModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staff={selectedStaffForEdit}
      />

      {/* Staff Reset Password Modal */}
      <ResetStaffPasswordModal
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        staff={selectedStaffForReset}
      />

      {/* Staff Details Modal */}
      <StaffDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        staff={selectedStaffForDetail}
      />

      {/* Staff Status Modal */}
      <StaffStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        staff={selectedStaffForStatus}
        targetStatus={targetStatus}
      />
    </div>
  );
}
