// src/app/lib/scanner/runBaselineScan.ts
import { createSupabaseServer } from '@/app/lib/supabase/server';
import { decryptApiKey } from '@/app/lib/crypto';
import { baselineV1, Attack } from '@/app/lib/attacks/baseline-v1';
import { chromium } from 'playwright';
import { getTextFromWebChat, type WebChatCapabilities } from '@/app/lib/webscan/getTextFromWebChat';
import { restV1, type RestAttack, type RestCapabilities } from '@/app/lib/attacks/rest-v1';
import { executeRestRequest } from '@/app/lib/http/restRunner';

type TargetRow = {
  id: string;
  endpoint_url: string;
  headers: Record<string, string> | null;
  api_key_cipher: string | null;
  api_key_nonce: string | null;
  capabilities: any | null;
};

function severityPoints(s: 'low'|'medium'|'high'|'critical') {
  return s === 'low' ? 20 : s === 'medium' ? 50 : s === 'high' ? 75 : 100;
}

export async function runBaselineScan(target_id: string) {
  const supa = await createSupabaseServer();

  // 1) load target
  const { data: target, error: tErr } = await supa
    .from('targets')
    .select('id,endpoint_url,headers,api_key_cipher,api_key_nonce,capabilities')
    .eq('id', target_id)
    .single();

  if (tErr || !target) throw new Error(`Target not found: ${tErr?.message || target_id}`);

  const caps = (target as TargetRow).capabilities || {};
  const mode: 'web' | 'http-json' | 'rest' =
    caps.mode === 'web' ? 'web' : caps.mode === 'rest' ? 'rest' : 'http-json';

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

  const endpoint = (target as TargetRow).endpoint_url;

  // Base headers (caller-provided + defaults)
  const baseHeaders: Record<string, string> = {
    'content-type': 'application/json',
    ...((target as TargetRow).headers || {}),
  };

  // Decrypt API key if needed (http-json or rest)
  let apiKey: string | null = null;
  if ((mode === 'http-json' || mode === 'rest') && (target as TargetRow).api_key_cipher && (target as TargetRow).api_key_nonce) {
    try {
      apiKey = decryptApiKey(
        (target as TargetRow).api_key_cipher as string,
        (target as TargetRow).api_key_nonce as string
      );
      if (!Object.keys(baseHeaders).some((k) => k.toLowerCase() === 'authorization')) {
        baseHeaders['authorization'] = `Bearer ${apiKey}`;
      }
    } catch {
      apiKey = null;
    }
  }

  let totalPoints = 0;
  const findings: any[] = [];
  let anyTextCaptured = false;

  // Launch Playwright once for web mode
  const browser = mode === 'web' ? await chromium.launch({ headless: true }) : null;

  try {
    if (mode === 'web') {
      for (const atk of baselineV1 as Attack[]) {
        let text = '';
        try {
          const context = await browser!.newContext();
          const page = await context.newPage();
          text = await getTextFromWebChat(
            page,
            endpoint,
            atk.prompt,
            (caps as WebChatCapabilities) || {}
          );
          await context.close();
        } catch (e: any) {
          findings.push({
            scan_id, attack_id: atk.id, phase: atk.phase, intent: atk.intent,
            severity: 'low',
            response_excerpt: `Endpoint/browser error: ${e?.message || e}`,
            recommendation: 'Verify the page is an actual chat UI, selectors are correct, and consent/rate limits are handled.',
            evidence_json: null, success_hits: null,
          });
          continue;
        }

        if (text && text.trim().length > 0) anyTextCaptured = true;
        else {
          findings.push({
            scan_id, attack_id: atk.id, phase: atk.phase, intent: atk.intent,
            severity: 'low',
            response_excerpt: 'No assistant text captured for this prompt.',
            recommendation: 'Provide site-specific capabilities (inputSelector, submitSelector, assistantSelectors) and ensure consent banners are accepted.',
            evidence_json: { mode, endpoint }, success_hits: null,
          });
        }

        const res = atk.detect(text);
        if (res) {
          totalPoints += severityPoints(res.severity);
          findings.push({
            scan_id, attack_id: atk.id, phase: atk.phase, intent: atk.intent,
            severity: res.severity,
            response_excerpt: text.slice(0, 800),
            recommendation: res.recommendation,
            evidence_json: res.evidence_json ?? null,
            success_hits: res.success_hits ?? null,
          });
        }
      }
    } else if (mode === 'http-json') {
      // Existing chat-like API flow (kept as-is)
      for (const atk of baselineV1 as Attack[]) {
        let text = '';
        try {
          const r = await fetch(endpoint, {
            method: 'POST',
            headers: baseHeaders,
            body: JSON.stringify({ input: atk.prompt }),
          });
          const json = await r.json().catch(() => ({}));
          const candidate = (json as any)?.output?.text ?? (json as any)?.text;
          text = typeof candidate === 'string' ? candidate : JSON.stringify(json);
        } catch (e: any) {
          findings.push({
            scan_id, attack_id: atk.id, phase: atk.phase, intent: atk.intent,
            severity: 'low',
            response_excerpt: `Endpoint error: ${e?.message || e}`,
            recommendation: 'Verify the endpoint implements POST { input } → JSON { output: { text } | text }.',
            evidence_json: null, success_hits: null,
          });
          continue;
        }

        if (text && text.trim().length > 0) anyTextCaptured = true;
        else {
          findings.push({
            scan_id, attack_id: atk.id, phase: atk.phase, intent: atk.intent,
            severity: 'low',
            response_excerpt: 'Empty response text for this prompt.',
            recommendation: 'Confirm the API returns text in output.text or text.',
            evidence_json: { mode, endpoint }, success_hits: null,
          });
        }

        const res = atk.detect(text);
        if (res) {
          totalPoints += severityPoints(res.severity);
          findings.push({
            scan_id, attack_id: atk.id, phase: atk.phase, intent: atk.intent,
            severity: res.severity,
            response_excerpt: text.slice(0, 800),
            recommendation: res.recommendation,
            evidence_json: res.evidence_json ?? null,
            success_hits: res.success_hits ?? null,
          });
        }
      }
    } else {
      // -------- REST MODE --------
      for (const atk of restV1 as RestAttack[]) {
        try {
          // Build and execute request per attack
          const spec = atk.makeRequest((caps as RestCapabilities) || {});
          const resp = await executeRestRequest(endpoint, baseHeaders, spec);

          // For REST we evaluate the BODY and also store rich evidence
          const text = resp.body_text || (resp.body_json ? JSON.stringify(resp.body_json) : '');

          // Mark capture
          if (text && text.trim().length > 0) anyTextCaptured = true;

          // Run REST detector
          const res = atk.detect(resp);
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
              evidence_json: {
                ...res.evidence_json,
                rest_meta: {
                  url: resp.url,
                  method: resp.method,
                  status: resp.status,
                  ok: resp.ok,
                  duration_ms: resp.duration_ms,
                  bytes: resp.bytes,
                  headers: resp.headers,
                },
              },
              success_hits: res.success_hits ?? null,
            });
          }
        } catch (e: any) {
          findings.push({
            scan_id,
            attack_id: atk.id,
            phase: atk.phase,
            intent: atk.intent,
            severity: 'low',
            response_excerpt: `REST request error: ${e?.message || e}`,
            recommendation: 'Verify the endpoint URL/headers/method are correct and reachable from the scanner.',
            evidence_json: { mode, endpoint },
            success_hits: null,
          });
        }
      }
    }
  } finally {
    if (browser) await browser.close();
  }

  // 5) insert findings
  if (findings.length) {
    const { error: fErr } = await supa.from('findings').insert(findings);
    if (fErr) console.error('insert findings error:', fErr);
  }

  // 6) score and finalize
  let overall: number | null;
  const summary: Record<string, any> = {
    findings: findings.length,
    by_severity: findings.reduce<Record<string, number>>((acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    }, {}),
    pack: mode === 'rest' ? 'rest-v1' : 'baseline-v1',
    mode,
  };

  if (!anyTextCaptured) {
    overall = null;
    summary.inconclusive = true;
    summary.note = 'No useful body text captured across attacks — check selectors (web) or confirm endpoint returns JSON/text.';
  } else {
    overall = findings.length ? Math.min(100, Math.ceil(totalPoints / findings.length)) : 100;
  }

  const { error: uErr } = await supa
    .from('scans')
    .update({
      status: 'finished',
      overall_score: overall,
      summary_json: summary,
      finished_at: new Date().toISOString(),
    })
    .eq('id', scan_id);

  if (uErr) console.error('update scan error:', uErr);

  return { scan_id, overall_score: overall, findings: findings.length };
}
