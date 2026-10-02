'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { LogOut, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function UserNav() {
  const { user, logout, isLoggingOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
      >
        <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-bold text-sm">
          {user.email.substring(0, 2).toUpperCase()}
        </div>
        <div className="hidden md:block text-left text-xs">
          <p className="font-semibold text-slate-900 leading-tight">{user.email}</p>
          <div className="flex items-center gap-1 text-slate-500 mt-0.5">
            <Shield className="w-3 h-3 text-emerald-600" />
            <span className="font-medium text-emerald-700">{user.role}</span>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="text-xs text-slate-500 font-medium">Signed in as</p>
            <p className="text-sm font-bold text-slate-900 truncate mt-0.5">{user.email}</p>
            <Badge variant="emerald" className="mt-1.5">
              {user.role}
            </Badge>
          </div>

          <button
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
