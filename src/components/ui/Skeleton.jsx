import React from 'react';
import { cn } from './cn';

export function Skeleton({ className }) {
  return <div className={cn('cd-skeleton', className)} aria-hidden />;
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}

export function SkeletonChartCard({ className, chartHeight = 'h-44' }) {
  return (
    <div className={cn('rounded-cdlg border border-cdborder/60 bg-cdsurface p-5 space-y-4', className)}>
      <div className="flex justify-between gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-24 rounded-cdmd" />
      </div>
      <Skeleton className={cn('w-full rounded-cdlg', chartHeight)} />
    </div>
  );
}

/**
 * Full-page loading placeholder while Firebase activities hydrate.
 */
export function LoadingPanel({ message = 'Loading data…' }) {
  return (
    <div className="cd-enter space-y-4 py-2" role="status" aria-live="polite" aria-busy="true">
      <p className="text-sm text-cdmuted text-center">{message}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonChartCard />
        <SkeletonChartCard />
      </div>
      <Skeleton className="h-56 w-full rounded-cdlg" />
      <SkeletonText lines={2} className="max-w-md mx-auto" />
    </div>
  );
}
