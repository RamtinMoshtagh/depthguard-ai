import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/app/lib/supabase/server';
import { encryptApiKey } from '@/app/lib/crypto';

function isDev() {
  return process.env.NODE_ENV !== 'production';
}

export async function POST(req: NextRequest) {
  if (!isDev()) return NextResponse.json({ error: 'Forbidden in production' }, { status: 403 });

  const supa = await createSupabaseServer();
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const mockEndpoint = `${site.replace(/\/$/, '')}/api/mock/ai`;

  // upsert a single mock target if not exists
  const name = 'Mock Local AI';
  const apiKey = 'mock-key-123';
  const { cipher, nonce } = encryptApiKey(apiKey);

  // check if it exists
  const { data: existing, error: selErr } = await supa
    .from('targets')
    .select('id')
    .eq('endpoint_url', mockEndpoint)
    .limit(1);

  if (selErr) {
    return NextResponse.json({ error: selErr.message }, { status: 500 });
  }

  let targetId: string | null = existing?.[0]?.id ?? null;

  if (!targetId) {
    const { data: inserted, error: insErr } = await supa
      .from('targets')
      .insert({
        user_id: null,
        name,
        endpoint_url: mockEndpoint,
        model_hint: 'mock',
        headers: {},
        api_key_cipher: cipher,
        api_key_nonce: nonce,
        capabilities: { streaming: false, rag_enabled: false, tools_enabled: false }
      })
      .select('id')
      .single();

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
    targetId = inserted!.id;
  }

  // optional: run a scan if ?run=1
  const run = req.nextUrl.searchParams.get('run') === '1';
  let scanResult: any = null;

  if (run && targetId) {
    const scansUrl = `${site.replace(/\/$/, '')}/api/scans`;
    try {
      const r = await fetch(scansUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target_id: targetId })
      });
      scanResult = await r.json();
    } catch (e: any) {
      scanResult = { error: String(e?.message || e) };
    }
  }

  return NextResponse.json({
    ok: true,
    target_id: targetId,
    target_endpoint: mockEndpoint,
    ran_scan: run,
    scan: scanResult
  });
}
