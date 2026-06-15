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

  async expectSaveSuccess(): Promise<void> {
    // Toast: "Đã lưu {n} câu hỏi vào ngân hàng."
    await expect(
      this.page.getByText(/Đã lưu \d+ câu hỏi vào ngân hàng/),
    ).toBeVisible({ timeout: 30_000 });
  }
}
