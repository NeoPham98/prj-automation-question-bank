import { test, expect } from '../../fixtures/qb.fixture';
import { LoginPage } from '../../pages/LoginPage';

// xlsx mapping: VI. Đăng nhập (R298-313)
// Real Keycloak flow — bypass storageState set by qb-setup.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login via Keycloak', () => {
  test('valid credentials land on /dashboard with "Tổng quan"', async ({ page }) => {
    const user = process.env.KEYCLOAK_TEST_USER;
    const pass = process.env.KEYCLOAK_TEST_PASS;
    test.skip(!user || !pass, 'KEYCLOAK_TEST_USER/PASS missing in .env');

    const login = new LoginPage(page);
    await login.gotoLanding();
    await login.openKeycloakFromHeader();
    await login.fillCredentials(user!, pass!);
    await login.submit();
    await login.expectLandedOnDashboard();
  });

  test('invalid password stays on Keycloak with error', async ({ page }) => {
    const user = process.env.KEYCLOAK_TEST_USER;
    test.skip(!user, 'KEYCLOAK_TEST_USER missing in .env');

    const login = new LoginPage(page);
    await login.gotoLanding();
    await login.openKeycloakFromHeader();
    await login.fillCredentials(user!, 'wrong-password-' + Date.now());
    await login.submit();

    await login.expectOnKeycloak();
    await expect(login.keycloakError).toBeVisible({ timeout: 10_000 });
  });

  test('empty credentials block submission', async ({ page }) => {
    const login = new LoginPage(page);
    await login.gotoLanding();
    await login.openKeycloakFromHeader();
    await login.submit();

    await login.expectOnKeycloak();
    await expect(login.keycloakUsername).toBeVisible();
  });
});
