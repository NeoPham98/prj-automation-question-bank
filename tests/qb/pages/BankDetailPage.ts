import { Page, Locator, expect } from '@playwright/test';

// Bank detail page (/banks/[id]).
// Sources:
//   src/components/pages/question-bank/bank-detail/QuestionBankDetail.tsx:1087 — h1 bank name
//   src/components/pages/question-bank/bank-detail/QuestionBankDetail.tsx:1098-1126 — tabs (Công khai, Kho cá nhân, Duyệt câu hỏi)
//   src/components/pages/question-bank/bank-detail/QuestionBankDetail.tsx:1182-1211 — status filter pills
//   src/components/pages/question-bank/bank-detail/QuestionBankDetail.tsx:1223-1254 — create dropdown (library tab + canInsertInThisBank gate)
//   src/components/pages/question-bank/bank-detail/QuestionBankDetail.tsx:972-976 — handleGoToCreateManual route
//   src/components/pages/question-bank/bank-detail/components/QuestionListSection.tsx:170-410 — bulk action bar
//   src/components/QuizStudio/quiz-form/quiz-detail/quiz-item/index.tsx:229-252 — item root div[id] + per-question checkbox
//   src/components/QuizStudio/quiz-form/quiz-detail/quiz-item/quiz-header.tsx:151-192 — edit/delete buttons
export class BankDetailPage {
  readonly heading: Locator;
  readonly tabPublic: Locator;
  readonly tabLibrary: Locator;
  readonly tabPending: Locator;
  readonly createDropdownTrigger: Locator;
  readonly createManualItem: Locator;
  readonly createUploadItem: Locator;
  readonly emptyState: Locator;
  readonly toastSuccess: Locator;
  readonly bulkActionBar: Locator;
  readonly bulkSelectAllCheckbox: Locator;
  readonly bulkDeleteButton: Locator;
  readonly bulkSendForReviewButton: Locator;
  readonly bulkCancelReviewButton: Locator;
  readonly deleteConfirmDialog: Locator;
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;

  constructor(private readonly page: Page) {
    // h1 text-2xl font-bold = bank.name. Dynamic so anchor by class.
    this.heading = page.locator('h1.text-2xl.font-bold').first();

    // TabsTrigger role="tab" inside Radix Tabs.
    this.tabPublic = page.getByRole('tab', { name: 'Công khai', exact: true });
    this.tabLibrary = page.getByRole('tab', { name: 'Kho cá nhân', exact: true });
    this.tabPending = page.getByRole('tab', { name: 'Duyệt câu hỏi', exact: true });

    // DropdownMenuTrigger Button "Tạo câu hỏi" (Plus icon). Library tab only + canInsertInThisBank.
    this.createDropdownTrigger = page.getByRole('button', { name: /Tạo câu hỏi/ });
    this.createManualItem = page.getByRole('menuitem', { name: 'Tạo thủ công' });
    this.createUploadItem = page.getByRole('menuitem', { name: 'Tải lên với tài liệu' });

    // Empty list state (QuestionListSection.tsx:406).
    this.emptyState = page.getByText('Chưa có câu hỏi nào', { exact: true });

    this.toastSuccess = page.locator('[data-sonner-toast]').first();

    // Bulk bar (QuestionListSection.tsx:251-258). Shown only when selectedCount > 0.
    this.bulkActionBar = page.locator('div.bg-slate-50.border.rounded-lg').first();
    this.bulkSelectAllCheckbox = this.bulkActionBar.locator('[role="checkbox"]').first();
    this.bulkDeleteButton = this.bulkActionBar.getByRole('button', { name: /Xóa$|Xóa\s/, exact: false });
    this.bulkSendForReviewButton = this.bulkActionBar.getByRole('button', { name: /Gửi duyệt/, exact: false });
    this.bulkCancelReviewButton = this.bulkActionBar.getByRole('button', { name: /Hủy gửi duyệt/, exact: false });

    // Per-question delete confirm InforModal (quiz-item/index.tsx:290-303).
    this.deleteConfirmDialog = page.locator('[role="dialog"]').filter({
      hasText: 'Bạn có chắc muốn xóa câu hỏi này?',
    });
    this.deleteConfirmButton = this.deleteConfirmDialog.getByRole('button', {
      name: 'Xác nhận',
      exact: true,
    });
    this.deleteCancelButton = this.deleteConfirmDialog.getByRole('button', {
      name: 'Hủy',
      exact: true,
    });
  }

