import { Page, Locator, expect } from '@playwright/test';

// Pending tab actions (Duyệt câu hỏi). Gated by canModerateThisBank.
// Sub-tabs: Chờ duyệt / Đã duyệt / Đã từ chối (PendingSubTabs.tsx:9-13).
// Sources:
//   src/components/pages/question-bank/bank-detail/components/PendingSubTabs.tsx:18-31 — sub-tab buttons (rounded-full + label text)
//   src/components/QuizStudio/quiz-form/quiz-detail/quiz-item/quiz-header.tsx:236-285 — per-row Từ chối/Duyệt/Duyệt lại
//   src/components/pages/question-bank/bank-detail/components/QuestionListSection.tsx:170-242 — bulk Duyệt({n})/Từ chối({n})/Duyệt lại({n})
//   src/components/pages/question-bank/bank-detail/QuestionBankDetail.tsx:747-748 — toast bulk "Đã duyệt {n} câu hỏi"/"Đã từ chối {n} câu hỏi"
//   src/components/pages/question-bank/bank-detail/QuestionBankDetail.tsx:841-842 — single-row toast "Đã duyệt câu hỏi"/"Đã từ chối câu hỏi"
export class ApprovalTab {
  readonly subTabPending: Locator;
  readonly subTabApproved: Locator;
  readonly subTabRejected: Locator;
  readonly bulkApproveButton: Locator;
  readonly bulkRejectButton: Locator;
  readonly bulkResubmitButton: Locator;

  constructor(private readonly page: Page) {
    // Pending sub-tabs render as <button> with exact text label.
    this.subTabPending = page.getByRole('button', { name: 'Chờ duyệt', exact: true });
    this.subTabApproved = page.getByRole('button', { name: 'Đã duyệt', exact: true });
    this.subTabRejected = page.getByRole('button', { name: 'Đã từ chối', exact: true });

    // Bulk bar buttons — "Duyệt ({n})", "Từ chối ({n})", "Duyệt lại ({n})".
    this.bulkApproveButton = page.getByRole('button', { name: /^Duyệt \(\d+\)/ });
    this.bulkRejectButton = page.getByRole('button', { name: /^Từ chối \(\d+\)/ });
    this.bulkResubmitButton = page.getByRole('button', { name: /^Duyệt lại \(\d+\)/ });
  }

  async switchToPendingSub(): Promise<void> {
    await this.subTabPending.click();
  }

  async switchToApprovedSub(): Promise<void> {
    await this.subTabApproved.click();
  }

  async switchToRejectedSub(): Promise<void> {
    await this.subTabRejected.click();
  }

  // Per-row buttons live inside the quiz-header (quiz-header.tsx:236-285).
  // Anchor by card param (from bankDetail.questionItemByName).
  async approveRow(card: Locator): Promise<void> {
    await card.getByRole('button', { name: 'Duyệt', exact: true }).click();
    await expect(
      this.page.getByText('Đã duyệt câu hỏi', { exact: false }),
    ).toBeVisible({ timeout: 15_000 });
  }

  async rejectRow(card: Locator): Promise<void> {
    await card.getByRole('button', { name: 'Từ chối', exact: true }).click();
    await expect(
      this.page.getByText('Đã từ chối câu hỏi', { exact: false }),
    ).toBeVisible({ timeout: 15_000 });
  }

  async resubmitRow(card: Locator): Promise<void> {
    await card.getByRole('button', { name: 'Duyệt lại', exact: true }).click();
  }

  async expectBulkApproveSuccess(count: number): Promise<void> {
    await expect(
      this.page.getByText(`Đã duyệt ${count} câu hỏi`, { exact: false }),
    ).toBeVisible({ timeout: 15_000 });
  }

  async expectBulkRejectSuccess(count: number): Promise<void> {
    await expect(
      this.page.getByText(`Đã từ chối ${count} câu hỏi`, { exact: false }),
    ).toBeVisible({ timeout: 15_000 });
  }
}
