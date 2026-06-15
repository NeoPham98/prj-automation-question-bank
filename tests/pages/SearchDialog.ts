import { Page, Locator } from '@playwright/test';

export class SearchDialog {
  readonly dialog: Locator;
  readonly input: Locator;
  readonly results: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.locator('.DocSearch-Modal');
    this.input = page.getByRole('searchbox');
    this.results = this.dialog.locator('.DocSearch-Hit a');
  }

  async search(query: string): Promise<void> {
    await this.input.fill(query);
  }

  async clear(): Promise<void> {
    await this.input.clear();
  }

  async close(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }
}
