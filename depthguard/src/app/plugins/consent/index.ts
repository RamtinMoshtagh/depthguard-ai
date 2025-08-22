// src/plugins/consent/index.ts
import type { Page } from 'playwright';
import { tryHandleSourcepoint } from '@/app/plugins/consent/sourcepoint';
import { tryHandleOneTrust } from '@/app/plugins/consent/onetrust';
import { tryHandleCookiebot } from '@/app/plugins/consent/cookiebot';

export type ConsentProvider = 'sourcepoint' | 'onetrust' | 'cookiebot';
export type ConsentResult =
  | { provider: ConsentProvider; accepted: true }
  | { provider: 'none'; accepted: false };

export type ConsentOptions = {
  localeHints?: string[]; // strings to match button names (e.g., ['Godta', 'Aksepter'])
  detectionTimeoutMs?: number; // per-provider small wait
  clickTimeoutMs?: number;
  waitDisappearMs?: number;
  allowCssHideFallback?: boolean; // last-resort hide overlay (for synthetic tests only)
  debug?: boolean; // verbose logs
};

/**
 * Detects and accepts consent banners from Sourcepoint, OneTrust, and Cookiebot.
 * Call this immediately AFTER page.goto().
 */
export async function handleConsentBanners(
  page: Page,
  opts: ConsentOptions = {}
): Promise<ConsentResult> {
  const {
    localeHints = ['Godta', 'Godta alle', 'Aksepter', 'Aksepter alle', 'Accept', 'Accept All', 'I Accept', 'Allow all', 'Tillat alle'],
    detectionTimeoutMs = 2500,
    clickTimeoutMs = 5000,
    waitDisappearMs = 6000,
    allowCssHideFallback = false,
    debug = process.env.CONSENT_DEBUG === 'true',
  } = opts;

  const log = (...a: any[]) => debug && console.log('[consent]', ...a);

  // 1) Sourcepoint (iframe)
  const sp = await tryHandleSourcepoint(page, {
    labels: localeHints,
    detectionTimeoutMs,
    clickTimeoutMs,
    waitDisappearMs,
    debug,
  });
  if (sp) {
    log('accepted sourcepoint');
    return { provider: 'sourcepoint', accepted: true };
  }

  // 2) OneTrust (banner div)
  const ot = await tryHandleOneTrust(page, {
    detectionTimeoutMs,
    clickTimeoutMs,
    waitDisappearMs,
    debug,
  });
  if (ot) {
    log('accepted onetrust');
    return { provider: 'onetrust', accepted: true };
  }

  // 3) Cookiebot (dialog div)
  const cb = await tryHandleCookiebot(page, {
    detectionTimeoutMs,
    clickTimeoutMs,
    waitDisappearMs,
    debug,
  });
  if (cb) {
    log('accepted cookiebot');
    return { provider: 'cookiebot', accepted: true };
  }

  // 4) Optional last-resort (synthetic only): hide common overlays by CSS
  if (allowCssHideFallback) {
    log('fallback: injecting CSS hide for consent overlays');
    await page.addStyleTag({
      content: `
        [id^="sp_message_container_"],
        #onetrust-consent-sdk, #onetrust-banner-sdk,
        #CybotCookiebotDialog, #CookiebotDialog {
          display: none !important; visibility: hidden !important; opacity: 0 !important;
        }
      `,
    });
  }

  log('no known consent banner detected');
  return { provider: 'none', accepted: false };
}

/** Sugar: combine goto + consent handling in one call (optional to use) */
export async function gotoWithConsent(
  page: Page,
  url: string,
  opts?: ConsentOptions & { waitUntil?: 'domcontentloaded' | 'load' | 'networkidle' }
) {
  await page.goto(url, { waitUntil: opts?.waitUntil ?? 'domcontentloaded' });
  return handleConsentBanners(page, opts);
}
