import { test, expect } from '../../fixtures/qb.fixture';
import {
  createBankWithMcQuestion,
  deleteBank,
} from '../../data/setup-helpers';

// xlsx III.8 (R194) — single-row approval workflow on Duyệt câu hỏi tab.
// Moderator-only. Per-row buttons in quiz-header.tsx:236-285:
//   Chờ duyệt sub: Từ chối / Duyệt
//   Đã từ chối sub: Duyệt lại
// All tests gate on canModerateThisBank — test.skip if teacher-only role.

test.describe('Approval workflow', () => {
  let bankName = '';

  test.afterEach(async ({ banksList }) => {
    if (bankName) {
      await deleteBank(banksList, bankName);
      bankName = '';
    }
  });

  test('moderator can switch between pending sub-tabs', async ({
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
      'APW_TABS',
    );
    bankName = seed.bankName;

    const canModerate = await bankDetail.hasModeratePermission();
    test.skip(
      !canModerate,
      'Account lacks canModerateThisBank — skipping moderator-only spec.',
    );

    await bankDetail.switchToPendingTab();
    await approval.switchToApprovedSub();
    await approval.switchToRejectedSub();
    await approval.switchToPendingSub();
    await expect(approval.subTabPending).toBeVisible();
  });

  test('moderator approves single pending row', async ({
    page,
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
      'APW_OK',
    );
    bankName = seed.bankName;

    const canModerate = await bankDetail.hasModeratePermission();
    test.skip(
      !canModerate,
      'Account lacks canModerateThisBank — skipping moderator-only spec.',
    );

    await bankDetail.switchToPendingTab();
    await approval.switchToPendingSub();

    const rows = page.locator('div[id]:has(button)');
    test.skip(
      (await rows.count()) === 0,
      'No questions in Chờ duyệt sub-tab to approve.',
    );

    const firstCard = rows.first();
    await approval.approveRow(firstCard);
  });

  test('moderator rejects single pending row', async ({
    page,
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
      'APW_RJ',
    );
    bankName = seed.bankName;

    const canModerate = await bankDetail.hasModeratePermission();
    test.skip(
      !canModerate,
      'Account lacks canModerateThisBank — skipping moderator-only spec.',
    );

    await bankDetail.switchToPendingTab();
    await approval.switchToPendingSub();

    const rows = page.locator('div[id]:has(button)');
    test.skip(
      (await rows.count()) === 0,
      'No questions in Chờ duyệt sub-tab to reject.',
    );

    const firstCard = rows.first();
    await approval.rejectRow(firstCard);
  });
});
