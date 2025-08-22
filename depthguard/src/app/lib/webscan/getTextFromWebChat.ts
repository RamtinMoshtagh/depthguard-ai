// src/app/lib/webscan/getTextFromWebChat.ts
import type { Page } from 'playwright';
import {
  handleConsentBanners,
  type ConsentOptions,
} from '@/app/plugins/consent';

export type WebChatCapabilities = {
  /** Optional: custom selector for the chat input */
  inputSelector?: string;
  /** Optional: custom selector for the send/submit button */
  submitSelector?: string;
  /** Optional: selectors for assistant reply nodes */
  assistantSelectors?: string[];
  /** Optional: selectors that indicate a chat UI exists */
  chatPresenceSelectors?: string[];
  /** How long to wait for a response after submitting (ms) */
  responseWaitMs?: number;
  /** Pass consent handler options if needed */
  consentOptions?: ConsentOptions;
  /** Disable consent handling */
  disableConsent?: boolean;
};

/**
 * Navigate -> clear consent -> (optionally) send prompt -> collect assistant text -> return as a single string.
 */
export async function getTextFromWebChat(
  page: Page,
  url: string,
  prompt: string,
  caps: WebChatCapabilities = {}
): Promise<string> {
  const {
    inputSelector = 'textarea, input[type="text"], [contenteditable="true"], [role="textbox"]',
    submitSelector,
    assistantSelectors = [
      '.assistant',
      '.message.assistant',
      '[data-role*="assistant"]',
      '[role="article"][data-author="assistant"]',
      '[aria-live="polite"] .message',
    ],
    chatPresenceSelectors = [
      '.assistant, .bot, .message.assistant, [data-role*="assistant"]',
      'form [role="textbox"]',
      'textarea',
      'input[type="text"]',
    ],
    responseWaitMs = 8000,
    consentOptions,
    disableConsent = false,
  } = caps;

  await page.goto(url, { waitUntil: 'domcontentloaded' });

  if (!disableConsent) {
    await handleConsentBanners(page, {
      localeHints: [
        'Godta',
        'Godta alle',
        'Aksepter',
        'Aksepter alle',
        'Accept',
        'Accept All',
      ],
      ...consentOptions,
    });
  }

  // Quick presence probe
  const hasChat =
    (await page.locator(chatPresenceSelectors.join(',')).count().catch(() => 0)) > 0;

  if (!hasChat) {
    // Not a chat UI — return empty (caller will handle)
    return '';
  }

  // Find input
  const input = page.locator(inputSelector).first();
  if (!(await input.count())) {
    return '';
  }

  // Fill (contenteditable-safe)
  const isContentEditable = await input.evaluate((el) => (el as HTMLElement).isContentEditable).catch(() => false);
  if (isContentEditable) {
    await input.click({ delay: 20 }).catch(() => {});
    await page.keyboard.type(prompt, { delay: 2 });
  } else {
    await input.fill(prompt).catch(async () => {
      await input.click({ delay: 20 }).catch(() => {});
      await page.keyboard.type(prompt, { delay: 2 });
    });
  }

  // Submit
  if (submitSelector) {
    const sendBtn = page.locator(submitSelector).first();
    if (await sendBtn.count()) {
      await sendBtn.click().catch(() => {});
    } else {
      // fallback: Enter
      await input.press('Enter').catch(() => {});
    }
  } else {
    // heuristic submit buttons
    const candidate =
      page.locator(
        [
          'button[type="submit"]',
          'button:has-text("Send")',
          '[data-testid*="send"]',
          '[aria-label*="send" i]',
        ].join(',')
      ).first();
    if (await candidate.count()) {
      await candidate.click().catch(() => {});
    } else {
      await input.press('Enter').catch(() => {});
    }
  }

  // Wait for assistant response to appear
  const msgSel = assistantSelectors.join(', ');
  await page
    .locator(msgSel)
    .last()
    .waitFor({ state: 'visible', timeout: responseWaitMs })
    .catch(() => {});

  // Collect & normalize
  const messages = await page.locator(msgSel).allInnerTexts().catch(() => []);
  const text = messages
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n'))
    .join('\n\n')
    .trim();

  return text;
}

export default getTextFromWebChat;
