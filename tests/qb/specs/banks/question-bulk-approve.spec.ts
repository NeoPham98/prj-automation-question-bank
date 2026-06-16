import { test, expect } from '../../fixtures/qb.fixture';
import {
  createBankWithMcQuestion,
  deleteBank,
} from '../../data/setup-helpers';

// xlsx III.7 (R180) — bulk moderation actions on Duyệt câu hỏi tab.
// Pending sub-tabs (Chờ duyệt / Đã duyệt / Đã từ chối) and bulk Duyệt(n)/Từ chối(n) bar.
// Both tests gate on canModerateThisBank — test.skip if teacher-only role.

test.describe('Question bulk approve', () => {
  let bankName = '';

  test.afterEach(async ({ banksList }) => {
    if (bankName) {
      await deleteBank(banksList, bankName);
      bankName = '';
    }
  });

  test('moderator sees pending sub-tabs scaffold', async ({
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
      'BULKAP_TABS',
    );
    bankName = seed.bankName;

    const canModerate = await bankDetail.hasModeratePermission();
    test.skip(
      !canModerate,
      'Account lacks canModerateThisBank — skipping moderator-only spec.',
    );

    await bankDetail.switchToPendingTab();
    await expect(approval.subTabPending).toBeVisible();
    await expect(approval.subTabApproved).toBeVisible();
    await expect(approval.subTabRejected).toBeVisible();
    await approval.switchToPendingSub();
    await expect(approval.subTabPending).toBeVisible();
  });

  test('moderator bulk approve bar renders when selecting pending row', async ({
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
      'BULKAP_BAR',
    );
    bankName = seed.bankName;

    const canModerate = await bankDetail.hasModeratePermission();
    test.skip(
      !canModerate,
      'Account lacks canModerateThisBank — skipping moderator-only spec.',
    );

    await bankDetail.switchToLibrary();
    await bankDetail.setLibraryStatusFilter('draft');
    await bankDetail.clickSendForReview(seed.questionName);

    await bankDetail.switchToPendingTab();
    await approval.switchToPendingSub();
    const card = bankDetail.questionItemByName(seed.questionName);
    await expect(card).toBeVisible({ timeout: 15_000 });

    await bankDetail.toggleSelectQuestion(seed.questionName);
    await expect(approval.bulkApproveButton).toBeVisible({ timeout: 10_000 });
    await expect(approval.bulkApproveButton).toContainText('1');
    await expect(approval.bulkRejectButton).toBeVisible();
    await expect(approval.bulkRejectButton).toContainText('1');
  });
});
