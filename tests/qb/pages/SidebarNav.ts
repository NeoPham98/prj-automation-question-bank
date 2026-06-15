import { Page, Locator, expect } from '@playwright/test';

// Nav labels from src/components/layout/AppSidebar.tsx:35-61
export type NavLabel =
  | 'Tổng quan'
  | 'Ngân hàng câu hỏi'
  | 'Khung chương trình'
  | 'Khung độ khó'
  | 'Ma trận đề';

const NAV_PATHS: Record<NavLabel, string> = {
  'Tổng quan': '/dashboard',
  'Ngân hàng câu hỏi': '/banks',
  'Khung chương trình': '/curriculum',
  'Khung độ khó': '/difficulty',
  'Ma trận đề': '/matrix',
};

export class SidebarNav {
  readonly sidebar: Locator;

  constructor(private readonly page: Page) {
    // Desktop aside is <aside class="... md:flex">; mobile uses [aria-label="Điều hướng chính"]
    // AppSidebar.tsx:260, 238
    this.sidebar = page.locator('aside').first();
  }

  item(label: NavLabel): Locator {
    return this.sidebar.getByRole('link', { name: label, exact: true });
  }

  async goto(label: NavLabel): Promise<void> {
    await this.item(label).click();
    await this.page.waitForURL((url) => url.pathname.startsWith(NAV_PATHS[label]), {
      timeout: 15_000,
    });
  }

  async expectActive(label: NavLabel): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${NAV_PATHS[label]}(\\?|$)`));
  }

  pathFor(label: NavLabel): string {
    return NAV_PATHS[label];
  }
}
