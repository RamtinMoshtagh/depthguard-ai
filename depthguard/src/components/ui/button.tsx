// src/components/ui/button.tsx
import * as React from 'react';

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(' ');
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'outline';
  asChild?: boolean;
};

export function Button({
  className,
  variant = 'default',
  asChild,
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:opacity-60 disabled:pointer-events-none';
  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    default: 'bg-slate-100 text-slate-900 hover:bg-white',
    secondary:
      'bg-slate-800/70 text-slate-200 border border-slate-700 hover:bg-slate-800',
    outline:
      'border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800/50',
  };
  const classes = cn(base, variants[variant], 'h-9 px-3', className);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as any, {
      className: cn((children as any).props?.className, classes),
      ...props,
    });
  }
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
