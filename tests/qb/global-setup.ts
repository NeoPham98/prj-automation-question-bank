import { test as setup, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const authFile = path.resolve('.auth/admin.json');

setup.setTimeout(120_000);

setup('authenticate via Keycloak', async ({ page, context }) => {
  const user = process.env.KEYCLOAK_TEST_USER;
  const pass = process.env.KEYCLOAK_TEST_PASS;
  const baseUrl = process.env.QB_BASE_URL || 'https://question-bank-dev.gkebooks.click';

  if (!user || !pass) {
    throw new Error(
      'Missing KEYCLOAK_TEST_USER or KEYCLOAK_TEST_PASS in .env. ' +
        'Copy .env.example to .env and fill credentials. Disable MFA on the test account.',
    );
  }

  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  // Clear any stale cookies from prior failed runs.
  await context.clearCookies();

  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) console.log('[nav]', f.url());
  });

  // Landing → click "Đăng nhập" → NextAuth signIn('keycloak') → Keycloak realm.
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  console.log('[step] landing loaded');

  const loginBtn = page.getByRole('button', { name: 'Đăng nhập', exact: true }).first();
  await loginBtn.waitFor({ state: 'visible', timeout: 15_000 });

  // Wait for nav to either Keycloak or signin error page.
  await Promise.all([
    page.waitForURL(
      (url) => /dang-nhap\.gkebooks\.com/.test(url.href) || /\/api\/auth\/(signin|error)/.test(url.href),
      { timeout: 30_000 },
    ),
    loginBtn.click(),
  ]);

  const afterClickUrl = page.url();
  console.log('[step] after click URL:', afterClickUrl);

  if (!/dang-nhap\.gkebooks\.com/.test(afterClickUrl)) {
    throw new Error(
      `Click "Đăng nhập" did not redirect to Keycloak. Landed on: ${afterClickUrl}\n` +
        `Likely cause: dev NextAuth env (KEYCLOAK_CLIENT_ID/SECRET/ISSUER, NEXTAUTH_URL) is misconfigured.`,
    );
  }

  console.log('[step] on Keycloak login page');

  // Standard Keycloak login form (DOM ids #username #password #kc-login).
  await page.locator('#username').fill(user);
  await page.locator('#password').fill(pass);
  await page.locator('#kc-login').click();

  await page.waitForURL(/\/dashboard(\?|$)/, { timeout: 30_000 });
  await expect(page.getByText('Tổng quan', { exact: true }).first()).toBeVisible({
    timeout: 15_000,
  });

  await context.storageState({ path: authFile });
  console.log('[step] storageState saved to', authFile);
});
