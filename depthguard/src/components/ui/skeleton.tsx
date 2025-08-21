// src/components/ui/skeleton.tsx
import * as React from 'react';

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(' ');
}

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'h-4 w-full animate-pulse rounded-md bg-slate-800/70',
        className
      )}
      {...props}
    />
  );
}
