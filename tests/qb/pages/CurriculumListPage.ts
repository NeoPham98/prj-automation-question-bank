import { Page, Locator, expect } from '@playwright/test';
import { raceAgainstErrorToast } from './toast-helpers';

// KCT list page (/curriculum) — tabs + card actions + bulk + delete confirm.
// Sources:
//   src/components/pages/curriculum-frame/index.tsx:513-529 — tabs (draft/pending/refused/approved)
//   src/components/pages/curriculum-frame/components/CurriculumFrameworkList.tsx:57-75,131-143 — bulk + create CTA
//   src/components/pages/curriculum-frame/components/CurriculumFrameworkCard.tsx:156,191-202,209-254,266,285,300 — card actions
//   src/components/pages/curriculum-frame/index.tsx:262,284,305-306,332,379,399,417,438 — toast strings
//   src/components/Modals/DeleteConfirmDialog.tsx:28-29 — delete cancel/confirm labels
export type CurriculumTab = 'draft' | 'pending' | 'refused' | 'approved';

export class CurriculumListPage {
  readonly heading: Locator;
  readonly tabDraft: Locator;
  readonly tabPending: Locator;
  readonly tabRefused: Locator;
  readonly tabApproved: Locator;
  readonly createTrigger: Locator;
  readonly deleteDialog: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;
  readonly bulkApproveButton: Locator;
  readonly bulkRefuseButton: Locator;
  readonly bulkCancelButton: Locator;
  readonly emptyState: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', {
      name: 'Quản lý khung chương trình',
      exact: true,
    });

    this.tabDraft = page.getByRole('tab', { name: 'Bản nháp', exact: true });
    this.tabPending = page.getByRole('tab', { name: 'Chờ duyệt', exact: true });
    this.tabRefused = page.getByRole('tab', { name: 'Bị từ chối', exact: true });
    this.tabApproved = page.getByRole('tab', { name: 'Đã duyệt', exact: true });

    // Create CTA card in draft tab — button wrapping h3 "Thêm khung chương trình".
    this.createTrigger = page.getByRole('button', { name: /Thêm khung chương trình/ }).first();

    // Delete confirm — DeleteConfirmDialog: title "Xác nhận xóa khung chương trình".
    this.deleteDialog = page.locator('[role="dialog"]').filter({
      hasText: 'Xác nhận xóa khung chương trình',
    });
    this.deleteConfirmButton = this.deleteDialog.getByRole('button', { name: 'Xóa', exact: true });
    this.deleteCancelButton = this.deleteDialog.getByRole('button', { name: 'Hủy bỏ', exact: true });

    // Bulk action buttons (CurriculumFrameworkList.tsx:57-75).
    this.bulkApproveButton = page.getByRole('button', { name: /^Duyệt đã chọn/ });
    this.bulkRefuseButton = page.getByRole('button', { name: /^Từ chối đã chọn/ });
    this.bulkCancelButton = page.getByRole('button', { name: /^Huỷ gửi duyệt đã chọn/ });

    this.emptyState = page.getByText('Chưa có khung chương trình nào', { exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/curriculum');
    await this.heading.waitFor({ state: 'visible', timeout: 15_000 });
  }

  async gotoTab(tab: CurriculumTab): Promise<void> {
    // index.tsx:56 — activeTab is local useState defaulting to 'approved'.
    // URL `?tab=` is ignored — must click tab trigger to switch.
    if (!this.page.url().includes('/curriculum')) {
      await this.goto();
    } else {
      await this.heading.waitFor({ state: 'visible', timeout: 15_000 });
    }
    await this.switchToTab(tab);
  }

  async switchToTab(tab: CurriculumTab): Promise<void> {
    const trigger =
      tab === 'draft' ? this.tabDraft
        : tab === 'pending' ? this.tabPending
          : tab === 'refused' ? this.tabRefused
            : this.tabApproved;
    await trigger.click();
    await this.expectTabActive(tab);
  }

  async expectTabActive(tab: CurriculumTab): Promise<void> {
    const trigger =
      tab === 'draft' ? this.tabDraft
        : tab === 'pending' ? this.tabPending
          : tab === 'refused' ? this.tabRefused
            : this.tabApproved;
    await expect(trigger).toHaveAttribute('data-state', 'active', { timeout: 10_000 });
  }

  // Card root for a given framework. CardTitle = h3.line-clamp-2 with name text.
  cardByName(name: string): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByRole('heading', { level: 3, name, exact: true }) })
      .filter({ has: this.page.locator('button, [role="button"]') })
      .last();
  }

  async expectCardVisible(name: string): Promise<void> {
    await expect(this.cardByName(name)).toBeVisible({ timeout: 15_000 });
  }

  async expectCardHidden(name: string): Promise<void> {
    await expect(
      this.page.getByRole('heading', { level: 3, name, exact: true }),
    ).toHaveCount(0, { timeout: 15_000 });
  }

  async openCreateDialog(): Promise<void> {
    await this.createTrigger.click();
  }

  async openEditDialog(name: string): Promise<void> {
    const card = this.cardByName(name);
    // Pencil icon button — size="icon" h-8 w-8 with Pencil lucide. Pencil is first.
    await card.locator('button.h-8.w-8').first().click();
  }

  async openDeleteDialog(name: string): Promise<void> {
    const card = this.cardByName(name);
    await card.locator('button.h-8.w-8').last().click();
    await expect(this.deleteDialog).toBeVisible({ timeout: 5_000 });
  }

  async confirmDelete(): Promise<void> {
    await this.deleteConfirmButton.click();
    const success = expect(
      this.page.getByText('Đã xóa khung chương trình.', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Delete curriculum', 15_000);
    await expect(this.deleteDialog).toBeHidden({ timeout: 10_000 });
  }

  async cancelDelete(): Promise<void> {
    await this.deleteCancelButton.click();
  }

  // Draft tab — "Gửi duyệt" button on creator's own card.
  async submitForReview(name: string): Promise<void> {
    const card = this.cardByName(name);
    await card.getByRole('button', { name: 'Gửi duyệt', exact: true }).click();
    const success = expect(
      this.page.getByText('Đã gửi duyệt khung chương trình', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Submit for review', 15_000);
  }

  // Refused tab — "Gửi duyệt lại" button.
  async resubmitForReview(name: string): Promise<void> {
    const card = this.cardByName(name);
    await card.getByRole('button', { name: 'Gửi duyệt lại', exact: true }).click();
    const success = expect(
      this.page.getByText('Đã gửi duyệt khung chương trình', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Resubmit for review', 15_000);
  }

  // Pending tab — per-card dropdown "Hành động" → "Duyệt".
  async approveFromCard(name: string): Promise<void> {
    const card = this.cardByName(name);
    await card.getByRole('button', { name: 'Hành động', exact: true }).click();
    await this.page.getByRole('menuitem', { name: 'Duyệt', exact: true }).click();
    const success = expect(
      this.page.getByText('Đã duyệt khung chương trình', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Approve curriculum', 15_000);
  }

  async refuseFromCard(name: string): Promise<void> {
    const card = this.cardByName(name);
    await card.getByRole('button', { name: 'Hành động', exact: true }).click();
    await this.page.getByRole('menuitem', { name: 'Từ chối', exact: true }).click();
    const success = expect(
      this.page.getByText('Đã từ chối khung chương trình', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Refuse curriculum', 15_000);
  }

  async cancelSubmitFromCard(name: string): Promise<void> {
    const card = this.cardByName(name);
    // Two render paths: dropdown item OR standalone button.
    const standaloneBtn = card.getByRole('button', { name: 'Huỷ gửi duyệt', exact: true });
    if ((await standaloneBtn.count()) > 0) {
      await standaloneBtn.click();
    } else {
      await card.getByRole('button', { name: 'Hành động', exact: true }).click();
      await this.page.getByRole('menuitem', { name: 'Huỷ gửi duyệt', exact: true }).click();
    }
    const success = expect(
      this.page.getByText('Đã huỷ gửi duyệt', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Cancel submit', 15_000);
  }

  // Approved tab — Switch id="publish-curriculum-{id}" + Label paired by htmlFor.
  // Returns Label text ("Công khai" / "Riêng tư") after toggle.
  async togglePublishOnCard(name: string): Promise<'Công khai' | 'Riêng tư'> {
    const card = this.cardByName(name);
    const switchEl = card.locator('[id^="publish-curriculum-"]').first();
    await switchEl.waitFor({ state: 'visible', timeout: 10_000 });
    await switchEl.click();
    const publicToast = this.page.getByText('Đã chuyển sang Công khai.', { exact: false });
    const privateToast = this.page.getByText('Đã chuyển sang Riêng tư.', { exact: false });
    const result = await Promise.race([
      publicToast.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'Công khai' as const),
      privateToast.waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'Riêng tư' as const),
    ]);
    return result;
  }

  async openCardDetail(name: string): Promise<void> {
    const card = this.cardByName(name);
    await card.getByRole('heading', { level: 3, name, exact: true }).click();
    await this.page.waitForURL(/\/curriculum\/[^/]+/, { timeout: 15_000 });
  }

  // Sweeps every tab + deletes every card whose h3 text starts with `prefix`.
  // Best-effort: failures per card swallowed so cleanup keeps going.
  // Use in afterAll to scrub orphans from crashed runs.
  async cleanupByPrefix(prefix: string): Promise<void> {
    await this.goto();
    for (const tab of ['draft', 'pending', 'refused', 'approved'] as const) {
      try {
        await this.gotoTab(tab);
      } catch {
        continue;
      }
      // Each delete re-renders the list — re-query until none match.
      for (let safety = 0; safety < 25; safety++) {
        const headings = this.page.getByRole('heading', { level: 3 });
        const count = await headings.count();
        let victimName: string | null = null;
        for (let i = 0; i < count; i++) {
          const text = (await headings.nth(i).textContent())?.trim() ?? '';
          if (text.startsWith(prefix)) {
            victimName = text;
            break;
          }
        }
        if (!victimName) break;
        try {
          await this.openDeleteDialog(victimName);
          await this.confirmDelete();
        } catch {
          // Tab/role may lack delete perm — skip to next tab.
          break;
        }
      }
    }
  }
}
