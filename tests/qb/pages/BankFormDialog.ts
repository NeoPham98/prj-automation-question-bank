import { Page, Locator, expect } from '@playwright/test';
import { raceAgainstErrorToast } from './toast-helpers';

// Create/edit bank modal.
// Source: src/components/pages/question-bank/question-banks/components/BankFormDialog.tsx:55-133
// Sub-dropdowns: src/components/Dropdown/drop-down-program.tsx + drop-down-difficulty.tsx (Radix Select).
export class BankFormDialog {
  readonly dialog: Locator;
  readonly titleCreate: Locator;
  readonly titleEdit: Locator;
  readonly programTrigger: Locator;
  readonly difficultyTrigger: Locator;
  readonly nameInput: Locator;
  readonly descInput: Locator;
  readonly cancelButton: Locator;
  readonly submitCreate: Locator;
  readonly submitEdit: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.locator('[role="dialog"]').filter({
      hasText: /Thêm ngân hàng mới|Cập nhật ngân hàng/,
    });
    this.titleCreate = this.dialog.getByText('Thêm ngân hàng mới', { exact: true });
    this.titleEdit = this.dialog.getByText('Cập nhật ngân hàng', { exact: true });

    // Radix Select triggers — first/second [role="combobox"] in the dialog.
    this.programTrigger = this.dialog.locator('[role="combobox"]').nth(0);
    this.difficultyTrigger = this.dialog.locator('[role="combobox"]').nth(1);

    this.nameInput = this.dialog.locator('input#name');
    this.descInput = this.dialog.locator('textarea#desc');

    this.cancelButton = this.dialog.getByRole('button', { name: 'Huỷ', exact: true });
    this.submitCreate = this.dialog.getByRole('button', { name: 'Tạo mới', exact: true });
    this.submitEdit = this.dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true });
  }

  async expectOpen(mode: 'create' | 'edit'): Promise<void> {
    await expect(this.dialog).toBeVisible({ timeout: 5_000 });
    if (mode === 'create') {
      await expect(this.titleCreate).toBeVisible();
    } else {
      await expect(this.titleEdit).toBeVisible();
    }
  }

  async pickFirstProgram(): Promise<void> {
    await this.programTrigger.click();
    // Radix Select renders options in a portal: [role="option"].
    const firstOption = this.page.locator('[role="option"]').first();
    await firstOption.waitFor({ state: 'visible', timeout: 10_000 });
    await firstOption.click();
  }

  async pickFirstDifficulty(): Promise<void> {
    await this.difficultyTrigger.click();
    const firstOption = this.page.locator('[role="option"]').first();
    await firstOption.waitFor({ state: 'visible', timeout: 10_000 });
    await firstOption.click();
  }

  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  async fillDescription(desc: string): Promise<void> {
    await this.descInput.fill(desc);
  }

  async submit(mode: 'create' | 'edit'): Promise<void> {
    const btn = mode === 'create' ? this.submitCreate : this.submitEdit;
    await btn.click();
    // Race dialog-close (= server accepted) against error toast. Dialog stays
    // open on validation failure → without the race we wait 30s then fail with
    // a vague timeout. With the race we throw immediately + include toast text.
    const dialogClosed = expect(this.dialog).toBeHidden({ timeout: 30_000 });
    await raceAgainstErrorToast(this.page, dialogClosed, `Bank ${mode}`, 30_000);
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async createBank(name: string, description = ''): Promise<void> {
    await this.expectOpen('create');
    await this.pickFirstProgram();
    await this.pickFirstDifficulty();
    await this.fillName(name);
    if (description) await this.fillDescription(description);
    await this.submit('create');
  }
}
