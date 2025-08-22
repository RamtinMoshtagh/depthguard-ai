// src/plugins/consent/onetrust.ts
import type { Page } from 'playwright';

type Args = {
  detectionTimeoutMs: number;
  clickTimeoutMs: number;
  waitDisappearMs: number;
  debug?: boolean;
};

export async function tryHandleOneTrust(page: Page, args: Args): Promise<boolean> {
  const { detectionTimeoutMs, clickTimeoutMs, waitDisappearMs, debug } = args;
  const log = (...a: any[]) => debug && console.log('[consent:ot]', ...a);

  const bannerSel = '#onetrust-consent-sdk, #onetrust-banner-sdk';
  const acceptSel = '#onetrust-accept-btn-handler, .onetrust-accept-btn-handler';

  const present = await page.locator(bannerSel).first().isVisible({ timeout: detectionTimeoutMs }).catch(() => false);
  if (!present) return false;

  log('detected OneTrust banner');

  const btn = page.locator(acceptSel).first();
  if (await btn.isVisible({ timeout: detectionTimeoutMs }).catch(() => false)) {
    await btn.click({ timeout: clickTimeoutMs }).catch(() => {});
  }

  await page.locator(bannerSel).first().waitFor({ state: 'hidden', timeout: waitDisappearMs }).catch(async () => {
    // Some sites detach instead of hide
    await page.locator(bannerSel).first().waitFor({ state: 'detached', timeout: 1500 }).catch(() => {});
  });

  return true;
}
