import { Page, Locator, expect } from '@playwright/test';

// ToastColor (src/components/ToastColor/index.tsx) wraps raw sonner toast()
// — no `data-type` attr. Detect error via XCircle icon class `text-red-600`.
export function errorToastLocator(page: Page): Locator {
  return page.locator('[data-sonner-toast]:has(svg.text-red-600)');
}

export async function expectNoErrorToast(page: Page, timeoutMs = 2_000): Promise<void> {
  await expect(errorToastLocator(page)).toHaveCount(0, { timeout: timeoutMs });
}

// Race the supplied success-condition promise against the error toast.
// If error toast renders first → throw with toast text (test fails with
// the actual server/validation message instead of a generic timeout).
export async function raceAgainstErrorToast<T>(
  page: Page,
  successPromise: Promise<T>,
  label: string,
  timeoutMs = 20_000,
): Promise<T> {
  const errorToast = errorToastLocator(page).first();
  const failure = errorToast
    .waitFor({ state: 'visible', timeout: timeoutMs })
    .then(async (): Promise<never> => {
      const text = await errorToast.textContent();
      throw new Error(`${label} failed — toast: ${(text || '').trim() || '<empty>'}`);
    });

  return (await Promise.race([successPromise, failure])) as T;
}
