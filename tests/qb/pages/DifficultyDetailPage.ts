import { Page, Locator, expect } from '@playwright/test';

// KĐK (Khung độ khó) list + detail.
// Sources:
//   src/components/pages/difficulty-frame/index.tsx:490-529 — list h1
//   src/components/pages/difficulty-frame/components/DifficultyFrameworkCard.tsx:92-94 — card nav
//   src/components/pages/difficulty-frame/DifficultyFrameworkDetail.tsx:209-211,225-230 — breadcrumb + h1
//   src/components/pages/difficulty-frame/components/DifficultyFrameworkLevelsList.tsx:77-79 — level rows
export class DifficultyDetailPage {
  readonly listHeading: Locator;
  readonly listEmptyState: Locator;
  readonly frameworkCards: Locator;
  readonly detailHeading: Locator;
  readonly detailSubtitle: Locator;
  readonly levelsEmptyState: Locator;
  readonly levelRows: Locator;
  readonly breadcrumbParent: Locator;

  constructor(private readonly page: Page) {
    // List page (/difficulty).
    this.listHeading = page.getByRole('heading', {
      name: 'Quản lý khung độ khó',
      exact: true,
    });
    this.listEmptyState = page.getByText('Chưa có khung độ khó nào', { exact: true });
    this.frameworkCards = page.locator('h3.line-clamp-2');

    // Detail page (/difficulty/[id]).
    // h1 = framework.name (text-2xl font-bold tracking-tight).
    this.detailHeading = page.locator('h1.text-2xl.font-bold').first();
    this.detailSubtitle = page.getByText(
      'Mỗi ngân hàng có khung chương trình và khung độ khó riêng',
      { exact: true },
    );
    // PageBreadcrumb renders <Link href="/difficulty">. Use nav landmark anchor to disambiguate from sidebar.
    this.breadcrumbParent = page.locator('nav[aria-label="breadcrumb"] a[href="/difficulty"]').first();
    this.levelsEmptyState = page.getByText('Chưa có mức độ nào', { exact: true });
    // Each level row: <span className="font-medium">{level.name}</span> — pick the wrapping row by class anchor.
    this.levelRows = page.locator('span.font-medium');
  }

  async gotoList(): Promise<void> {
    await this.page.goto('/difficulty');
    await this.listHeading.waitFor({ state: 'visible', timeout: 15_000 });
  }

  async openFirstFramework(): Promise<void> {
    // Try each card until one detail page loads. Some frameworks may be permission-gated
    // (Hasura RLS returns null for non-owner non-public). Component returns null then router bounces.
    const cardHeaders = this.page.locator('div.cursor-pointer:has(> div > h3.line-clamp-2)');
    await cardHeaders.first().waitFor({ state: 'visible', timeout: 10_000 });
    const count = await cardHeaders.count();
    for (let i = 0; i < count; i++) {
      await cardHeaders.nth(i).click();
      const matchedDetail = await this.detailSubtitle
        .waitFor({ state: 'visible', timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
      if (matchedDetail) return;
      if (!this.page.url().match(/\/difficulty\/?$/)) {
        await this.gotoList();
        await cardHeaders.first().waitFor({ state: 'visible', timeout: 10_000 });
      }
    }
    throw new Error('No difficulty framework viewable for test user');
  }

  async expectDetailLoaded(): Promise<void> {
    await expect(this.detailHeading).toBeVisible({ timeout: 15_000 });
    await expect(this.detailSubtitle).toBeVisible();
  }

  async hasFrameworkCard(): Promise<boolean> {
    // Wait for Apollo query: first card OR empty state, whichever shows first.
    await Promise.race([
      this.frameworkCards.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {}),
      this.listEmptyState.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {}),
    ]);
    return (await this.frameworkCards.count()) > 0;
  }
}
