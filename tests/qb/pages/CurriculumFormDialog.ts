import { Page, Locator, expect } from '@playwright/test';
import { raceAgainstErrorToast } from './toast-helpers';

// KCT create/edit modal (CurriculumFrameworkFormModal).
// Source: src/components/pages/curriculum-frame/components/CurriculumFrameworkFormModal.tsx:74-124
export class CurriculumFormDialog {
  readonly dialog: Locator;
  readonly titleCreate: Locator;
  readonly titleEdit: Locator;
  readonly nameInput: Locator;
  readonly descInput: Locator;
  readonly cancelButton: Locator;
  readonly submitCreate: Locator;
  readonly submitEdit: Locator;

  constructor(private readonly page: Page) {
    this.dialog = page.locator('[role="dialog"]').filter({
      hasText: /Thêm khung chương trình mới|Chỉnh sửa khung chương trình/,
    });
    this.titleCreate = this.dialog.getByText('Thêm khung chương trình mới', { exact: true });
    this.titleEdit = this.dialog.getByText('Chỉnh sửa khung chương trình', { exact: true });

    this.nameInput = this.dialog.locator('input#curriculum-name');
    this.descInput = this.dialog.locator('textarea#curriculum-desc');

    this.cancelButton = this.dialog.getByRole('button', { name: 'Hủy', exact: true });
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

  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  async fillDescription(desc: string): Promise<void> {
    await this.descInput.fill(desc);
  }

  // Create: app redirects to /curriculum/{newId}.
  // Edit: dialog closes; stays on /curriculum.
  async submit(mode: 'create' | 'edit'): Promise<void> {
    const btn = mode === 'create' ? this.submitCreate : this.submitEdit;
    if (mode === 'create') {
      const navPromise = this.page.waitForURL(/\/curriculum\/[^/]+/, { timeout: 20_000 });
      await btn.click();
      await raceAgainstErrorToast(this.page, navPromise, 'Curriculum create', 20_000);
    } else {
      await btn.click();
      const dialogClosed = expect(this.dialog).toBeHidden({ timeout: 20_000 });
      await raceAgainstErrorToast(this.page, dialogClosed, 'Curriculum edit', 20_000);
    }
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.dialog).toBeHidden({ timeout: 5_000 });
  }

  // Convenience: create + return URL id segment.
  async create(name: string, description = ''): Promise<string> {
    await this.expectOpen('create');
    await this.fillName(name);
    if (description) await this.fillDescription(description);
    await this.submit('create');
    const id = this.page.url().match(/\/curriculum\/([^/?#]+)/)?.[1];
    if (!id) throw new Error(`Failed to parse curriculum id from URL: ${this.page.url()}`);
    return id;
  }

  async update(name: string, description?: string): Promise<void> {
    await this.expectOpen('edit');
    await this.nameInput.fill(name);
    if (description !== undefined) await this.descInput.fill(description);
    await this.submit('edit');
  }
}
