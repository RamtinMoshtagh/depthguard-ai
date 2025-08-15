import { createSupabaseServer } from '@/app/lib/supabase/server';

type Finding = {
  id: string;
  attack_id: string;
  phase: 'inputs' | 'ecosystem' | 'model' | 'prompt' | 'data' | 'app' | string;
  intent: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  response_excerpt: string | null;
  recommendation: string | null;
  evidence_json: any;
  success_hits: string[] | null;
};

function sevPoints(s: string) {
  switch (s) {
    case 'critical': return 100;
    case 'high':     return 75;
    case 'medium':   return 50;
    case 'low':      return 20;
    default:         return 0;
  }
}

export async function buildReport(scanId: string) {
  const supa = await createSupabaseServer();

  const { data: scan, error: se } = await supa
    .from('scans')
    .select('id,target_id,status,overall_score,summary_json,started_at,finished_at')
    .eq('id', scanId)
    .single();

  if (se || !scan) throw new Error(se?.message || 'Scan not found');

  const { data: target } = await supa
    .from('targets')
    .select('id,name,endpoint_url,model_hint,created_at')
    .eq('id', scan.target_id)
    .single();

  const { data: findingsRaw, error: fErr } = await supa
  .from('findings')
  .select('id,attack_id,phase,intent,severity,response_excerpt,recommendation,evidence_json,success_hits')
  .eq('scan_id', scanId)
  .order('created_at', { ascending: true });

if (fErr) throw new Error(fErr.message);

const findings: Finding[] = findingsRaw ?? [];


  // Aggregate
  const bySeverity = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});
  const byPhase = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.phase] = (acc[f.phase] ?? 0) + 1;
    return acc;
  }, {});

  const sorted = [...findings].sort((a, b) => sevPoints(b.severity) - sevPoints(a.severity));
  const top3 = sorted.slice(0, 3).map(f => ({
    attack_id: f.attack_id,
    phase: f.phase,
    intent: f.intent,
    severity: f.severity,
    why_it_matters:
      f.phase === 'app' ? 'Untrusted HTML/JS can execute in user browsers (XSS/Session theft).'
      : f.phase === 'prompt' ? 'System/internal prompts reveal business logic & guardrails.'
      : f.phase === 'model' ? 'Unauthorized business actions (discounts/refunds) harm integrity.'
      : 'Potentially exploitable behavior.',
    fix: f.recommendation || 'Apply stricter server-side validation/authorization and output encoding.',
  }));

  const immediateActions: string[] = [];
  if (bySeverity['critical'] || bySeverity['high']) {
    if (byPhase['app']) immediateActions.push('Treat model output as untrusted; HTML-encode or sanitize before rendering.');
    if (byPhase['prompt']) immediateActions.push('Do not reveal system/tool prompts; move business logic server-side.');
    if (byPhase['model']) immediateActions.push('Enforce server-side authorization for discounts/refunds/actions.');
  }
  if (!immediateActions.length) immediateActions.push('No high/critical found. Keep monitoring and run scheduled scans.');

  return {
    metadata: {
      version: 'baseline-v1',
      generated_at: new Date().toISOString(),
    },
    target: {
      id: scan.target_id,
      name: target?.name ?? 'Unknown',
      endpoint_url: target?.endpoint_url ?? 'Unknown',
      model_hint: target?.model_hint ?? null,
    },
    scan: {
      id: scan.id,
      status: scan.status,
      score: scan.overall_score,
      started_at: scan.started_at,
      finished_at: scan.finished_at,
      summary: scan.summary_json ?? {},
    },
    executive_summary: {
      overall_score: scan.overall_score,
      severities: bySeverity,
      phases: byPhase,
      top_risks: top3,
      immediate_actions: immediateActions,
    },
    findings: findings as Finding[],
  };
}
