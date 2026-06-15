import { Page, Locator, expect } from '@playwright/test';

// Landing → Keycloak OIDC handshake.
// Landing button: src/components/pages/landing/index.tsx:194-199
// Keycloak realm: dang-nhap.gkebooks.com/realms/gkebooks
export class LoginPage {
  readonly landingLoginButton: Locator;
  readonly landingRegisterButton: Locator;
  readonly heroCtaButton: Locator;
  readonly keycloakUsername: Locator;
  readonly keycloakPassword: Locator;
  readonly keycloakSubmit: Locator;
  readonly keycloakError: Locator;

  constructor(private readonly page: Page) {
    this.landingLoginButton = page.getByRole('button', { name: 'Đăng nhập', exact: true });
    this.landingRegisterButton = page.getByRole('button', { name: 'Đăng ký', exact: true });
    this.heroCtaButton = page.getByRole('button', { name: 'Trải nghiệm miễn phí' });
    this.keycloakUsername = page.locator('#username');
    this.keycloakPassword = page.locator('#password');
    this.keycloakSubmit = page.locator('#kc-login');
    // Custom MobiFone Keycloak theme renders error as plain text "Invalid username or password."
    // (appears 3x in DOM: near username, near password, below form). No class anchor available.
    this.keycloakError = page.getByText('Invalid username or password.', { exact: false }).first();
  }

  async gotoLanding(): Promise<void> {
    const baseUrl =
      process.env.QB_BASE_URL || 'https://question-bank-dev.gkebooks.click';
    await this.page.goto(baseUrl);
  }

  async openKeycloakFromHeader(): Promise<void> {
    await this.landingLoginButton.first().click();
    await this.page.waitForURL(/dang-nhap\.gkebooks\.com/, { timeout: 30_000 });
  }

  async fillCredentials(user: string, pass: string): Promise<void> {
    await this.keycloakUsername.fill(user);
    await this.keycloakPassword.fill(pass);
  }

  async submit(): Promise<void> {
    await this.keycloakSubmit.click();
  }

  async expectLandedOnDashboard(): Promise<void> {
    await this.page.waitForURL(/\/dashboard(\?|$)/, { timeout: 30_000 });
    await expect(
      this.page.getByRole('heading', { name: 'Tổng quan', exact: true }),
    ).toBeVisible({ timeout: 15_000 });
  }

  async expectOnKeycloak(): Promise<void> {
    await expect(this.page).toHaveURL(/dang-nhap\.gkebooks\.com/);
  }
}
