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

    await bankDetail.clickDeleteQuestion(seed.questionName);
    await expect(bankDetail.deleteConfirmDialog).toBeVisible();
    await expect(bankDetail.deleteConfirmButton).toBeVisible();

    // Cancel — leave seed for afterEach bank cleanup.
    await bankDetail.deleteCancelButton.click();
    await expect(bankDetail.deleteConfirmDialog).toBeHidden({ timeout: 5_000 });
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

    await bankDetail.clickDeleteQuestion(seed.questionName);
    await bankDetail.confirmDeleteQuestion();

    await expect(
      bankDetail.questionItemByName(seed.questionName),
    ).toHaveCount(0, { timeout: 15_000 });
  });
});
