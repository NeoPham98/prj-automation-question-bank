import { Page, Locator, expect } from '@playwright/test';

// KCT (Khung chương trình) list + detail.
// Sources:
//   src/components/pages/curriculum-frame/index.tsx:499-501 — list h1
//   src/components/pages/curriculum-frame/components/CurriculumFrameworkCard.tsx:91-93,110-115 — card nav
//   src/components/pages/curriculum-frame/CurriculumFrameworkDetail.tsx:482-487,526-545,588-593 — detail anchors
export class CurriculumDetailPage {
  readonly listHeading: Locator;
  readonly listEmptyState: Locator;
  readonly frameworkCards: Locator;
  readonly detailHeading: Locator;
  readonly detailSubtitle: Locator;
  readonly treeSectionLabel: Locator;
  readonly maxDepthLabel: Locator;
  readonly treeEmptyState: Locator;

  constructor(private readonly page: Page) {
    // List page (/curriculum).
    this.listHeading = page.getByRole('heading', {
      name: 'Quản lý khung chương trình',
      exact: true,
    });
    this.listEmptyState = page.getByText('Chưa có khung chương trình nào', { exact: true });
    // CurriculumFrameworkCard renders shadcn Card; CardTitle (= <h3>) has class line-clamp-2 text-base.
    this.frameworkCards = page.locator('h3.line-clamp-2');

    // Detail page (/curriculum/[id]).
    // h1 = framework.name (text-3xl font-bold). Use h1 + class anchor since name dynamic.
    this.detailHeading = page.locator('h1.text-3xl.font-bold').first();
    this.detailSubtitle = page.getByText(/Cấu trúc cây kiến thức/);
    this.treeSectionLabel = page.getByText('Cây kiến thức', { exact: true });
    this.maxDepthLabel = page.getByText(/Độ sâu tối đa:\s*10\s*cấp/);
    // Empty tree: FolderOpen icon + "Chưa có dữ liệu".
    this.treeEmptyState = page.getByText('Chưa có dữ liệu', { exact: true });
  }

  async gotoList(): Promise<void> {
    await this.page.goto('/curriculum');
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
      if (!this.page.url().match(/\/curriculum\/?$/)) {
        await this.gotoList();
        await cardHeaders.first().waitFor({ state: 'visible', timeout: 10_000 });
      }
    }
    throw new Error('No curriculum framework viewable for test user');
  }

  async expectDetailLoaded(): Promise<void> {
    await expect(this.detailHeading).toBeVisible({ timeout: 15_000 });
    await expect(this.detailSubtitle).toBeVisible();
    await expect(this.treeSectionLabel).toBeVisible();
    await expect(this.maxDepthLabel).toBeVisible();
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