  async goto(bankId: string): Promise<void> {
    await this.page.goto(`/banks/${bankId}`);
    await this.heading.waitFor({ state: 'visible', timeout: 15_000 });
  }

  async gotoLibrary(bankId: string): Promise<void> {
    await this.page.goto(`/banks/${bankId}?tab=library`);
    await this.heading.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(this.tabLibrary).toHaveAttribute('data-state', 'active', {
      timeout: 5_000,
    });
  }

  async switchToLibrary(): Promise<void> {
    await this.tabLibrary.waitFor({ state: 'visible', timeout: 20_000 });
    await this.tabLibrary.scrollIntoViewIfNeeded();
    await this.tabLibrary.click({ force: true });
    await expect(this.tabLibrary).toHaveAttribute('data-state', 'active', { timeout: 20_000 });
  }

  async switchToPendingTab(): Promise<void> {
    await this.tabPending.click();
    await expect(this.tabPending).toHaveAttribute('data-state', 'active');
  }

  async openCreateManual(): Promise<void> {
    // Library tab gate enforced by caller via gotoLibrary or switchToLibrary.
    await this.createDropdownTrigger.click();
    await this.createManualItem.click();
    await this.page.waitForURL(/\/question-bank\/create\/manual\?bankId=/, {
      timeout: 15_000,
    });
  }

  async openCreateUpload(): Promise<void> {
    await this.createDropdownTrigger.click();
    await this.createUploadItem.click();
    await this.page.waitForURL(/\/banks\/[^/]+\/create\/upload\?mode=excel/, {
      timeout: 15_000,
    });
  }

  async hasCreatePermission(): Promise<boolean> {
    // canInsertInThisBank hides the dropdown for non-owners.
    return (await this.createDropdownTrigger.count()) > 0;
  }

  async hasModeratePermission(): Promise<boolean> {
    // canModerateThisBank hides the Duyệt câu hỏi tab.
    return (await this.tabPending.count()) > 0;
  }

  // Question item root <div id={quizId}> (quiz-item/index.tsx:230). Multiple
  // questions render simultaneously; anchor by name text rendered in card body.
  // Caller responsible for unique names (e.g. timestamp suffix).
  questionItemByName(name: string): Locator {
    return this.page
      .locator('div[id]:has(button)')
      .filter({ hasText: name })
      .first();
  }

  bankIdFromUrl(): string | null {
    // /banks/<id>?tab=library style URL.
    const match = this.page.url().match(/\/banks\/([^/?#]+)/);
    return match?.[1] ?? null;
  }

  // Edit button inside quiz-header (quiz-header.tsx:151-166): Link with href
  // containing /question-bank/quiz-form?code=...quizId=... wrapping a Button
  // with PenLineIcon. Tooltip "Sửa".
  async clickEditQuestion(name: string): Promise<void> {
    const card = this.questionItemByName(name);
    await card.waitFor({ state: 'visible', timeout: 10_000 });
    const editLink = card
      .locator('a[href*="/question-bank/quiz-form"][href*="quizId="]')
      .first();
    await editLink.waitFor({ state: 'visible', timeout: 10_000 });
    await editLink.click();
    await this.page.waitForURL(/\/question-bank\/quiz-form\?code=.*&quizId=/, {
      timeout: 15_000,
    });
  }

  // Delete button inside quiz-header (quiz-header.tsx:181-192): Button with
  // border-red-300 text-red-500 wrapping TrashIcon. Tooltip "Xóa".
  async clickDeleteQuestion(name: string): Promise<void> {
    const card = this.questionItemByName(name);
    await card.waitFor({ state: 'visible', timeout: 10_000 });
    await card.locator('button.border-red-300.text-red-500').first().click();
    await this.deleteConfirmDialog.waitFor({ state: 'visible', timeout: 5_000 });
  }

  async confirmDeleteQuestion(): Promise<void> {
    await this.deleteConfirmButton.click();
    await expect(this.deleteConfirmDialog).toBeHidden({ timeout: 15_000 });
  }

  // Per-question selection checkbox (quiz-item/index.tsx:242-251) at absolute
  // top-1.5 left-1.5 corner of card.
  async toggleSelectQuestion(name: string): Promise<void> {
    const card = this.questionItemByName(name);
    await card.locator('div.absolute.top-1\\.5.left-1\\.5 [role="checkbox"]').click();
  }
}
