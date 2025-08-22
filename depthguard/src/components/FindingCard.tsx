// src/app/components/FindingCard.tsx
'use client';

import { useState } from 'react';

type Finding = {
  id?: string;
  attack_id: string;
  phase: string;
  intent: string;
  severity: 'low'|'medium'|'high'|'critical';
  response_excerpt: string;
  recommendation: string;
  evidence_json?: any;
  success_hits?: string[] | null;
};

function sevClasses(sev: Finding['severity']) {
  switch (sev) {
    case 'critical': return 'bg-red-600';
    case 'high': return 'bg-orange-600';
    case 'medium': return 'bg-amber-600';
    default: return 'bg-slate-500';
  }
}

export default function FindingCard({ f }: { f: Finding }) {
  const [open, setOpen] = useState(false);
  const rest = f.evidence_json?.rest_meta;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${sevClasses(f.severity)}`} />
            <span className="text-sm font-semibold">{f.phase}</span>
            <span className="text-xs text-slate-500">({f.attack_id})</span>
          </div>
          <div className="mt-1 text-sm text-slate-700">{f.intent}</div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs px-2 py-1 rounded border bg-slate-50 hover:bg-slate-100"
        >
          {open ? 'Hide' : 'Details'}
        </button>
      </div>

      <div className="mt-3">
        <div className="text-xs font-medium text-slate-500">Excerpt</div>
        <pre className="mt-1 text-xs whitespace-pre-wrap bg-slate-50 p-2 rounded-md border max-h-48 overflow-auto">
          {f.response_excerpt || '—'}
        </pre>
      </div>

      <div className="mt-3">
        <div className="text-xs font-medium text-slate-500">Recommendation</div>
        <p className="mt-1 text-sm">{f.recommendation}</p>
      </div>

      {open && (
        <div className="mt-3 grid gap-3">
          {f.success_hits?.length ? (
            <div>
              <div className="text-xs font-medium text-slate-500">Matched patterns</div>
              <div className="mt-1 text-xs text-slate-700">{f.success_hits.join(', ')}</div>
            </div>
          ) : null}

          {rest && (
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <div className="text-xs font-medium text-slate-500">REST Meta</div>
              </div>
              <div className="text-xs">
                <div className="text-slate-500">URL</div>
                <div className="break-all">{rest.url}</div>
              </div>
              <div className="text-xs">
                <div className="text-slate-500">Method</div>
                <div>{rest.method}</div>
              </div>
              <div className="text-xs">
                <div className="text-slate-500">Status</div>
                <div>{rest.status} {rest.ok ? '(ok)' : ''}</div>
              </div>
              <div className="text-xs">
                <div className="text-slate-500">Latency</div>
                <div>{rest.duration_ms} ms</div>
              </div>
              <div className="text-xs">
                <div className="text-slate-500">Size</div>
                <div>{rest.bytes} bytes</div>
              </div>
              <div className="sm:col-span-3">
                <div className="text-xs font-medium text-slate-500">Headers</div>
                <pre className="mt-1 text-xs bg-slate-50 p-2 rounded-md border max-h-40 overflow-auto">
                  {JSON.stringify(rest.headers ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {f.evidence_json && !rest && (
            <div>
              <div className="text-xs font-medium text-slate-500">Evidence</div>
              <pre className="mt-1 text-xs bg-slate-50 p-2 rounded-md border max-h-40 overflow-auto">
                {JSON.stringify(f.evidence_json, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
