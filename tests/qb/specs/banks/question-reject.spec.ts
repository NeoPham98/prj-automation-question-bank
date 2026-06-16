import { test, expect } from '../../fixtures/qb.fixture';
import {
  createBankWithMcQuestion,
  deleteBank,
} from '../../data/setup-helpers';

// xlsx III.8 (R194) — reject branch only (approve branch covered by lifecycle-per-type).
// mcq is enough to validate per-row Từ chối + Gửi lại resubmit affordance.
//
// Workflow:
//   1. seed bank + 1 mcq (draft).
//   2. Library → "Gửi duyệt" → status=pending.
//   3. Duyệt câu hỏi tab → Chờ duyệt sub → "Từ chối" → toast.
//   4. Kho cá nhân → filter Bị từ chối → card visible + "Gửi lại" button.

test.describe('Question reject branch (III.8)', () => {
  let bankName = '';

  test.afterEach(async ({ banksList }) => {
    if (bankName) {
      await deleteBank(banksList, bankName);
      bankName = '';
    }
  });

  test('moderator rejects pending mcq → library Bị từ chối + Gửi lại visible', async ({
    banksList,
    bankForm,
    bankDetail,
    questionForm,
    approval,
  }) => {
    const seed = await createBankWithMcQuestion(
      banksList,
      bankForm,
      bankDetail,
      questionForm,
      'QRJ',
    );
    bankName = seed.bankName;

    const canModerate = await bankDetail.hasModeratePermission();
    test.skip(
      !canModerate,
      'Account lacks canModerateThisBank — skipping moderator-only spec.',
    );

    // Promote draft → pending.
    await bankDetail.switchToLibrary();
    await bankDetail.setLibraryStatusFilter('draft');
    await bankDetail.clickSendForReview(seed.questionName);

    // Reject on Chờ duyệt sub.
    await bankDetail.switchToPendingTab();
    await approval.switchToPendingSub();
    const card = bankDetail.questionItemByName(seed.questionName);
    await expect(card).toBeVisible({ timeout: 15_000 });
    await approval.rejectRow(card);

    // Verify Bị từ chối filter + Gửi lại button on card
    // (quiz-header.tsx:307-318, rejected + canModerate).
    await bankDetail.switchToLibrary();
    await bankDetail.setLibraryStatusFilter('rejected');
    const rejectedCard = bankDetail.questionItemByName(seed.questionName);
    await expect(rejectedCard).toBeVisible({ timeout: 15_000 });
    await expect(
      bankDetail.resubmitButtonOnCard(seed.questionName),
    ).toBeVisible({ timeout: 10_000 });
  });
});
