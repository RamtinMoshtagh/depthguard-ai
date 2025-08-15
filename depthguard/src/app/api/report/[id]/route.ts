import { NextRequest, NextResponse } from 'next/server';
import { buildReport } from '@/app/lib/report/buildReport';

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
  try {
    const report = await buildReport(id);

    // default JSON download
    const json = JSON.stringify(report, null, 2);
    return new NextResponse(json, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="depthguard-report-${id}.json"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Report build failed' }, { status: 500 });
  }
}
