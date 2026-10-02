import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full space-y-4">
      <div className="h-10 bg-slate-200 animate-pulse rounded-lg w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-lg w-full" />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-3">
        <div className="h-4 bg-slate-200 animate-pulse rounded-md w-24" />
        <div className="h-8 bg-slate-200 animate-pulse rounded-md w-16" />
      </CardContent>
    </Card>
  );
}
