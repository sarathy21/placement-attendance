'use client';

import React from 'react';
import { UserNav } from './user-nav';
import { usePathname } from 'next/navigation';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard Overview',
  '/departments': 'Department Management',
  '/courses': 'Course Catalog',
  '/batches': 'Academic Batches',
  '/subjects': 'Subjects & Training Modules',
  '/venues': 'Campus Venues',
  '/staff': 'Staff Management',
};

export function Header() {
  const pathname = usePathname();
  const title = routeTitles[pathname] || 'Administration';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Online</span>
        </div>
        <UserNav />
      </div>
    </header>
  );
}
