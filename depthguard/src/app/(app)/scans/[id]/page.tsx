import { createSupabaseServer } from '@/app/lib/supabase/server';
import Link from 'next/link';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ScanPage({ params }: PageProps) {
  const { id } = await params; // <-- Next 15: await params

  const supa = await createSupabaseServer();

  const { data: scan, error: se } = await supa
    .from('scans')
    .select('*')
    .eq('id', id)
    .single();

  if (se || !scan) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold">Scan not found</h1>
        <p className="text-slate-400 mt-2">{se?.message ?? 'No scan with that id.'}</p>
        <div className="mt-6">
          <Link href="/dashboard" className="text-blue-400">← Back to Dashboard</Link>
        </div>
      </main>
    );
  }

  const { data: findings } = await supa
    .from('findings')
    .select('id,attack_id,phase,intent,severity,response_excerpt,recommendation,evidence_json,success_hits')
    .eq('scan_id', id);

  const started = scan.started_at ? new Date(scan.started_at).toISOString() : '-';
  const finished = scan.finished_at ? new Date(scan.finished_at).toISOString() : '';

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold">Scan {id.slice(0, 8)}…</h1>
      <p className="text-slate-400 mt-2">
        Status: <span className="font-medium">{scan.status}</span> • Score:{' '}
        <span className="font-medium">{scan.overall_score ?? '-'}</span>
      </p>
      <p className="text-slate-500">
        Started: {started}
        {finished ? ` • Finished: ${finished}` : ''}
      </p>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-800">
              <th className="py-2 pr-4">Attack</th>
              <th className="py-2 pr-4">Phase</th>
              <th className="py-2 pr-4">Intent</th>
              <th className="py-2 pr-4">Severity</th>
              <th className="py-2 pr-4">Excerpt</th>
              <th className="py-2 pr-4">Fix</th>
            </tr>
          </thead>
          <tbody>
            {(findings || []).map((f) => (
              <tr key={f.id} className="border-b border-slate-900 align-top">
                <td className="py-2 pr-4 font-mono text-xs">{f.attack_id}</td>
                <td className="py-2 pr-4">{f.phase}</td>
                <td className="py-2 pr-4">{f.intent}</td>
                <td className="py-2 pr-4 font-semibold uppercase">{f.severity}</td>
                <td className="py-2 pr-4 text-slate-300 max-w-[420px]">
                  <pre className="whitespace-pre-wrap break-words">{f.response_excerpt}</pre>
                </td>
                <td className="py-2 pr-4 text-slate-300 max-w-[320px]">{f.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex gap-4">
        <a
          href={`/api/report/${id}`}
          className="inline-block bg-blue-400 text-black font-semibold px-4 py-2 rounded-lg"
        >
          Download JSON
        </a>
        <Link href="/dashboard" className="text-blue-400">← Back to Dashboard</Link>
      </div>
    </main>
  );
}
