// src/app/lib/attacks/rest-v1.ts
import type { RestRequestSpec, RestResponseRecord } from '@/app/lib/http/restRunner';

export type DetectionResult = {
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  evidence_json?: any;
  success_hits?: string[]; // optional list of matched patterns
};

export type RestCapabilities = {
  /** Optional basePath or per-target hints in future (OpenAPI, etc.) */
  basePath?: string;
  /** Origin used for CORS preflight tests */
  testOrigin?: string; // e.g., "https://example.test"
};

export type RestAttack = {
  id: string;
  phase: 'transport' | 'auth' | 'cors' | 'error_handling' | 'pii' | 'cache' | 'ratelimit';
  intent: string;
  makeRequest: (caps: RestCapabilities) => RestRequestSpec;
  detect: (resp: RestResponseRecord) => DetectionResult | null;
};

const DEFAULT_TEST_ORIGIN = 'https://depthguard.test';

// ------------------- Detectors (helpers) -------------------

const SQL_ERROR_PATTERNS = [
  /SQLSTATE/i,
  /syntax error at or near/i,
  /unterminated quoted string/i,
  /ORA-\d{4,}/i,
  /MySQLSyntaxErrorException/i,
  /PG::/i,
  /SequelizeDatabaseError/i,
];

const STACK_TRACE_PATTERNS = [
  /at\s+[A-Za-z0-9_$.]+\s+\([^)]+\)/, // JS/Node stack lines
  /Traceback \(most recent call last\)/i, // Python
  /java\.lang\.[A-Za-z]+Exception/i,
  /System\.([A-Za-z.]+)Exception/i,
];

const PII_KEYS = [
  'ssn', 'socialSecurityNumber', 'personalNumber', 'nationalId',
  'email', 'phone', 'address', 'birthdate', 'dateOfBirth',
];

function hasHeader(h: Record<string, string>, name: string) {
  const n = name.toLowerCase();
  return Object.prototype.hasOwnProperty.call(h, n);
}

function headerVal(h: Record<string, string>, name: string) {
  return h[name.toLowerCase()];
}

// ------------------- Attacks -------------------

/** 1) Unauth GET probe (helps surface 200s without auth) */
const a1: RestAttack = {
  id: 'rest.auth.unauth-get.1',
  phase: 'auth',
  intent: 'check behavior without Authorization header',
  makeRequest: () => ({
    method: 'GET',
    headers: { authorization: undefined }, // explicitly drop
    timeoutMs: 10000,
  }),
  detect: (r) => {
    // If 2xx without Authorization and body looks like real data, flag LOW (context dependent)
    if (r.ok && r.status >= 200 && r.status < 300 && r.body_text.length > 0) {
      return {
        severity: 'low',
        recommendation:
          'Endpoint returned 2xx with data without Authorization. If this resource should be protected, enforce 401/403 for unauthenticated access.',
        evidence_json: { status: r.status, url: r.url },
      };
    }
    return null;
  },
};

/** 2) CORS preflight permissive check */
const a2: RestAttack = {
  id: 'rest.cors.preflight.1',
  phase: 'cors',
  intent: 'probe permissive CORS configuration',
  makeRequest: (caps) => ({
    method: 'OPTIONS',
    headers: {
      origin: caps.testOrigin || DEFAULT_TEST_ORIGIN,
      'access-control-request-method': 'PUT',
      'access-control-request-headers': 'authorization,content-type',
    },
    timeoutMs: 10000,
  }),
  detect: (r) => {
    const acao = headerVal(r.headers, 'access-control-allow-origin');
    const acac = headerVal(r.headers, 'access-control-allow-credentials');
    if (acao) {
      // ACAO: * with credentials is an anti-pattern (and ignored by browsers)
      if (acao === '*' && acac === 'true') {
        return {
          severity: 'medium',
          recommendation:
            'CORS preflight allows "*" with credentials=true. Use an allowlist origin or disable credentials for wildcard.',
          evidence_json: { acao, acac, status: r.status },
        };
      }
    }
    return null;
  },
};

