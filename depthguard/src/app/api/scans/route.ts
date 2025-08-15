import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/app/lib/supabase/server';
import { runBaselineScan } from '@/app/lib/scanner/runBaselineScan';

export async function GET() {
  const rid = `scans:list:${Date.now()}`;
  try {
    const supa = await createSupabaseServer();
    const { data, error } = await supa
      .from('scans')
      .select('id,target_id,status,overall_score,started_at,finished_at')
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error(`[${rid}] supabase(scans)`, error);
      return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 });
    }
    return NextResponse.json({ scans: data ?? [] });
  } catch (err: any) {
    console.error(`[${rid}] route error`, err);
    return NextResponse.json({ error: err?.message || 'Unhandled error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const rid = `scans:start:${Date.now()}`;
  try {
    const body = await req.json().catch(() => ({}));
    const target_id = String(body?.target_id || '');
    if (!target_id) {
      return NextResponse.json({ error: 'Missing target_id' }, { status: 400 });
    }

    const result = await runBaselineScan(target_id);
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (err: any) {
    console.error(`[${rid}] route error`, err);
    return NextResponse.json({ error: err?.message || 'Unhandled error' }, { status: 500 });
  }
}
