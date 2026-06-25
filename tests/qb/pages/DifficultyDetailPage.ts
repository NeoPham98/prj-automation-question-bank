import { Page, Locator, expect } from '@playwright/test';
import { raceAgainstErrorToast } from './toast-helpers';

export type DifficultyTab = 'draft' | 'pending' | 'refused' | 'approved';

export class DifficultyDetailPage {
  readonly listHeading: Locator;
  readonly listEmptyState: Locator;
  readonly frameworkCards: Locator;
  readonly detailHeading: Locator;
  readonly detailSubtitle: Locator;
  readonly levelsEmptyState: Locator;
  readonly levelRows: Locator;
  readonly breadcrumbParent: Locator;
  readonly tabDraft: Locator;
  readonly tabPending: Locator;
  readonly tabRefused: Locator;
  readonly tabApproved: Locator;
  readonly createTrigger: Locator;
  readonly frameworkDialog: Locator;
  readonly frameworkDialogCreateTitle: Locator;
  readonly frameworkDialogEditTitle: Locator;
  readonly frameworkNameInput: Locator;
  readonly frameworkDescInput: Locator;
  readonly frameworkCreateButton: Locator;
  readonly frameworkEditButton: Locator;
  readonly frameworkCancelButton: Locator;
  readonly deleteFrameworkDialog: Locator;
  readonly deleteFrameworkConfirmButton: Locator;
  readonly bulkApproveButton: Locator;
  readonly bulkRefuseButton: Locator;
  readonly bulkCancelButton: Locator;
  readonly addLevelButton: Locator;
  readonly addFirstLevelButton: Locator;
  readonly levelInput: Locator;
  readonly levelSaveButton: Locator;
  readonly levelCancelButton: Locator;
  readonly deleteLevelDialog: Locator;
  readonly deleteLevelConfirmButton: Locator;

  constructor(private readonly page: Page) {
    this.listHeading = page.getByRole('heading', {
      name: 'Quản lý khung độ khó',
      exact: true,
    });
    this.listEmptyState = page.getByText('Chưa có khung độ khó nào', { exact: true });
    this.frameworkCards = page.locator('h3.line-clamp-2');

    this.tabDraft = page.getByRole('tab', { name: 'Bản nháp', exact: true });
    this.tabPending = page.getByRole('tab', { name: 'Chờ duyệt', exact: true });
    this.tabRefused = page.getByRole('tab', { name: 'Bị từ chối', exact: true });
    this.tabApproved = page.getByRole('tab', { name: 'Đã duyệt', exact: true });

    this.createTrigger = page.getByRole('button', { name: /Thêm khung độ khó/ }).first();

    this.frameworkDialog = page.locator('[role="dialog"]').filter({
      hasText: /Thêm khung độ khó mới|Chỉnh sửa khung độ khó/,
    });
    this.frameworkDialogCreateTitle = this.frameworkDialog.getByText('Thêm khung độ khó mới', {
      exact: true,
    });
    this.frameworkDialogEditTitle = this.frameworkDialog.getByText('Chỉnh sửa khung độ khó', {
      exact: true,
    });
    this.frameworkNameInput = this.frameworkDialog.locator('input#difficulty-name');
    this.frameworkDescInput = this.frameworkDialog.locator('textarea#difficulty-desc');
    this.frameworkCreateButton = this.frameworkDialog.getByRole('button', {
      name: 'Tạo mới',
      exact: true,
    });
    this.frameworkEditButton = this.frameworkDialog.getByRole('button', {
      name: 'Lưu thay đổi',
      exact: true,
    });
    this.frameworkCancelButton = this.frameworkDialog.getByRole('button', {
      name: 'Hủy bỏ',
      exact: true,
    });

    this.deleteFrameworkDialog = page.locator('[role="dialog"]').filter({
      hasText: 'Xác nhận xóa khung độ khó',
    });
    this.deleteFrameworkConfirmButton = this.deleteFrameworkDialog.getByRole('button', {
      name: 'Xóa',
      exact: true,
    });

    this.bulkApproveButton = page.getByRole('button', { name: /^Duyệt đã chọn/ });
    this.bulkRefuseButton = page.getByRole('button', { name: /^Từ chối đã chọn/ });
    this.bulkCancelButton = page.getByRole('button', { name: /^Huỷ gửi duyệt đã chọn/ });

    this.detailHeading = page.locator('h1.text-2xl.font-bold').first();
    this.detailSubtitle = page.getByText(
      'Mỗi ngân hàng có khung chương trình và khung độ khó riêng',
      { exact: true },
    );
    this.breadcrumbParent = page.locator('nav[aria-label="breadcrumb"] a[href="/difficulty"]').first();
    this.levelsEmptyState = page.getByText('Chưa có mức độ nào', { exact: true });
    this.levelRows = page.locator('span.font-medium');
    this.addLevelButton = page.getByRole('button', { name: 'Thêm mức độ mới', exact: true });
    this.addFirstLevelButton = page.getByRole('button', { name: 'Tạo mức độ đầu tiên', exact: true });
    this.levelInput = page.locator('input[placeholder="Nhập tên mức độ..."]').first();
    this.levelSaveButton = page.getByRole('button', { name: 'Lưu', exact: true }).first();
    this.levelCancelButton = page.getByRole('button', { name: 'Hủy', exact: true }).first();

    this.deleteLevelDialog = page.locator('[role="dialog"]').filter({
      hasText: 'Xác nhận xóa mức độ',
    });
    this.deleteLevelConfirmButton = this.deleteLevelDialog.getByRole('button', {
      name: 'Xóa',
      exact: true,
    });
  }

