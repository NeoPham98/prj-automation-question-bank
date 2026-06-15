import { Page, Locator, expect } from '@playwright/test';

// Banks list page (/banks).
// Sources:
//   src/components/pages/question-bank/question-banks/QuestionBanksPage.tsx:357,371,422
//   src/components/pages/question-bank/question-banks/components/BankSection.tsx:101
//   src/components/pages/question-bank/question-banks/components/BankCard.tsx:50-141
//   src/components/pages/question-bank/question-banks/components/CreateBankTrigger.tsx:15
export class BanksListPage {
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly systemSection: Locator;
  readonly schoolSection: Locator;
  readonly createTrigger: Locator;
  readonly deleteDialog: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;
  readonly toastSuccess: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', {
      name: 'Quản lý ngân hàng câu hỏi',
      exact: true,
    });
    this.searchInput = page.getByPlaceholder('Tìm kiếm');

    // Section anchors via h2 text (BankSection.tsx:101).
    this.systemSection = page
      .locator('div.space-y-4')
      .filter({ has: page.getByRole('heading', { name: 'Ngân hàng câu hỏi nền tảng', exact: true }) })
      .first();
    this.schoolSection = page
      .locator('div.space-y-4')
      .filter({ has: page.getByRole('heading', { name: 'Ngân hàng trường', exact: true }) })
      .first();

    // CreateBankTrigger renders as <button> with H3 "Thêm ngân hàng".
    // Visibility depends on role: teacher sees school section only, admin sees system too.
    // Pick the first available trigger anywhere on the page.
    this.createTrigger = page.getByRole('button', { name: /Thêm ngân hàng/ }).first();

    // Delete confirm modal (InforModal). title="Xác nhận xóa ngân hàng câu hỏi".
    this.deleteDialog = page.locator('[role="dialog"]').filter({
      hasText: 'Xác nhận xóa ngân hàng câu hỏi',
    });
    this.deleteConfirmButton = this.deleteDialog.getByRole('button', { name: 'Xóa', exact: true });
    this.deleteCancelButton = this.deleteDialog.getByRole('button', { name: 'Hủy bỏ', exact: true });

    // sonner toast — defaults to aria-label region.
    this.toastSuccess = page.locator('[data-sonner-toast]').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/banks');
    await this.heading.waitFor({ state: 'visible', timeout: 15_000 });
  }

  cardByName(name: string): Locator {
    // BankCard root has Link href="/banks/${id}" + h3 heading.
    // .last() picks innermost matching <div> = Card root (parents like grid/section also match filter).
    return this.page
      .locator('div')
      .filter({ has: this.page.getByRole('heading', { level: 3, name, exact: true }) })
      .filter({ has: this.page.locator('a[href^="/banks/"]') })
      .last();
  }

  async openCreateDialog(): Promise<void> {
    await this.createTrigger.click();
  }

  async openEditDialog(name: string): Promise<void> {
    const card = this.cardByName(name);
    // Action bar (BankCard.tsx:121): Pencil then Trash2. Position-based avoids lucide class drift.
    await card.getByRole('button').first().click();
  }

  async openDeleteDialog(name: string): Promise<void> {
    const card = this.cardByName(name);
    await card.getByRole('button').last().click();
    await expect(this.deleteDialog).toBeVisible({ timeout: 5_000 });
  }

  async confirmDelete(): Promise<void> {
    await this.deleteConfirmButton.click();
    await expect(this.deleteDialog).toBeHidden({ timeout: 10_000 });
  }

  async cancelDelete(): Promise<void> {
    await this.deleteCancelButton.click();
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    // useDebounce 1000ms in QuestionBanksPage.tsx:30 — wait for query to settle.
    await this.page.waitForTimeout(1100);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.fill('');
    await this.page.waitForTimeout(1100);
  }

  async openCardByName(name: string): Promise<void> {
    await this.cardByName(name).locator('a[href^="/banks/"]').first().click();
    await this.page.waitForURL(/\/banks\/[^/]+/, { timeout: 15_000 });
  }
}
