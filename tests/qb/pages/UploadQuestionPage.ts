import { Page, Locator, expect } from '@playwright/test';

// Upload Excel page (/banks/[id]/create/upload?mode=excel).
// Sources:
//   src/components/pages/question-bank/create-quiz/BankCreateUpload.tsx:2477-2498 — hidden file input + "Chọn file Excel" button
//   src/components/pages/question-bank/create-quiz/BankCreateUpload.tsx:2565-2577 — Save button (variant=action) "Lưu"
//   src/components/pages/question-bank/create-quiz/BankCreateUpload.tsx:2274 — success toast "Đã lưu {n} câu hỏi vào ngân hàng."
//   src/components/pages/question-bank/create-quiz/BankCreateUpload.tsx:2582-2591 — empty preview placeholder "Trình chỉnh sửa sẽ hiển thị ở đây"
export class UploadQuestionPage {
  readonly fileInput: Locator;
  readonly pickFileButton: Locator;
  readonly saveButton: Locator;
  readonly emptyPreview: Locator;
  readonly toast: Locator;

  constructor(private readonly page: Page) {
    // Hidden <input type="file" accept=".xlsx,.xls,.xlsm">. setInputFiles works on hidden inputs.
    this.fileInput = page.locator('input[type="file"][accept*=".xlsx"]');
    // Pick button is the wrapping label clickable area — anchor by visible text.
    this.pickFileButton = page.getByText('Chọn file Excel', { exact: true });
    // Save button — variant=action, exact text "Lưu".
    this.saveButton = page.getByRole('button', { name: 'Lưu', exact: true });
    this.emptyPreview = page.getByText('Trình chỉnh sửa sẽ hiển thị ở đây', {
      exact: true,
    });
    this.toast = page.locator('[data-sonner-toast]').first();
  }

  async expectLoaded(): Promise<void> {
    await this.pickFileButton.waitFor({ state: 'visible', timeout: 15_000 });
    // Save button disabled when previewBlocks.length === 0 — assert presence only.
    await expect(this.saveButton).toBeVisible({ timeout: 5_000 });
  }

  async uploadFile(absolutePath: string): Promise<void> {
    await this.fileInput.setInputFiles(absolutePath);
    // Empty placeholder vanishes once previewBlocks parsed.
    await expect(this.emptyPreview).toBeHidden({ timeout: 30_000 });
  }

  async save(): Promise<void> {
    await expect(this.saveButton).toBeEnabled({ timeout: 15_000 });
    await this.saveButton.click();
  }

  // ToastColor wraps raw Sonner toast() → no data-type attrs. Detect error via
  // icon class (XCircle text-red-600).
  private errorToastLocator(): Locator {
    return this.page.locator('[data-sonner-toast]:has(svg.text-red-600)');
  }

  async expectNoErrorToast(): Promise<void> {
    await expect(this.errorToastLocator()).toHaveCount(0, { timeout: 2_000 });
  }

  async expectSaveSuccess(): Promise<void> {
    // Race: success toast vs error toast. If save fails the validation/server
    // toast shows up before success toast → throw with toast text. Prevents
    // false pass when "Lưu" stays on the upload page without redirect.
    const successToast = this.page
      .getByText(/Đã lưu \d+ câu hỏi vào ngân hàng/)
      .waitFor({ state: 'visible', timeout: 30_000 })
      .then(() => 'success' as const);

    const errorToast = this.errorToastLocator().first();
    const failure = errorToast
      .waitFor({ state: 'visible', timeout: 30_000 })
      .then(async () => {
        const text = await errorToast.textContent();
        throw new Error(`Upload save failed — toast: ${(text || '').trim() || '<empty>'}`);
      });

    await Promise.race([successToast, failure]);
    await this.expectNoErrorToast();
  }
}
