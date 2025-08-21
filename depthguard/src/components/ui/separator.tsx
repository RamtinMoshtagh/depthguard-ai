// src/components/ui/separator.tsx
import * as React from 'react';

export function Separator({ className }: { className?: string }) {
  return (
    <div
      role="separator"
      className={`my-6 h-px w-full bg-slate-800 ${className ?? ''}`}
    />
  );
}
