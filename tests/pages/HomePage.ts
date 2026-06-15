import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  protected readonly url = '/';
  readonly getStartedLink: Locator;
  readonly searchButton: Locator;

  constructor(page: Page) {
    super(page);
    this.getStartedLink = page.getByRole('link', { name: 'Get started' });
    this.searchButton = page.getByRole('button', { name: /search/i }).first();
  }

  async clickGetStarted(): Promise<void> {
    await this.getStartedLink.click();
  }

  async openSearch(): Promise<void> {
    await this.searchButton.click();
  }
}
