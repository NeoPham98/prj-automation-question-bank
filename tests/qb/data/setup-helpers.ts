import type { BanksListPage } from '../pages/BanksListPage';
import type { BankFormDialog } from '../pages/BankFormDialog';
import type { BankDetailPage } from '../pages/BankDetailPage';
import type { QuestionFormPage } from '../pages/QuestionFormPage';
import { expect } from '@playwright/test';

// Shared seed orchestrator: create owned bank + one multiple_choice question.
// Used by edit/delete/bulk-approve/approval-workflow specs that need a starter row.

export interface SeedResult {
  bankName: string;
  questionName: string;
}

export async function createBankWithMcQuestion(
  banksList: BanksListPage,
  bankForm: BankFormDialog,
  bankDetail: BankDetailPage,
  questionForm: QuestionFormPage,
  prefix: string,
): Promise<SeedResult> {
  const stamp = Date.now();
  const bankName = `${prefix}_BANK_${stamp}`;
  const questionName = `${prefix}_Q_${stamp}`;

  await banksList.goto();
  await banksList.openCreateDialog();
  await bankForm.createBank(bankName, `seed ${prefix}`);
  await expect(banksList.cardByName(bankName)).toBeVisible({ timeout: 15_000 });

  await banksList.openCardByName(bankName);
  await bankDetail.switchToLibrary();
  await bankDetail.openCreateManual();
  await questionForm.saveMultipleChoiceQuestion(questionName);

  return { bankName, questionName };
}

// Cleanup: delete the ephemeral bank via the list page.
// Tolerates absence (bank may already be gone if test removed it).
export async function deleteBank(
  banksList: BanksListPage,
  bankName: string,
): Promise<void> {
  await banksList.goto();
  const card = banksList.cardByName(bankName);
  if ((await card.count()) === 0) return;
  await banksList.openDeleteDialog(bankName);
  await banksList.confirmDelete();
}
