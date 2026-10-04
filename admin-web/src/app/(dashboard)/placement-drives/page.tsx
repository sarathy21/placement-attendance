'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { placementDrivesService } from '@/services/placement-drives.service';
import { PlacementDrive, PlacementDriveStatus, GetPlacementDrivesFilterParams } from '@/types';
import { PlacementDriveModal } from '@/components/forms/placement-drive-modal';
import { PlacementDriveDetailModal } from '@/components/forms/placement-drive-detail-modal';
import { PlacementDriveStatusModal } from '@/components/forms/placement-drive-status-modal';
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
  Briefcase,
  Edit2,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  Building,
  MapPin,
  Clock,
  QrCode,
  CheckCircle2,
} from 'lucide-react';

export default function PlacementDrivesPage() {
  // View mode state: 'list' or 'calendar'
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Filtering & Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [companySearch, setCompanySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [attendanceFilter, setAttendanceFilter] = useState<string>('');

  // Modals state
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [selectedDriveForEdit, setSelectedDriveForEdit] = useState<PlacementDrive | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDriveIdForDetail, setSelectedDriveIdForDetail] = useState<string | null>(null);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedDriveForStatus, setSelectedDriveForStatus] = useState<PlacementDrive | null>(null);
  const [targetStatus, setTargetStatus] = useState<PlacementDriveStatus | null>(null);

  const debouncedCompany = useDebounce(companySearch, 300);

  // Filter change handlers (reset page to 1)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanySearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromDate(e.target.value);
    setPage(1);
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToDate(e.target.value);
    setPage(1);
  };

  const handleAttendanceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAttendanceFilter(e.target.value);
    setPage(1);
  };

  // Build backend filter parameters
  const queryParams: GetPlacementDrivesFilterParams = {
    page,
    limit,
    ...(statusFilter ? { status: statusFilter as PlacementDriveStatus } : {}),
    ...(debouncedCompany ? { companyName: debouncedCompany } : {}),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
    ...(attendanceFilter === 'true'
      ? { attendanceEnabled: true }
      : attendanceFilter === 'false'
      ? { attendanceEnabled: false }
      : {}),
  };

  // Fetch placement drives from backend
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['placement-drives', queryParams],
    queryFn: () => placementDrivesService.getAll(queryParams),
  });

  const drivesList = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit: 10, totalPages: 1 };

  // Action Handlers
  const handleCreate = () => {
    setSelectedDriveForEdit(null);
    setIsDriveModalOpen(true);
  };

  const handleEdit = (drive: PlacementDrive) => {
    setSelectedDriveForEdit(drive);
    setIsDriveModalOpen(true);
  };

  const handleViewDetails = (driveId: string) => {
    setSelectedDriveIdForDetail(driveId);
    setIsDetailModalOpen(true);
  };

  const handleOpenStatusModal = (drive: PlacementDrive, newStatus: PlacementDriveStatus) => {
    setSelectedDriveForStatus(drive);
    setTargetStatus(newStatus);
    setIsStatusModalOpen(true);
  };

  const getStatusBadgeVariant = (s: PlacementDriveStatus) => {
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

  const statusOptions = [
    { value: 'UPCOMING', label: 'Upcoming' },
    { value: 'ONGOING', label: 'Ongoing' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const attendanceOptions = [
    { value: 'true', label: 'Attendance ON' },
    { value: 'false', label: 'Attendance OFF' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Placement Drives</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage campus recruitment drives, selection rounds pipeline, and QR attendance options.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center p-1 rounded-lg bg-slate-100 border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List View</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>

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
            <span>Create Drive</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col lg:flex-row items-center gap-4">
          {/* Search by Company */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search recruiting company..."
              value={companySearch}
              onChange={handleSearchChange}
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full lg:w-44">
            <Select
              placeholder="All Statuses"
              options={statusOptions}
              value={statusFilter}
              onChange={handleStatusChange}
            />
          </div>

          {/* Attendance Filter */}
          <div className="w-full lg:w-44">
            <Select
              placeholder="All Attendance"
              options={attendanceOptions}
              value={attendanceFilter}
              onChange={handleAttendanceChange}
            />
          </div>

          {/* Date Range Filters */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <Input
              type="date"
              title="From Date"
              value={fromDate}
              onChange={handleFromDateChange}
              className="w-full lg:w-36 text-xs"
            />
            <span className="text-slate-400 text-xs">to</span>
            <Input
              type="date"
              title="To Date"
              value={toDate}
              onChange={handleToDateChange}
              className="w-full lg:w-36 text-xs"
            />
          </div>

          {/* Summary stats */}
          <div className="text-xs text-slate-500 ml-auto font-medium hidden xl:block shrink-0">
            Total Drives: <span className="font-bold text-slate-900">{meta.total}</span>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area: List View or Recruitment Calendar View */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          Failed to load placement drives: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : drivesList.length === 0 ? (
        <EmptyState
          title="No Placement Drives Found"
          description={
            companySearch || statusFilter || fromDate || toDate || attendanceFilter
              ? 'No placement drives match your filter criteria.'
              : 'Get started by creating your first campus placement drive.'
          }
          icon={Briefcase}
          actionLabel={
            companySearch || statusFilter || fromDate || toDate || attendanceFilter
              ? undefined
              : 'Create Placement Drive'
          }
          onAction={
            companySearch || statusFilter || fromDate || toDate || attendanceFilter
              ? undefined
              : handleCreate
          }
        />
      ) : viewMode === 'list' ? (
        /* TABLE LIST VIEW */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Company</th>
                  <th className="px-6 py-3.5">Drive Date</th>
                  <th className="px-6 py-3.5">Venue</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Attendance</th>
                  <th className="px-6 py-3.5">Rounds</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {drivesList.map((drive) => (
                  <tr key={drive.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Company */}
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{drive.companyName}</span>
                      </div>
                    </td>

                    {/* Drive Date */}
                    <td className="px-6 py-4 text-slate-700 text-xs font-medium">
                      {new Date(drive.driveDate).toLocaleDateString(undefined, {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Venue */}
                    <td className="px-6 py-4 text-slate-600 text-xs">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{drive.venue}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <Badge variant={getStatusBadgeVariant(drive.status)}>{drive.status}</Badge>
                    </td>

                    {/* Attendance Indicator */}
                    <td className="px-6 py-4">
                      {drive.attendanceEnabled ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                          <QrCode className="w-3.5 h-3.5 text-emerald-600" /> ON
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 text-xs font-semibold border border-slate-200">
                          OFF
                        </span>
                      )}
                    </td>

                    {/* Rounds Count */}
                    <td className="px-6 py-4 text-slate-600 text-xs font-semibold">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {drive.rounds ? drive.rounds.length : 0} Stage{(drive.rounds?.length || 0) === 1 ? '' : 's'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Details */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="View Details & Rounds"
                          onClick={() => handleViewDetails(drive.id)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {/* Edit Drive */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit Drive"
                          onClick={() => handleEdit(drive)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>

                        {/* Change Status Dropdown/Modal */}
                        <select
                          className="h-8 px-2 text-xs rounded border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleOpenStatusModal(drive, e.target.value as PlacementDriveStatus);
                            }
                          }}
                        >
                          <option value="">Status...</option>
                          <option value="UPCOMING">UPCOMING</option>
                          <option value="ONGOING">ONGOING</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
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
              <span className="font-semibold text-slate-900">{meta.totalPages}</span> ({meta.total} total drives)
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
      ) : (
        /* RECRUITMENT CALENDAR AGENDA VIEW */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-950 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold">Campus Recruitment Calendar</h3>
              </div>
              <p className="text-xs text-emerald-200">
                Informational overview of scheduled placement drives, recruitment dates, and venues.
              </p>
            </div>
            <div className="text-xs font-semibold px-3 py-1.5 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-800">
              {drivesList.length} Drive{(drivesList.length) === 1 ? '' : 's'} on Current Page
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {drivesList.map((drive) => {
              const driveDateObj = new Date(drive.driveDate);
              return (
                <div
                  key={drive.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          {driveDateObj.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 pt-1">{drive.companyName}</h4>
                      </div>
                      <Badge variant={getStatusBadgeVariant(drive.status)}>{drive.status}</Badge>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">
                          {driveDateObj.toLocaleDateString(undefined, {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{drive.venue}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>
                          {drive.rounds ? drive.rounds.length : 0} Selection Round
                          {(drive.rounds?.length || 0) === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>

                    {drive.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded border border-slate-100">
                        {drive.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      Attendance: {drive.attendanceEnabled ? 'ON' : 'OFF'}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(drive.id)}
                      className="gap-1 text-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Pipeline</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create / Edit Placement Drive Modal */}
      <PlacementDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        drive={selectedDriveForEdit}
      />

      {/* View Placement Drive & Rounds Detail Modal */}
      <PlacementDriveDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedDriveIdForDetail(null);
        }}
        driveId={selectedDriveIdForDetail}
        onEditDrive={(drive) => {
          setIsDetailModalOpen(false);
          handleEdit(drive);
        }}
      />

      {/* Placement Drive Lifecycle Status Change Modal */}
      {selectedDriveForStatus && targetStatus && (
        <PlacementDriveStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => {
            setIsStatusModalOpen(false);
            setSelectedDriveForStatus(null);
            setTargetStatus(null);
          }}
          drive={selectedDriveForStatus}
          targetStatus={targetStatus}
        />
      )}
    </div>
  );
}
