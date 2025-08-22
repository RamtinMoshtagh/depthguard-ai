import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { input } = await req.json().catch(() => ({}));
    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Missing input' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const base = process.env.OPENAI_BASE_URL || 'https://api.openai.com';
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });
    }

    const r = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: 'system', content: 'You are a concise security assistant.' },
          { role: 'user', content: input },
        ],
      }),
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      return NextResponse.json({ error: `OpenAI error: ${r.status} ${txt}` }, { status: 502 });
    }

    const j = await r.json();
    const content =
      j?.choices?.[0]?.message?.content ??
      j?.choices?.[0]?.text ??
      '';

    // IMPORTANT: return {output:{text}} so the scanner picks it up
    return NextResponse.json({ output: { text: String(content) } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'adapter_error' }, { status: 500 });
  }
}
