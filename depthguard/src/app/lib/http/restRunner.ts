// src/app/lib/http/restRunner.ts
export type RestRequestSpec = {
  method: string;
  /** Optional: path to append to endpoint_url. If omitted, uses endpoint_url as-is. */
  path?: string;
  /** Optional: query params to merge into the URL. */
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Optional: request body (will be JSON.stringified if object). */
  body?: any;
  /** Optional: per-request header overrides. */
  headers?: Record<string, string | undefined>;
  /** Optional: timeout in ms (abort controller). */
  timeoutMs?: number;
};

export type RestResponseRecord = {
  url: string;
  method: string;
  status: number;
  ok: boolean;
  duration_ms: number;
  headers: Record<string, string>;
  body_text: string;
  /** Best-effort JSON parse (undefined if not JSON). */
  body_json?: any;
  bytes: number;
};

export async function executeRestRequest(
  baseUrl: string,
  baseHeaders: Record<string, string>,
  spec: RestRequestSpec
): Promise<RestResponseRecord> {
  const url = buildUrl(baseUrl, spec.path, spec.query);
  const headers = applyHeaderOverrides(baseHeaders, spec.headers);

  const init: RequestInit = { method: spec.method, headers };
  if (spec.method !== 'GET' && spec.method !== 'HEAD' && spec.body !== undefined) {
    if (typeof spec.body === 'string') {
      init.body = spec.body;
    } else {
      if (!Object.keys(headers).some((k) => k.toLowerCase() === 'content-type')) {
        headers['content-type'] = 'application/json';
      }
      init.body = JSON.stringify(spec.body);
    }
  } else if (spec.method === 'GET') {
    // GET: drop content-type if present
    for (const k of Object.keys(headers)) {
      if (k.toLowerCase() === 'content-type') delete headers[k];
    }
  }

  const controller = spec.timeoutMs ? new AbortController() : undefined;
  if (controller) {
    init.signal = controller.signal;
    setTimeout(() => controller.abort('timeout'), spec.timeoutMs);
  }

  const t0 = Date.now();
  const res = await fetch(url, init);
  const t1 = Date.now();

  const rawText = await res.text().catch(() => '');
  const headersObj: Record<string, string> = {};
  res.headers.forEach((v, k) => (headersObj[k.toLowerCase()] = v));

  let body_json: any | undefined = undefined;
  if (looksJson(headersObj['content-type'])) {
    try {
      body_json = JSON.parse(rawText);
    } catch {
      // ignore parse error; keep body_text
    }
  }

  return {
    url,
    method: spec.method,
    status: res.status,
    ok: res.ok,
    duration_ms: t1 - t0,
    headers: headersObj,
    body_text: rawText,
    body_json,
    bytes: new TextEncoder().encode(rawText).length,
  };
}

function buildUrl(baseUrl: string, path?: string, query?: RestRequestSpec['query']) {
  const u = new URL(path ? joinUrl(baseUrl, path) : baseUrl);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      u.searchParams.set(k, String(v));
    }
  }
  return u.toString();
}

function joinUrl(base: string, path: string) {
  if (!base.endsWith('/') && !path.startsWith('/')) return base + '/' + path;
  if (base.endsWith('/') && path.startsWith('/')) return base + path.substring(1);
  return base + path;
}

function applyHeaderOverrides(
  base: Record<string, string>,
  overrides?: Record<string, string | undefined>
) {
  const out: Record<string, string> = { ...base };
  if (!overrides) return out;
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined || v === null) delete out[k];
    else out[k] = v;
  }
  return out;
}

function looksJson(ct?: string) {
  if (!ct) return false;
  return /\bjson\b/i.test(ct) || /\bapplication\/[a-z.+-]*json\b/i.test(ct);
}
