import { test, expect } from '../../fixtures/qb.fixture';
import {
  createBankWithMcQuestion,
  deleteBank,
} from '../../data/setup-helpers';

// xlsx III.10 (R212) — delete question from library tab.
// Per-question delete (quiz-header.tsx:181-192 red trash icon).
// Confirm modal "Bạn có chắc muốn xóa câu hỏi này?" -> "Xác nhận".

test.describe('Question delete', () => {
  let bankName = '';

  test.afterEach(async ({ banksList }) => {
    if (bankName) {
      await deleteBank(banksList, bankName);
      bankName = '';
    }
  });

  test('delete confirm dialog opens from trash button', async ({
    banksList,
    bankForm,
    bankDetail,
    questionForm,
  }) => {
    const seed = await createBankWithMcQuestion(
      banksList,
      bankForm,
      bankDetail,
      questionForm,
      'DEL_DLG',
    );
    bankName = seed.bankName;
    const card = bankDetail.questionItemByName(seed.questionName);

    await expect(card).toBeVisible({ timeout: 15_000 });
    await bankDetail.clickDeleteQuestion(seed.questionName);
    await expect(bankDetail.deleteConfirmDialog).toBeVisible();
    await expect(bankDetail.deleteConfirmDialog).toContainText('Bạn có chắc muốn xóa câu hỏi này?');
    await expect(bankDetail.deleteConfirmButton).toBeVisible();
    await expect(bankDetail.deleteCancelButton).toBeVisible();
    await expect(card).toBeVisible();

    // Cancel — leave seed for afterEach bank cleanup.
    await bankDetail.deleteCancelButton.click();
    await expect(bankDetail.deleteConfirmDialog).toBeHidden({ timeout: 5_000 });
    await expect(card).toBeVisible();
  });

  test('confirm removes question from library list', async ({
    banksList,
    bankForm,
    bankDetail,
    questionForm,
  }) => {
    const seed = await createBankWithMcQuestion(
      banksList,
      bankForm,
      bankDetail,
      questionForm,
      'DEL_GO',
    );
    bankName = seed.bankName;
    const card = bankDetail.questionItemByName(seed.questionName);

    await expect(card).toBeVisible({ timeout: 15_000 });
    await bankDetail.clickDeleteQuestion(seed.questionName);
    await expect(bankDetail.deleteConfirmDialog).toContainText('Bạn có chắc muốn xóa câu hỏi này?');
    await expect(bankDetail.deleteConfirmButton).toBeVisible();
    await expect(bankDetail.deleteCancelButton).toBeVisible();

    await bankDetail.confirmDeleteQuestion();

    await expect(card).toHaveCount(0, { timeout: 15_000 });
  });
});
