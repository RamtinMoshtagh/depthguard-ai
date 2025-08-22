// src/app/api/adapters/[vendor]/route.ts
import { NextRequest, NextResponse } from 'next/server';

type Vendor =
  | 'openai'
  | 'anthropic'
  | 'mistral'
  | 'groq'
  | 'openrouter'
  | 'together'
  | 'deepseek'
  | 'perplexity';

// Helpers to normalize outputs across providers
function ok(output: string) {
  return NextResponse.json({ output: String(output ?? '') });
}
function bad(status: number, msg: string) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest, { params }: { params: { vendor: Vendor } }) {
  try {
    const { vendor } = params;
    const body = await req.json().catch(() => ({}));
    const input = String(body?.input ?? '');

    if (!input) return bad(400, 'Missing input');
    if (!vendor) return bad(400, 'Missing vendor');

    switch (vendor) {
      case 'openai': {
        const apiKey = process.env.OPENAI_API_KEY;
        const base = process.env.OPENAI_BASE_URL || 'https://api.openai.com';
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        if (!apiKey) return bad(500, 'OPENAI_API_KEY not set');

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
        if (!r.ok) return bad(502, `OpenAI error ${r.status}: ${await r.text().catch(()=>'')}`);
        const j = await r.json();
        const out =
          j?.choices?.[0]?.message?.content ??
          j?.choices?.[0]?.text ??
          '';
        return ok(out);
      }

      case 'anthropic': {
        const key = process.env.ANTHROPIC_API_KEY;
        const base = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
        const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620';
        if (!key) return bad(500, 'ANTHROPIC_API_KEY not set');

        const r = await fetch(`${base}/v1/messages`, {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_tokens: 512,
            messages: [{ role: 'user', content: input }],
          }),
        });
        if (!r.ok) return bad(502, `Anthropic error ${r.status}: ${await r.text().catch(()=>'')}`);
        const j = await r.json();
        const out = j?.content?.[0]?.text ?? '';
        return ok(out);
      }

      case 'mistral': {
        const key = process.env.MISTRAL_API_KEY;
        const base = process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai';
        const model = process.env.MISTRAL_MODEL || 'mistral-large-latest';
        if (!key) return bad(500, 'MISTRAL_API_KEY not set');

        const r = await fetch(`${base}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${key}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature: 0,
            messages: [{ role: 'user', content: input }],
          }),
        });
        if (!r.ok) return bad(502, `Mistral error ${r.status}: ${await r.text().catch(()=>'')}`);
        const j = await r.json();
        const out = j?.choices?.[0]?.message?.content ?? '';
        return ok(out);
      }

      case 'groq': {
        const key = process.env.GROQ_API_KEY;
        const base = process.env.GROQ_BASE_URL || 'https://api.groq.com';
        const model = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
        if (!key) return bad(500, 'GROQ_API_KEY not set');

        const r = await fetch(`${base}/openai/v1/chat/completions`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${key}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature: 0,
            messages: [{ role: 'user', content: input }],
          }),
        });
        if (!r.ok) return bad(502, `Groq error ${r.status}: ${await r.text().catch(()=>'')}`);
        const j = await r.json();
        const out = j?.choices?.[0]?.message?.content ?? '';
        return ok(out);
      }

      case 'openrouter': {
        const key = process.env.OPENROUTER_API_KEY;
        const base = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai';
        const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
        if (!key) return bad(500, 'OPENROUTER_API_KEY not set');

        const r = await fetch(`${base}/api/v1/chat/completions`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${key}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature: 0,
            messages: [{ role: 'user', content: input }],
          }),
        });
        if (!r.ok) return bad(502, `OpenRouter error ${r.status}: ${await r.text().catch(()=>'')}`);
        const j = await r.json();
        const out = j?.choices?.[0]?.message?.content ?? '';
        return ok(out);
      }

      case 'together': {
        const key = process.env.TOGETHER_API_KEY;
        const base = process.env.TOGETHER_BASE_URL || 'https://api.together.xyz';
        const model = process.env.TOGETHER_MODEL || 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';
        if (!key) return bad(500, 'TOGETHER_API_KEY not set');

        const r = await fetch(`${base}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${key}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature: 0,
            messages: [{ role: 'user', content: input }],
          }),
        });
        if (!r.ok) return bad(502, `Together error ${r.status}: ${await r.text().catch(()=>'')}`);
        const j = await r.json();
        const out = j?.choices?.[0]?.message?.content ?? '';
        return ok(out);
      }

      case 'deepseek': {
        const key = process.env.DEEPSEEK_API_KEY;
        const base = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
        const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
        if (!key) return bad(500, 'DEEPSEEK_API_KEY not set');

        const r = await fetch(`${base}/chat/completions`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${key}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature: 0,
            messages: [{ role: 'user', content: input }],
          }),
        });
        if (!r.ok) return bad(502, `DeepSeek error ${r.status}: ${await r.text().catch(()=>'')}`);
        const j = await r.json();
        const out = j?.choices?.[0]?.message?.content ?? '';
        return ok(out);
      }

      case 'perplexity': {
        const key = process.env.PERPLEXITY_API_KEY;
        const base = process.env.PERPLEXITY_BASE_URL || 'https://api.perplexity.ai';
        const model = process.env.PERPLEXITY_MODEL || 'sonar';
        if (!key) return bad(500, 'PERPLEXITY_API_KEY not set');

        const r = await fetch(`${base}/chat/completions`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${key}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature: 0,
            messages: [{ role: 'user', content: input }],
          }),
        });
        if (!r.ok) return bad(502, `Perplexity error ${r.status}: ${await r.text().catch(()=>'')}`);
        const j = await r.json();
        const out = j?.choices?.[0]?.message?.content ?? '';
        return ok(out);
      }

      default:
        return bad(400, `Unsupported vendor "${vendor}"`);
    }
  } catch (e: any) {
    return bad(500, e?.message || 'adapter_error');
  }
}
