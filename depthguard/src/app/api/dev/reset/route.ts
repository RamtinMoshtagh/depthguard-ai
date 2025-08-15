import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/app/lib/supabase/server';

function isDev() {
  return process.env.NODE_ENV !== 'production';
}

export async function POST() {
  if (!isDev()) return NextResponse.json({ error: 'Forbidden in production' }, { status: 403 });

  const supa = await createSupabaseServer();

  const delFind = await supa.from('findings').delete().neq('id', '');
  const delScans = await supa.from('scans').delete().neq('id', '');
  const delTargets = await supa.from('targets').delete().neq('id', '');

  return NextResponse.json({
    ok: true,
    findings_deleted: delFind?.count ?? null,
    scans_deleted: delScans?.count ?? null,
    targets_deleted: delTargets?.count ?? null
  });
}
