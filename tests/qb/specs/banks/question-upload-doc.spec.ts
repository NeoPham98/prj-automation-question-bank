import * as fs from 'node:fs';
import * as path from 'node:path';
import { test, expect } from '../../fixtures/qb.fixture';
import { deleteBank } from '../../data/setup-helpers';

// xlsx III.5 (R137) upload variant — upload Excel file with questions.
// Route: /banks/{id}/create/upload?mode=excel (BankCreateUpload.tsx).
// Sample fixture path is user-provided; spec test.skip when absent.

// Playwright runs from project root (where playwright.config.ts lives).
const SAMPLE_XLSX = path.resolve(
  'tests/qb/data/fixtures/sample-questions.xlsx',
);

test.describe('Question upload (Excel)', () => {
  let bankName = '';

  test.afterEach(async ({ banksList }) => {
    if (bankName) {
      await deleteBank(banksList, bankName);
      bankName = '';
    }
  });

  test('upload page mounts with empty preview placeholder', async ({
    banksList,
    bankForm,
    bankDetail,
    uploadQuestion,
  }) => {
    bankName = `UPL_PG_BANK_${Date.now()}`;
    await banksList.goto();
    await banksList.openCreateDialog();
    await bankForm.createBank(bankName, 'upload spec');
    await expect(banksList.cardByName(bankName)).toBeVisible({
      timeout: 15_000,
    });
    await banksList.openCardByName(bankName);
    await bankDetail.switchToLibrary();
    await bankDetail.openCreateUpload();

    await uploadQuestion.expectLoaded();
    await expect(uploadQuestion.pickFileButton).toBeVisible();
    await expect(uploadQuestion.saveButton).toBeVisible();
    await expect(uploadQuestion.saveButton).toBeDisabled();
    await expect(uploadQuestion.emptyPreview).toBeVisible();
  });

  test('upload .xlsx then save shows count toast', async ({
    banksList,
    bankForm,
    bankDetail,
    uploadQuestion,
  }) => {
    test.skip(
      !fs.existsSync(SAMPLE_XLSX),
      `Sample fixture missing: ${SAMPLE_XLSX}. Provide an .xlsx with valid question rows.`,
    );

    bankName = `UPL_SV_BANK_${Date.now()}`;
    await banksList.goto();
    await banksList.openCreateDialog();
    await bankForm.createBank(bankName, 'upload save spec');
    await expect(banksList.cardByName(bankName)).toBeVisible({
      timeout: 15_000,
    });
    await banksList.openCardByName(bankName);
    await bankDetail.switchToLibrary();
    await bankDetail.openCreateUpload();
    await uploadQuestion.expectLoaded();
    await expect(uploadQuestion.pickFileButton).toBeVisible();
    await expect(uploadQuestion.saveButton).toBeVisible();
    await expect(uploadQuestion.saveButton).toBeDisabled();
    await expect(uploadQuestion.emptyPreview).toBeVisible();

    await uploadQuestion.uploadFile(SAMPLE_XLSX);
    await expect(uploadQuestion.emptyPreview).toBeHidden({ timeout: 30_000 });
    await expect(uploadQuestion.saveButton).toBeEnabled({ timeout: 15_000 });

    await uploadQuestion.save();
    await uploadQuestion.expectSaveSuccess();
  });
});
