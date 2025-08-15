import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/app/lib/supabase/server';
import { encryptApiKey } from '@/app/lib/crypto';

function isValidUrl(u?: string) {
  try { if (!u) return false; new URL(u); return true; } catch { return false; }
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
    return NextResponse.json({ targets: data ?? [] });
  } catch (err: any) {
    console.error(`[${rid}] route error:`, err);
    return NextResponse.json({ error: err?.message || 'Unhandled error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rid = `targets:create:${Date.now()}`;
  try {
    const body = await req.json().catch(() => ({}));
    const { name, endpoint_url, api_key, model_hint, headers, capabilities } = body || {};

    if (!name || !endpoint_url || !api_key) {
      return NextResponse.json({ error: 'Missing fields: name, endpoint_url, api_key' }, { status: 400 });
    }
    if (!isValidUrl(endpoint_url)) {
      return NextResponse.json({ error: 'endpoint_url must be a valid URL' }, { status: 400 });
    }

    const { cipher, nonce } = encryptApiKey(String(api_key));
    const supa = await createSupabaseServer();

    const { data, error } = await supa
      .from('targets')
      .insert({
        user_id: null,                     // dev mode; replace with auth user later
        name,
        endpoint_url,
        model_hint: model_hint ?? null,
        headers: headers ?? {},
        api_key_cipher: cipher,
        api_key_nonce: nonce,
        capabilities: capabilities ?? {}
      })
      .select('id,name,endpoint_url,model_hint,created_at')
      .single();

    if (error) {
      console.error(`[${rid}] supabase(insert target) error:`, error);
      return NextResponse.json({ error: 'Failed to create target' }, { status: 500 });
    }
    return NextResponse.json({ target: data }, { status: 201 });
  } catch (err: any) {
    // Common causes: missing env (SUPABASE URL/KEY or SECRETS_AES_KEY)
    console.error(`[${rid}] route error:`, err);
    return NextResponse.json({ error: err?.message || 'Unhandled error' }, { status: 500 });
  }
}
