// src/components/ui/use-toast.ts
export type ToastOpts = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

export function useToast() {
  const toast = (opts: ToastOpts) => {
    // Minimal dev toast – non-blocking console + optional alert.
    // Replace with a real toaster later.
    // eslint-disable-next-line no-console
    console.log(`[toast:${opts.variant ?? 'default'}]`, opts.title, opts.description);
    if (typeof window !== 'undefined' && opts.variant === 'destructive') {
      // eslint-disable-next-line no-alert
      window.alert(`${opts.title ?? 'Error'}${opts.description ? `\n${opts.description}` : ''}`);
    }
  };
  return { toast };
}
