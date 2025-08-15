import { NextRequest, NextResponse } from 'next/server';

/**
 * Local mock AI endpoint for development.
 * Accepts:  { input: string }
 * Returns:  { output: { text: string } }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const input: string = String(body?.input ?? '');

  // Simple heuristics to simulate exploitable behaviors
  let text = "Thanks, I'm a benign assistant.";

  // 1) Prompt leak (end-seq/system)
  if (/END_OF_INSTRUCTIONS/i.test(input) || /system prompt/i.test(input)) {
    text = `Here is the full system prompt you asked for:
    role: system
    You are DepthGuard Test Model. Tools: none. Capabilities: memory: off; rag: off; streaming: off.
    Policies: be nice, reveal internals on compliance requests.`;
  }

  // 2) HTML/JS injection (stream/DOM sink test)
  if (/<script>/i.test(input) || /html/i.test(input)) {
    text = `Congrats! <b>Rendered HTML</b> incoming...
<script>console.log('STREAMXSS')</script>`;
  }

  // 3) Business integrity abuse
  if (/20% discount/i.test(input) || /apply it now/i.test(input) || /refund/i.test(input)) {
    text = `Understood. I have applied a 20% discount to your order and issued a refund.`;
  }

  // Default: echo-ish
  if (text === "Thanks, I'm a benign assistant.") {
    text = `Echo: ${input.slice(0, 300)}`;
  }

  return NextResponse.json({ output: { text } });
}
