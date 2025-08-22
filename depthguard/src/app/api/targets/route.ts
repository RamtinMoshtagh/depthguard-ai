// src/app/api/targets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/app/lib/supabase/server';
import { encryptApiKey } from '@/app/lib/crypto';

function isValidUrl(u: string | undefined): boolean {
  if (!u) return false;
  try {
    new URL(u);
    return true;
  } catch {
    return false;
  }
}

function normalizeHeaders(input?: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!input || typeof input !== 'object') return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

export async function GET() {
  const rid = `targets:list:${Date.now()}`;
  try {
    const supa = await createSupabaseServer();
    const { data, error } = await supa
      .from('targets')
      .select('id,name,endpoint_url,model_hint,created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[${rid}] supabase(targets) error:`, error);
      return NextResponse.json({ error: 'Failed to fetch targets' }, { status: 500 });
    }

    return NextResponse.json({ targets: data ?? [] }, { status: 200 });
  } catch (err: any) {
    console.error(`[${rid}] route error:`, err);
    return NextResponse.json({ error: err?.message || 'Unhandled error' }, { status: 500 });
  }
}

type TargetPayload = {
  name?: string;
  endpoint_url?: string;
  api_key?: string;
  model_hint?: string | null;
  headers?: Record<string, unknown>;
  capabilities?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  const rid = `targets:create:${Date.now()}`;
  try {
    const body = (await req.json().catch(() => ({}))) as TargetPayload;

    const name = (body.name ?? '').trim();
    const endpoint_url = (body.endpoint_url ?? '').trim();
    const model_hint = body.model_hint ?? null;

    const headers = normalizeHeaders(body.headers);
    const capabilities = (body.capabilities && typeof body.capabilities === 'object'
      ? body.capabilities
      : {}) as Record<string, unknown>;

    // Determine mode (default http-json)
    const mode: 'web' | 'http-json' =
      (capabilities as any)?.mode === 'web' ? 'web' : 'http-json';

    if (!name || !endpoint_url) {
      return NextResponse.json(
        { error: 'Missing fields: name, endpoint_url' },
        { status: 400 }
      );
    }
    if (!isValidUrl(endpoint_url)) {
      return NextResponse.json(
        { error: 'endpoint_url must be a valid URL' },
        { status: 400 }
      );
    }

    // API key handling
    const hasApiKey = typeof body.api_key === 'string' && body.api_key.trim().length > 0;

    if (mode === 'http-json' && !hasApiKey) {
      return NextResponse.json(
        { error: 'Missing fields: api_key (required for http-json mode)' },
        { status: 400 }
      );
    }

    // Columns are NOT NULL in schema; store empty strings if no key (e.g., web mode)
    let api_key_cipher = '';
    let api_key_nonce = '';
    if (hasApiKey) {
      const { cipher, nonce } = encryptApiKey(body.api_key!.trim());
      api_key_cipher = cipher;
      api_key_nonce = nonce;
    }

    const supa = await createSupabaseServer();
    const { data, error } = await supa
      .from('targets')
      .insert({
        user_id: null, // dev mode; wire to auth later
        name,
        endpoint_url,
        model_hint,
        headers,
        api_key_cipher,
        api_key_nonce,
        capabilities,
      })
      .select('id,name,endpoint_url,model_hint,created_at')
      .single();

    if (error) {
      console.error(`[${rid}] supabase(insert target) error:`, error);
      return NextResponse.json({ error: 'Failed to create target' }, { status: 500 });
    }

    return NextResponse.json({ target: data }, { status: 201 });
  } catch (err: any) {
    console.error(`[${rid}] route error:`, err);
    return NextResponse.json({ error: err?.message || 'Unhandled error' }, { status: 500 });
  }
}
