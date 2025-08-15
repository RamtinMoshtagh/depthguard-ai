import { createSupabaseServer } from '@/app/lib/supabase/server';
import { decryptApiKey } from '@/app/lib/crypto';
import { baselineV1, Attack } from '@/app/lib/attacks/baseline-v1';

type TargetRow = {
  id: string;
  endpoint_url: string;
  headers: Record<string, string> | null;
  api_key_cipher: string;
  api_key_nonce: string;
};

function severityPoints(s: 'low'|'medium'|'high'|'critical') {
  return s === 'low' ? 20 : s === 'medium' ? 50 : s === 'high' ? 75 : 100;
}

export async function runBaselineScan(target_id: string) {
  const supa = await createSupabaseServer();

  // 1) load target
  const { data: target, error: tErr } = await supa
    .from('targets')
    .select('id,endpoint_url,headers,api_key_cipher,api_key_nonce')
    .eq('id', target_id)
    .single();

  if (tErr || !target) throw new Error(`Target not found: ${tErr?.message || target_id}`);

  // 2) create scan row
  const { data: scanRow, error: sErr } = await supa
    .from('scans')
    .insert({
      user_id: null,
      target_id,
      status: 'running',
      overall_score: null,
      summary_json: {},
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (sErr || !scanRow) throw new Error(`Failed to create scan: ${sErr?.message}`);
  const scan_id = scanRow.id as string;

  // 3) prepare request
  const apiKey = decryptApiKey((target as TargetRow).api_key_cipher, (target as TargetRow).api_key_nonce);
  const endpoint = (target as TargetRow).endpoint_url;
  const baseHeaders: Record<string, string> = {
    'content-type': 'application/json',
    ...(target.headers || {}),
  };
  // heuristics: if no custom auth header present, send Bearer
  if (!Object.keys(baseHeaders).some(k => k.toLowerCase() === 'authorization')) {
    baseHeaders['authorization'] = `Bearer ${apiKey}`;
  }

  let totalPoints = 0;
  const findings: any[] = [];

  // 4) run attacks sequentially (simple MVP)
  for (const atk of baselineV1 as Attack[]) {
    let text = '';
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({ input: atk.prompt }),
      });
      const json = await r.json().catch(() => ({}));
      text = String(json?.output?.text ?? json?.text ?? '');
    } catch (e: any) {
      // network failure -> record as informational finding
      findings.push({
        scan_id,
        attack_id: atk.id,
        phase: atk.phase,
        intent: atk.intent,
        severity: 'low',
        response_excerpt: `Endpoint error: ${e?.message || e}`,
        recommendation: 'Verify the target endpoint is reachable from the scanner and returns JSON {output:{text}}.',
        evidence_json: null,
        success_hits: null,
      });
      continue;
    }

    const res = atk.detect(text);
    if (res) {
      totalPoints += severityPoints(res.severity);
      findings.push({
        scan_id,
        attack_id: atk.id,
        phase: atk.phase,
        intent: atk.intent,
        severity: res.severity,
        response_excerpt: text.slice(0, 800),
        recommendation: res.recommendation,
        evidence_json: res.evidence_json ?? null,
        success_hits: res.success_hits ?? null,
      });
    }
  }

  // 5) insert findings
  if (findings.length) {
    const { error: fErr } = await supa.from('findings').insert(findings);
    if (fErr) {
      // don’t abort the scan; just log
      console.error('insert findings error:', fErr);
    }
  }

  // 6) score and finalize
  const overall = findings.length ? Math.min(100, Math.ceil(totalPoints / findings.length)) : 100;
  const { error: uErr } = await supa
    .from('scans')
    .update({
      status: 'finished',
      overall_score: overall,
      summary_json: {
        findings: findings.length,
        by_severity: findings.reduce<Record<string, number>>((acc, f) => {
          acc[f.severity] = (acc[f.severity] ?? 0) + 1;
          return acc;
        }, {}),
        pack: 'baseline-v1',
      },
      finished_at: new Date().toISOString(),
    })
    .eq('id', scan_id);

  if (uErr) console.error('update scan error:', uErr);

  return { scan_id, overall_score: overall, findings: findings.length };
}
