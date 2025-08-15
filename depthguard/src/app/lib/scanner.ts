import { classifyFinding } from '@/app/lib/classifier';
import { detectBusinessAbuse, detectHtmlExec, detectSystemPromptLeak } from '@/app/lib/detectors';
import pack from '@/app/lib/taxonomy/packs/baseline-v1.json';

export async function callTarget(endpoint: string, apiKey: string, prompt: string, headers: Record<string,string> = {}) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'authorization': `Bearer ${apiKey}`, ...headers },
    body: JSON.stringify({ input: prompt })
  });
  const json = await res.json().catch(() => ({}));
  const text = json.output?.text || json.content || JSON.stringify(json);
  return { status: res.status, text: String(text) };
}

export async function runBaselineScan({ endpoint, apiKey, capabilities }:
  { endpoint: string; apiKey: string; capabilities?: any; }) {
  const findings: any[] = [];
  for (const atk of (pack as any).attacks) {
    if (atk.requires?.streaming && !capabilities?.streaming) continue;
    const r = await callTarget(endpoint, apiKey, atk.payload_template);
    const heur = {
      sysLeak: detectSystemPromptLeak(r.text),
      html: detectHtmlExec(r.text),
      biz: detectBusinessAbuse(r.text)
    };
    const clf = await classifyFinding(atk.id, r.text.slice(0, 2000), heur);
    findings.push({
      attack_id: atk.id,
      phase: atk.phase,
      intent: atk.intent,
      severity: clf.severity,
      response_excerpt: r.text.slice(0, 700),
      evidence_json: { heuristics: heur, status: r.status },
      recommendation: clf.recommendation,
      success_hits: clf.success || []
    });
  }
  const map: Record<string, number> = { low: 20, medium: 50, high: 75, critical: 100 };
  const scores = findings.map(f => map[f.severity] || 0);
  const avg = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : 0;
  const max = scores.length ? Math.max(...scores) : 0;
  const overall = Math.round(Math.max(avg, max));
  return { findings, overall_score: overall, summary: summarize(findings) };
}
function summarize(findings: any[]) {
  const bucket = { low:0, medium:0, high:0, critical:0 };
  for (const f of findings) (bucket as any)[f.severity]++;
  return bucket;
}
