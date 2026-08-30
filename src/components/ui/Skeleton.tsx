import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-[var(--ink-850)] border border-[var(--line-800)] rounded-2xl overflow-hidden relative ${className}`}
      {...props}
    >
      {/* Brillo que "pasa" por encima del esqueleto (Shimmer effect) */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-[var(--ink-800)]/40 to-transparent" />
    </div>
  );
}

// Podés exportar variantes para usarlas rapidísimo
export function SkeletonCard() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-40 w-full rounded-[2rem]" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full rounded-[2rem]" />
    </div>
  );
}