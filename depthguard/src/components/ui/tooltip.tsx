// src/components/ui/tooltip.tsx
import * as React from 'react';

// Minimal no-op tooltip so the API compiles.
// Usage in your Dashboard is optional; this simply renders children.
export function Tooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
export function TooltipTrigger({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
export function TooltipContent({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
