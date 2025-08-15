'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type Scan = { id: string; status: string; overall_score: number|null; started_at: string; finished_at: string|null };
type Target = { id: string; name: string; endpoint_url: string };

export default function Dashboard() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [name, setName] = useState('My Target');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');

  async function refresh() {
    const s = await fetch('/api/scans').then(r => r.json());
    const t = await fetch('/api/targets').then(r => r.json());
    setScans(s.scans || []); setTargets(t.targets || []);
  }
  useEffect(()=>{ refresh(); },[]);

  const createTarget = async () => {
    const r = await fetch('/api/targets',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,endpoint_url:endpoint,api_key:apiKey})});
    if (r.ok) { setApiKey(''); await refresh(); }
  };
  const startScan = async (id: string) => {
    const r = await fetch('/api/scans',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({target_id:id})});
    const j = await r.json(); alert(j.error ? j.error : 'Scan started: '+j.scan_id); await refresh();
  };

  return (
    <main className="max-w-5xl mx-auto px-6 py-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mt-4">
        <h3 className="text-xl font-semibold mb-3">Add Target</h3>
        <div className="grid gap-3 max-w-xl">
          <input className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2" placeholder="Target name" value={name} onChange={e=>setName(e.target.value)} />
          <input className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2" placeholder="Endpoint URL (POST, accepts { input })" value={endpoint} onChange={e=>setEndpoint(e.target.value)} />
          <input className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2" placeholder="API Key (stored encrypted)" value={apiKey} onChange={e=>setApiKey(e.target.value)} />
          <button className="bg-blue-400 text-black font-semibold px-4 py-2 rounded-lg" onClick={createTarget}>Save Target</button>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mt-4">
        <h3 className="text-xl font-semibold mb-3">Targets</h3>
        <table className="w-full">
          <thead><tr><th className="text-left">Name</th><th className="text-left">Endpoint</th><th></th></tr></thead>
          <tbody>
            {targets.map(t=>(
              <tr key={t.id}>
                <td className="py-2">{t.name}</td>
                <td className="py-2 text-slate-400 max-w-[420px] truncate">{t.endpoint_url}</td>
                <td className="py-2"><button className="bg-blue-400 text-black font-semibold px-3 py-1 rounded-lg" onClick={()=>startScan(t.id)}>Run Scan</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mt-4">
        <h3 className="text-xl font-semibold mb-3">Recent Scans</h3>
        <table className="w-full">
          <thead><tr><th className="text-left">ID</th><th>Status</th><th>Score</th><th>Started</th><th></th></tr></thead>
          <tbody>
            {scans.map(s=>(
              <tr key={s.id}>
                <td className="py-2">{s.id}</td>
                <td className="py-2">{s.status}</td>
                <td className="py-2">{s.overall_score ?? '-'}</td>
                <td className="py-2">{new Date(s.started_at).toLocaleString()}</td>
                <td className="py-2">{s.status==='done' ? <Link href={`/scans/${s.id}`} className="text-blue-400">View</Link> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
