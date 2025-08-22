// src/app/components/ModePackBadge.tsx
'use client';

type Props = { mode?: 'web' | 'http-json' | 'rest' | string; pack?: string; className?: string };

export default function ModePackBadge({ mode, pack, className = '' }: Props) {
  const m = String(mode ?? '').toLowerCase();
  const variant =
    m === 'web'
      ? 'bg-sky-100 text-sky-800 border-sky-200'
      : m === 'rest'
      ? 'bg-violet-100 text-violet-800 border-violet-200'
      : 'bg-slate-100 text-slate-800 border-slate-200';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${variant} ${className}`}
      title={pack ? `Attack pack: ${pack}` : undefined}
    >
      <span className="uppercase tracking-wide">{m || 'unknown'}</span>
      {pack ? <span className="opacity-70">· {pack}</span> : null}
    </span>
  );
}
