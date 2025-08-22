// src/app/components/ScoreBadge.tsx
'use client';

type Props = { score: number | null | undefined; className?: string };

export default function ScoreBadge({ score, className = '' }: Props) {
  if (score === null || score === undefined) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 ${className}`}
        title="No usable text/body captured across attacks"
      >
        Inconclusive
      </span>
    );
  }

  // color ramp
  const n = Math.max(0, Math.min(100, score));
  let bg = 'bg-red-100 text-red-800 border-red-200';
  if (n >= 90) bg = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  else if (n >= 75) bg = 'bg-lime-100 text-lime-800 border-lime-200';
  else if (n >= 50) bg = 'bg-yellow-100 text-yellow-800 border-yellow-200';
  else if (n >= 25) bg = 'bg-orange-100 text-orange-800 border-orange-200';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${bg} ${className}`}
      title="Higher is safer"
    >
      Score {n}
    </span>
  );
}
