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
  });

  test('moderator bulk approve bar renders when selecting pending row', async ({
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
      'BULKAP_BAR',
    );
    bankName = seed.bankName;

    const canModerate = await bankDetail.hasModeratePermission();
    test.skip(
      !canModerate,
      'Account lacks canModerateThisBank — skipping moderator-only spec.',
    );

    await bankDetail.switchToPendingTab();
    await approval.switchToPendingSub();

    // Pending sub-tab populated only when other users submitted drafts for review;
    // dev DB state is not seeded, so gate on row presence.
    const items = page.locator('div[id]:has(button)');
    const itemCount = await items.count();
    test.skip(
      itemCount === 0,
      'No questions in Chờ duyệt sub-tab to drive bulk bar.',
    );

    await page
      .locator('div.absolute.top-1\\.5.left-1\\.5 [role="checkbox"]')
      .first()
      .click();
    await expect(approval.bulkApproveButton).toBeVisible({ timeout: 10_000 });
    await expect(approval.bulkRejectButton).toBeVisible();
  });
});