  async gotoList(): Promise<void> {
    await this.page.goto('/difficulty');
    await this.listHeading.waitFor({ state: 'visible', timeout: 15_000 });
  }

  async goto(): Promise<void> {
    await this.gotoList();
  }

  async gotoDetail(id: string): Promise<void> {
    await this.page.goto(`/difficulty/${id}`);
    await this.expectDetailLoaded();
  }

  async gotoTab(tab: DifficultyTab): Promise<void> {
    if (!this.page.url().includes('/difficulty')) {
      await this.gotoList();
    } else {
      await this.listHeading.waitFor({ state: 'visible', timeout: 15_000 });
    }
    await this.switchToTab(tab);
  }

  async switchToTab(tab: DifficultyTab): Promise<void> {
    const trigger =
      tab === 'draft'
        ? this.tabDraft
        : tab === 'pending'
          ? this.tabPending
          : tab === 'refused'
            ? this.tabRefused
            : this.tabApproved;
    await trigger.click();
    await this.expectTabActive(tab);
  }

  async expectTabActive(tab: DifficultyTab): Promise<void> {
    const trigger =
      tab === 'draft'
        ? this.tabDraft
        : tab === 'pending'
          ? this.tabPending
          : tab === 'refused'
            ? this.tabRefused
            : this.tabApproved;
    await expect(trigger).toHaveAttribute('data-state', 'active', { timeout: 10_000 });
  }

