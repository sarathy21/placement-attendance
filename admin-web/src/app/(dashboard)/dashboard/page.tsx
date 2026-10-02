'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { departmentsService } from '@/services/departments.service';
import { coursesService } from '@/services/courses.service';
import { batchesService } from '@/services/batches.service';
import { subjectsService } from '@/services/subjects.service';
import { venuesService } from '@/services/venues.service';
import { StatCard } from '@/components/shared/stat-card';
import { StatCardSkeleton } from '@/components/shared/loading-skeleton';
import { useAuth } from '@/hooks/use-auth';
import {
  Building2,
  GraduationCap,
  Users,
  BookOpen,
  MapPin,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: departments, isLoading: loadingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsService.getAll(),
  });

  const { data: courses, isLoading: loadingCourses } = useQuery({
    queryKey: ['courses'],
    queryFn: () => coursesService.getAll(),
  });

  const { data: batches, isLoading: loadingBatches } = useQuery({
    queryKey: ['batches'],
    queryFn: () => batchesService.getAll(),
  });

  const { data: subjects, isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsService.getAll(),
  });

  const { data: venues, isLoading: loadingVenues } = useQuery({
    queryKey: ['venues'],
    queryFn: () => venuesService.getAll(),
  });

  const isLoadingAny = loadingDepts || loadingCourses || loadingBatches || loadingSubjects || loadingVenues;

  const quickLinks = [
    { name: 'Departments', href: '/departments', icon: Building2, desc: 'Manage university departments & academic codes' },
    { name: 'Courses', href: '/courses', icon: GraduationCap, desc: 'Configure degree programs & department mappings' },
    { name: 'Batches', href: '/batches', icon: Users, desc: 'Manage academic year cohorts & start/end years' },
    { name: 'Subjects', href: '/subjects', icon: BookOpen, desc: 'Maintain placement modules & training subjects' },
    { name: 'Venues', href: '/venues', icon: MapPin, desc: 'Manage placement halls, labs, & seating capacity' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Hero Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phase 7.4 — University Foundation</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.email.split('@')[0]}
            </h1>
            <p className="mt-1.5 text-sm text-emerald-100 max-w-xl">
              Administrator Portal for Karpagam Academy of Higher Education Placement Attendance Management System.
            </p>
          </div>
        </div>
      </div>

      {/* Reference Data Stat Cards */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
          System Reference Data Overview
        </h2>

        {isLoadingAny ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Departments"
              value={departments?.length ?? 0}
              icon={Building2}
              color="emerald"
              description="Active departments"
            />
            <StatCard
              title="Courses"
              value={courses?.length ?? 0}
              icon={GraduationCap}
              color="indigo"
              description="Degree programs"
            />
            <StatCard
              title="Batches"
              value={batches?.length ?? 0}
              icon={Users}
              color="amber"
              description="Academic cohorts"
            />
            <StatCard
              title="Subjects"
              value={subjects?.length ?? 0}
              icon={BookOpen}
              color="sky"
              description="Training modules"
            />
            <StatCard
              title="Venues"
              value={venues?.length ?? 0}
              icon={MapPin}
              color="purple"
              description="Placement halls"
            />
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
          Quick Management Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className="block">
                <Card className="hover:shadow-md transition-all group h-full cursor-pointer">
                  <CardContent className="p-6 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">{link.name}</h3>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{link.desc}</p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-600 group-hover:underline">
                        Manage {link.name}
                      </span>
                      <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
