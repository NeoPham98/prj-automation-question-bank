import { test, expect } from '../../fixtures/qb.fixture';

// xlsx mapping: V. Tổng quan (R283-296)
// Auth via storageState from qb-setup dependency.

test.describe('Dashboard — Tổng quan', () => {
  test('heading "Tổng quan" visible after /dashboard load', async ({ dashboardPage, sidebar }) => {
    await dashboardPage.goto();
    await expect(dashboardPage.heading).toBeVisible();
    await sidebar.expectActive('Tổng quan');
  });

  test('weekly chart card renders with title + legend OR empty state', async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForChartReady();

    await expect(dashboardPage.chartTitle).toBeVisible();

    const empty = await dashboardPage.chartEmpty.isVisible().catch(() => false);
    if (empty) {
      await expect(dashboardPage.chartEmpty).toBeVisible();
    } else {
      await expect(dashboardPage.chartSurface).toBeVisible({ timeout: 10_000 });
      await expect(dashboardPage.legendCreated).toBeVisible();
      await expect(dashboardPage.legendApproved).toBeVisible();
      await expect(dashboardPage.legendBanks).toBeVisible();
    }
  });

  test('week picker button is clickable', async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForChartReady();
    await expect(dashboardPage.weekPickerButton).toBeEnabled({ timeout: 10_000 });
    await dashboardPage.openWeekPicker();
    // Calendar popover opens — anchor on any role=dialog or role=grid (date picker varies).
    const popover = page.locator('[role="dialog"], [role="grid"], .rdp').first();
    await expect(popover).toBeVisible({ timeout: 5_000 });
  });
});
