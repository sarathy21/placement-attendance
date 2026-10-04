'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  Users,
  MapPin,
  ShieldCheck,
  UserCheck,
  Briefcase,
} from 'lucide-react';

const mainNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Staff Members', href: '/staff', icon: UserCheck },
];

const placementNav = [
  { name: 'Placement Batches', href: '/placement-batches', icon: Users },
  { name: 'Placement Drives', href: '/placement-drives', icon: Briefcase },
  { name: 'Students', href: '/students', icon: GraduationCap },
];

const academicNav = [
  { name: 'Departments', href: '/departments', icon: Building2 },
  { name: 'Courses', href: '/courses', icon: GraduationCap },
  { name: 'Venues', href: '/venues', icon: MapPin },
];

export function Sidebar() {
  const pathname = usePathname();

  const renderNavGroup = (title: string, items: typeof mainNav) => (
    <div className="mb-4">
      <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {title}
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-white' : 'text-slate-400')} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base leading-tight tracking-tight">KAHE Placement</h1>
          <p className="text-xs text-emerald-400 font-medium">Admin Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {renderNavGroup('Overview', mainNav)}
        {renderNavGroup('Placement Management', placementNav)}
        {renderNavGroup('Academic Reference Data', academicNav)}
      </nav>

      {/* Footer / University Info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        University Attendance System
      </div>
    </aside>
  );
}
