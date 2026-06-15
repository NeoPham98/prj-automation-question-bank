import { Page, Locator, expect } from '@playwright/test';

// Dashboard "Tổng quan" + WeeklyProgressCard chart.
// Sources:
//   src/components/pages/Dashboard/index.tsx:26 (h1)
//   src/components/pages/Dashboard/components/WeeklyProgressCard.tsx:91,107,138,142,182-205
export class DashboardPage {
  readonly heading: Locator;
  readonly chartCard: Locator;
  readonly chartTitle: Locator;
  readonly weekPickerButton: Locator;
  readonly chartLoading: Locator;
  readonly chartEmpty: Locator;
  readonly chartSurface: Locator;
  readonly legendCreated: Locator;
  readonly legendApproved: Locator;
  readonly legendBanks: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Tổng quan', exact: true });
    this.chartCard = page
      .locator('div')
      .filter({ has: page.getByText('Biểu đồ hoạt động tuần', { exact: true }) })
      .first();
    this.chartTitle = page.getByText('Biểu đồ hoạt động tuần', { exact: true });
    this.weekPickerButton = page.getByRole('button', {
      name: /Tuần \d{2}\/\d{2}|Chọn tuần/,
    });
    this.chartLoading = page.getByText('Đang tải dữ liệu...', { exact: true });
    this.chartEmpty = page.getByText('Không có dữ liệu', { exact: true });
    this.chartSurface = page.locator('.recharts-surface').first();
    // Legend labels rendered via Recharts <Legend formatter> as <span>{label}</span>.
    this.legendCreated = page.locator('.recharts-legend-item').filter({ hasText: 'Tạo mới' });
    this.legendApproved = page.locator('.recharts-legend-item').filter({ hasText: 'Đã Duyệt' });
    this.legendBanks = page.locator('.recharts-legend-item').filter({ hasText: 'Ngân hàng' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
    await this.heading.waitFor({ state: 'visible', timeout: 15_000 });
  }

  async waitForChartReady(): Promise<void> {
    await expect(this.chartTitle).toBeVisible({ timeout: 10_000 });
    await expect(this.chartLoading).toBeHidden({ timeout: 20_000 });
  }

  async openWeekPicker(): Promise<void> {
    await this.weekPickerButton.click();
  }

  async hasData(): Promise<boolean> {
    return (await this.chartSurface.count()) > 0;
  }
}