  cardByName(name: string): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByRole('heading', { level: 3, name, exact: true }) })
      .filter({ has: this.page.locator('button, [role="button"]') })
      .last();
  }

  levelRowByName(name: string): Locator {
    return this.page.locator('div.rounded-lg.border.bg-card.p-4').filter({
      has: this.page.locator('span.font-medium').filter({ hasText: name }),
    }).first();
  }

  async expectCardVisible(name: string): Promise<void> {
    await expect(this.cardByName(name)).toBeVisible({ timeout: 15_000 });
  }

  async expectCardHidden(name: string): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 3, name, exact: true })).toHaveCount(0, {
      timeout: 15_000,
    });
  }

  async openCreateDialog(): Promise<void> {
    await this.createTrigger.click();
    await expect(this.frameworkDialogCreateTitle).toBeVisible({ timeout: 5_000 });
  }

  async openEditDialog(name: string): Promise<void> {
    const card = this.cardByName(name);
    await card.locator('button.h-8.w-8').first().click();
    await expect(this.frameworkDialogEditTitle).toBeVisible({ timeout: 5_000 });
  }

  async createFramework(name: string, description = ''): Promise<string> {
    await this.openCreateDialog();
    await this.frameworkNameInput.fill(name);
    if (description) await this.frameworkDescInput.fill(description);
    const navPromise = this.page.waitForURL(/\/difficulty\/[^/]+/, { timeout: 20_000 });
    await this.frameworkCreateButton.click();
    await raceAgainstErrorToast(this.page, navPromise, 'Difficulty create', 20_000);
    const id = this.page.url().match(/\/difficulty\/([^/?#]+)/)?.[1];
    if (!id) throw new Error(`Failed to parse difficulty id from URL: ${this.page.url()}`);
    return id;
  }

  async updateFramework(name: string, description?: string): Promise<void> {
    await this.frameworkNameInput.fill(name);
    if (description !== undefined) await this.frameworkDescInput.fill(description);
    await this.frameworkEditButton.click();
    const dialogClosed = expect(this.frameworkDialog).toBeHidden({ timeout: 20_000 });
    await raceAgainstErrorToast(this.page, dialogClosed, 'Difficulty edit', 20_000);
  }

  async openDeleteDialog(name: string): Promise<void> {
    const card = this.cardByName(name);
    await card.locator('button.h-8.w-8').last().click();
    await expect(this.deleteFrameworkDialog).toBeVisible({ timeout: 5_000 });
  }

  async confirmDelete(): Promise<void> {
    await this.deleteFrameworkConfirmButton.click();
    const success = expect(
      this.page.getByText('Đã xóa khung độ khó.', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Delete difficulty', 15_000);
    await expect(this.deleteFrameworkDialog).toBeHidden({ timeout: 10_000 });
  }

  async submitForReview(name: string): Promise<void> {
    const card = this.cardByName(name);
    await card.getByRole('button', { name: 'Gửi duyệt', exact: true }).click();
    const success = expect(
      this.page.getByText('Đã gửi duyệt khung độ khó', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Submit difficulty for review', 15_000);
  }

  async resubmitForReview(name: string): Promise<void> {
    const card = this.cardByName(name);
    await card.getByRole('button', { name: 'Gửi duyệt lại', exact: true }).click();
    const success = expect(
      this.page.getByText('Đã gửi duyệt khung độ khó', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Resubmit difficulty for review', 15_000);
  }

  async approveFromCard(name: string): Promise<void> {
    const card = this.cardByName(name);
    await card.getByRole('button', { name: 'Hành động', exact: true }).click();
    await this.page.getByRole('menuitem', { name: 'Duyệt', exact: true }).click();
    const success = expect(
      this.page.getByText('Đã duyệt khung độ khó', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Approve difficulty', 15_000);
  }

  async refuseFromCard(name: string): Promise<void> {
    const card = this.cardByName(name);
    await card.getByRole('button', { name: 'Hành động', exact: true }).click();
    await this.page.getByRole('menuitem', { name: 'Từ chối', exact: true }).click();
    const success = expect(
      this.page.getByText('Đã từ chối khung độ khó', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Refuse difficulty', 15_000);
  }

  async cancelSubmitFromCard(name: string): Promise<void> {
    const card = this.cardByName(name);
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
    await raceAgainstErrorToast(this.page, success, 'Cancel difficulty submit', 15_000);
  }

  async togglePublishOnCard(name: string): Promise<'Công khai' | 'Riêng tư'> {
    const card = this.cardByName(name);
    const switchEl = card.locator('[id^="publish-diff-"]').first();
    const label = card.locator('label[for^="publish-diff-"]').first();
    await switchEl.waitFor({ state: 'visible', timeout: 10_000 });
    const before = ((await label.textContent()) || '').trim();
    const expected = before === 'Công khai' ? 'Riêng tư' : 'Công khai';
    await switchEl.click();
    const success = expect(label).toHaveText(expected, { timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Toggle difficulty publish', 15_000);
    return expected;
  }

  async openCardDetail(name: string): Promise<void> {
    const card = this.cardByName(name);
    await card.getByRole('heading', { level: 3, name, exact: true }).click();
    await this.page.waitForURL(/\/difficulty\/[^/]+/, { timeout: 15_000 });
  }

  async openFirstFramework(): Promise<void> {
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
    await Promise.race([
      this.frameworkCards.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {}),
      this.listEmptyState.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {}),
    ]);
    return (await this.frameworkCards.count()) > 0;
  }

  async addLevel(name: string): Promise<void> {
    const trigger = (await this.addLevelButton.count()) > 0 ? this.addLevelButton : this.addFirstLevelButton;
    await trigger.click();
    await this.levelInput.waitFor({ state: 'visible', timeout: 5_000 });
    await this.levelInput.fill(name);
    await this.levelSaveButton.click();
    const success = expect(
      this.page.getByText('Đã thêm mức độ mới', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Add difficulty level', 15_000);
    await expect(this.levelRowByName(name)).toBeVisible({ timeout: 15_000 });
  }

  async editLevel(oldName: string, newName: string): Promise<void> {
    const row = this.levelRowByName(oldName);
    await row.getByRole('button').first().click();
    await this.levelInput.waitFor({ state: 'visible', timeout: 5_000 });
    await this.levelInput.fill(newName);
    await this.levelSaveButton.click();
    const success = expect(
      this.page.getByText('Đã cập nhật mức độ', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Edit difficulty level', 15_000);
    await expect(this.levelRowByName(newName)).toBeVisible({ timeout: 15_000 });
  }

  async deleteLevel(name: string): Promise<void> {
    const row = this.levelRowByName(name);
    await row.getByRole('button').nth(1).click();
    await expect(this.deleteLevelDialog).toBeVisible({ timeout: 5_000 });
    await this.deleteLevelConfirmButton.click();
    const success = expect(
      this.page.getByText('Đã xóa mức độ', { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await raceAgainstErrorToast(this.page, success, 'Delete difficulty level', 15_000);
    await expect(this.deleteLevelDialog).toBeHidden({ timeout: 10_000 });
  }

  async expectLevelHidden(name: string): Promise<void> {
    await expect(this.levelRowByName(name)).toHaveCount(0, { timeout: 15_000 });
  }

  async cleanupByPrefix(prefix: string): Promise<void> {
    await this.goto();
    for (const tab of ['draft', 'pending', 'refused', 'approved'] as const) {
      try {
        await this.gotoTab(tab);
      } catch {
        continue;
      }
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
          break;
        }
      }
    }
  }
}
