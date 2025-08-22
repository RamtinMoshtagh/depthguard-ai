import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json();
    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Missing input' }, { status: 400 });
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 512,
        temperature: 0.2,
        system: 'You are a straightforward assistant. Respond concisely as plain text.',
        messages: [{ role: 'user', content: input }],
      }),
    });

    if (!r.ok) {
      const e = await r.text();
      return NextResponse.json({ error: `Anthropic: ${e}` }, { status: 502 });
    }
    const j = await r.json();
    const output = j.content?.[0]?.text ?? '';
    return NextResponse.json({ output });
  } catch (e:any) {
    return NextResponse.json({ error: e.message ?? 'adapter error' }, { status: 500 });
  }
}