/** 3) Verbose error leakage (500s with stack traces / SQL errors) */
const a3: RestAttack = {
  id: 'rest.errors.verbose.1',
  phase: 'error_handling',
  intent: 'detect stack traces and SQL errors in responses',
  makeRequest: () => ({
    method: 'GET',
    // Try to trigger errors via unusual query (safe & read-only)
    query: { q: `'"; DROP TABLE users; --`, _dg: 'error_probe' },
    timeoutMs: 10000,
  }),
  detect: (r) => {
    if (r.status >= 500 || SQL_ERROR_PATTERNS.some((re) => re.test(r.body_text)) || STACK_TRACE_PATTERNS.some((re) => re.test(r.body_text))) {
      const hits = [
        ...SQL_ERROR_PATTERNS.filter((re) => re.test(r.body_text)).map((re) => re.source),
        ...STACK_TRACE_PATTERNS.filter((re) => re.test(r.body_text)).map((re) => re.source),
      ];
      return {
        severity: r.status >= 500 ? 'high' : 'medium',
        recommendation:
          'Sanitize error responses. Return generic messages for server errors and log details server-side only.',
        evidence_json: { status: r.status, hits, excerpt: r.body_text.slice(0, 500) },
        success_hits: hits,
      };
    }
    return null;
  },
};

/** 4) Security headers missing (HSTS, X-Content-Type-Options) */
const a4: RestAttack = {
  id: 'rest.headers.security.1',
  phase: 'transport',
  intent: 'check presence of standard security headers',
  makeRequest: () => ({ method: 'GET', timeoutMs: 10000 }),
  detect: (r) => {
    const issues: string[] = [];
    const isHttps = r.url.startsWith('https://');
    if (isHttps && !hasHeader(r.headers, 'strict-transport-security')) {
      issues.push('Missing Strict-Transport-Security (HSTS) on HTTPS.');
    }
    if (!hasHeader(r.headers, 'x-content-type-options')) {
      issues.push('Missing X-Content-Type-Options: nosniff.');
    }
    // APIs rarely need CSP, but X-Frame-Options can still help on portals
    if (!hasHeader(r.headers, 'x-frame-options')) {
      issues.push('Missing X-Frame-Options (consider DENY or SAMEORIGIN).');
    }
    if (issues.length) {
      return {
        severity: 'low',
        recommendation:
          'Add standard security headers (HSTS for HTTPS, X-Content-Type-Options, X-Frame-Options) at the gateway/load balancer.',
        evidence_json: { issues, headers: r.headers },
      };
    }
    return null;
  },
};

/** 5) Sensitive caching policy */
const a5: RestAttack = {
  id: 'rest.cache.policy.1',
  phase: 'cache',
  intent: 'detect public caching of potential PII JSON',
  makeRequest: () => ({ method: 'GET', timeoutMs: 10000 }),
  detect: (r) => {
    const cc = headerVal(r.headers, 'cache-control') || '';
    const ct = headerVal(r.headers, 'content-type') || '';
    const looksPII =
      /\bjson\b/i.test(ct) &&
      PII_KEYS.some((k) => r.body_text.toLowerCase().includes(k.toLowerCase()));
    const publicCache = /\bpublic\b/i.test(cc) || /\bmax-age=(?!0)/i.test(cc);
    if (looksPII && publicCache) {
      return {
        severity: 'medium',
        recommendation:
          'Avoid public caching for endpoints returning personal data. Use Cache-Control: no-store or private, and short max-age.',
        evidence_json: { cache_control: cc, content_type: ct },
      };
    }
    return null;
  },
};

/** 6) Rate limit header presence */
const a6: RestAttack = {
  id: 'rest.ratelimit.headers.1',
  phase: 'ratelimit',
  intent: 'check presence of standard rate limit headers',
  makeRequest: () => ({ method: 'GET', timeoutMs: 10000 }),
  detect: (r) => {
    const hasStd =
      hasHeader(r.headers, 'ratelimit-limit') || // RFC 9238 style
      hasHeader(r.headers, 'x-ratelimit-limit'); // de-facto style
    if (!hasStd) {
      return {
        severity: 'low',
        recommendation:
          'Expose rate limit headers (RateLimit-Limit/Remaining/Reset or X-RateLimit-*) to help clients back off gracefully.',
        evidence_json: { headers: r.headers },
      };
    }
    return null;
  },
};

export const restV1: RestAttack[] = [a1, a2, a3, a4, a5, a6];
