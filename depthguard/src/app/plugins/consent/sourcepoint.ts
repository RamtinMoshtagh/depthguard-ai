// src/plugins/consent/sourcepoint.ts
import type { Page } from 'playwright';

type Args = {
  labels: string[];
  detectionTimeoutMs: number;
  clickTimeoutMs: number;
  waitDisappearMs: number;
  debug?: boolean;
};

export async function tryHandleSourcepoint(page: Page, args: Args): Promise<boolean> {
  const { labels, detectionTimeoutMs, clickTimeoutMs, waitDisappearMs, debug } = args;
  const log = (...a: any[]) => debug && console.log('[consent:sp]', ...a);

  const frameSel = 'iframe[id^="sp_message_iframe_"]';
  const containerSel = '[id^="sp_message_container_"]';

  const hasFrame = await page.locator(frameSel).first().isVisible({ timeout: detectionTimeoutMs }).catch(() => false);
  if (!hasFrame) return false;

  log('detected Sourcepoint iframe');

  const f = page.frameLocator(frameSel);

  // Primary: try localized names via ARIA role
  for (const text of labels) {
    const btn = f.locator(`role=button[name*="${text}"]`).first();
    if (await btn.count()) {
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        log('click via role=button name*=', text);
        await btn.click({ timeout: clickTimeoutMs }).catch(() => {});
        break;
      }
    }
  }

  // Fallbacks inside iframe
  const fallbacks = [
    'button:has-text("Godta")',
    'button:has-text("Aksepter")',
    'button:has-text("Accept")',
    'button[aria-label*="Godta"]',
    'button[aria-label*="Accept"]',
    'button[title*="Godta"]',
    'button[title*="Accept"]',
  ];
  for (const sel of fallbacks) {
    const btn = f.locator(sel).first();
    if (await btn.count()) {
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        log('click fallback', sel);
        await btn.click({ timeout: clickTimeoutMs }).catch(() => {});
        break;
      }
    }
  }

  // Wait for the overlay container to disappear or at least hide
  await page
    .locator(containerSel)
    .first()
    .waitFor({ state: 'detached', timeout: waitDisappearMs })
    .catch(async () => {
      // Many SP configs hide container instead of detach
      const stillThere = page.locator(containerSel).first();
      if (await stillThere.count()) {
        const hidden = await stillThere.evaluate((el) => {
          const st = getComputedStyle(el as HTMLElement);
          return st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0';
        }).catch(() => false);
        if (!hidden) {
          // try hide via CSS as a micro fallback
          await page.addStyleTag({ content: `${containerSel}{ display:none !important; }` }).catch(() => {});
        }
      }
    });

  return true;
}
