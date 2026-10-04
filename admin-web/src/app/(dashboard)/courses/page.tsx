'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { coursesService } from '@/services/courses.service';
import { departmentsService } from '@/services/departments.service';
import { Course } from '@/types';
import { CourseModal } from '@/components/forms/course-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { Plus, Search, GraduationCap, Edit2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsService.getAll(),
  });

  const { data: courses, isLoading, isError, error } = useQuery({
    queryKey: ['courses', selectedDepartmentId],
    queryFn: () => coursesService.getAll(selectedDepartmentId || undefined),
  });

  const filteredCourses = (courses || []).filter((course) => {
    const q = searchQuery.toLowerCase();
    return course.code.toLowerCase().includes(q) || course.name.toLowerCase().includes(q);
  });

  const handleCreate = () => {
    setSelectedCourse(null);
    setIsModalOpen(true);
  };

  const handleEdit = (course: Course) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
  };

  const departmentOptions = departments.map((d) => ({
    value: d.id,
    label: `${d.code} - ${d.name}`,
  }));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Academic Courses</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage degree programs and mapping to parent departments.
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          <span>Add Course</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder="Search by code or course name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="w-full md:w-72">
            <Select
              options={departmentOptions}
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              placeholder="All Departments"
            />
          </div>

          <div className="text-xs text-slate-500 ml-auto font-medium">
            Total Courses: <span className="font-bold text-slate-900">{filteredCourses.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Main Table / Data Area */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          Failed to load courses: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          title="No Courses Found"
          description={searchQuery || selectedDepartmentId ? 'No courses match your active filters.' : 'Get started by adding your first degree program/course.'}
          icon={GraduationCap}
          actionLabel={searchQuery || selectedDepartmentId ? undefined : 'Add Course'}
          onAction={searchQuery || selectedDepartmentId ? undefined : handleCreate}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Course Code</th>
                  <th className="px-6 py-3.5">Course Name</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Batches Count</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <Badge variant="sky">{course.code}</Badge>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{course.name}</td>
                    <td className="px-6 py-4">
                      {course.department ? (
                        <Badge variant="emerald">{course.department.code}</Badge>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {course._count?.batches ?? 0} batches
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{formatDate(course.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(course)}
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
      <CourseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        course={selectedCourse}
        departments={departments}
        defaultDepartmentId={selectedDepartmentId}
      />
    </div>
  );
}
