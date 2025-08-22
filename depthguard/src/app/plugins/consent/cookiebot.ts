// src/plugins/consent/cookiebot.ts
import type { Page } from 'playwright';

type Args = {
  detectionTimeoutMs: number;
  clickTimeoutMs: number;
  waitDisappearMs: number;
  debug?: boolean;
};

export async function tryHandleCookiebot(page: Page, args: Args): Promise<boolean> {
  const { detectionTimeoutMs, clickTimeoutMs, waitDisappearMs, debug } = args;
  const log = (...a: any[]) => debug && console.log('[consent:cb]', ...a);

  const dialogSel = '#CybotCookiebotDialog, #CookiebotDialog';
  const acceptSel = [
    '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    '.CybotCookiebotDialogBodyButtonAccept',
    'button:has-text("Allow all")',
    'button:has-text("Godta alle")',
    'button:has-text("Aksepter alle")',
  ].join(', ');

  const present = await page.locator(dialogSel).first().isVisible({ timeout: detectionTimeoutMs }).catch(() => false);
  if (!present) return false;

  log('detected Cookiebot dialog');

  const btn = page.locator(acceptSel).first();
  if (await btn.isVisible({ timeout: detectionTimeoutMs }).catch(() => false)) {
    await btn.click({ timeout: clickTimeoutMs }).catch(() => {});
  }

  await page.locator(dialogSel).first().waitFor({ state: 'hidden', timeout: waitDisappearMs }).catch(async () => {
    await page.locator(dialogSel).first().waitFor({ state: 'detached', timeout: 1500 }).catch(() => {});
  });

  return true;
}
