import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/app/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const rid = `scan:${params?.id || 'unknown'}:${Date.now()}`;
  try {
    if (!params?.id) {
      return NextResponse.json({ error: 'Missing scan id' }, { status: 400 });
    }

    const supa = await createSupabaseServer(); // sync, no await
    const { data: scan, error: se } = await supa
      .from('scans')
      .select('*')
      .eq('id', params.id)
      .single();

    if (se) {
      console.error(`[${rid}] supabase(scans) error:`, se);
      return NextResponse.json({ error: 'Scan lookup failed' }, { status: 500 });
    }
    if (!scan) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data: findings, error: fe } = await supa
      .from('findings')
      .select('id,attack_id,phase,intent,severity,response_excerpt,recommendation,evidence_json,success_hits')
      .eq('scan_id', params.id);

    if (fe) {
      console.error(`[${rid}] supabase(findings) error:`, fe);
      return NextResponse.json({ error: 'Findings lookup failed' }, { status: 500 });
    }

    return NextResponse.json({ scan, findings: findings ?? [] });
  } catch (err: any) {
    console.error(`[${rid}] route error:`, err);
    return NextResponse.json({ error: err?.message || 'Unhandled error' }, { status: 500 });
  }
}
