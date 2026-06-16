import { test, expect } from '../../fixtures/qb.fixture';
import { CurriculumListPage } from '../../pages/CurriculumListPage';

// KCT approval workflow — draft → submit → pending → approve → approved → public/private toggle → picker verify → delete.
// xlsx mapping: II.3 — KCT approval. Admin acc (datpq20798) required for APPROVAL_CURRICULUM_FRAMEWORK perm.
// Acceptance per spec author:
//   • Draft → "Gửi duyệt" toast + card moves to Chờ duyệt tab
//   • Pending → "Duyệt" action toast + card moves to Đã duyệt tab
//   • Approved → Switch Riêng tư ↔ Công khai. Công khai = khung appears in BankFormDialog program picker; Riêng tư = excluded
//   • Approved → can delete; card removed
// Sources:
//   src/components/pages/curriculum-frame/index.tsx:262,332,438 — approval toasts
//   src/components/pages/curriculum-frame/components/CurriculumFrameworkCard.tsx — Switch + actions
//   src/components/Dropdown/drop-down-program.tsx — picker query filters is_published=true AND is_active=true

const KCT_APPROVE_PREFIX = 'TEST_KCT_APPROVE';

test.describe('Curriculum approval workflow (Duyệt/Hủy duyệt + public toggle)', () => {
  test.describe.configure({ mode: 'serial' });

  let frameName = '';
  let frameId = '';

  test.beforeAll(() => {
    const stamp = Date.now();
    frameName = `${KCT_APPROVE_PREFIX}_${stamp}`;
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: '.auth/admin.json' });
    const page = await context.newPage();
    try {
      const list = new CurriculumListPage(page);
      await list.cleanupByPrefix(KCT_APPROVE_PREFIX);
    } catch {
      // ignore
    } finally {
      await context.close();
    }
  });

  test('seed draft khung', async ({ curriculumList, curriculumForm, curriculum }) => {
    await curriculumList.goto();
    await curriculumList.gotoTab('draft');
    await curriculumList.openCreateDialog();
    frameId = await curriculumForm.create(frameName, 'Approval workflow baseline');
    expect(frameId).toBeTruthy();
    await curriculum.expectDetailLoaded();
  });

  test('submit for review → card appears on Chờ duyệt tab', async ({ curriculumList }) => {
    await curriculumList.gotoTab('draft');
    await curriculumList.expectCardVisible(frameName);
    await curriculumList.submitForReview(frameName);
    // App impl: handleSubmitForReview only inserts pending acceptable; is_published unchanged.
    // → card still appears on Bản nháp tab but "Gửi duyệt" button now disabled (Card.tsx:165).
    // → card also appears on Chờ duyệt tab via skelaton_acceptables.acceptable_type='pending'.
    await curriculumList.gotoTab('pending');
    await curriculumList.expectCardVisible(frameName);
  });

  test('approve from Chờ duyệt → moves to Đã duyệt tab', async ({ curriculumList }) => {
    await curriculumList.gotoTab('pending');
    await curriculumList.expectCardVisible(frameName);
    await curriculumList.approveFromCard(frameName);
    await curriculumList.gotoTab('pending');
    await curriculumList.expectCardHidden(frameName);
    await curriculumList.gotoTab('approved');
    await curriculumList.expectCardVisible(frameName);
  });

  test('toggle Riêng tư ↔ Công khai → picker reflects state', async ({
    curriculumList,
    banksList,
    bankForm,
    page,
  }) => {
    await curriculumList.gotoTab('approved');
    await curriculumList.expectCardVisible(frameName);

    // First toggle — capture resulting state.
    const stateA = await curriculumList.togglePublishOnCard(frameName);
    await expectKhungInPicker(page, banksList, bankForm, frameName, stateA === 'Công khai');

    // Second toggle — opposite state.
    await curriculumList.gotoTab('approved');
    const stateB = await curriculumList.togglePublishOnCard(frameName);
    expect(stateB).not.toBe(stateA);
    await expectKhungInPicker(page, banksList, bankForm, frameName, stateB === 'Công khai');
  });

  test('delete from Đã duyệt → card removed', async ({ curriculumList }) => {
    await curriculumList.gotoTab('approved');
    await curriculumList.expectCardVisible(frameName);
    await curriculumList.openDeleteDialog(frameName);
    await curriculumList.confirmDelete();
    await curriculumList.expectCardHidden(frameName);
  });
});

// Helper — opens BankFormDialog, opens program picker, asserts khung presence, closes without saving.
// drop-down-program.tsx filters skelaton WHERE category.code='program' AND is_active=true AND is_published=true.
async function expectKhungInPicker(
  page: import('@playwright/test').Page,
  banksList: import('../../pages/BanksListPage').BanksListPage,
  bankForm: import('../../pages/BankFormDialog').BankFormDialog,
  name: string,
  shouldExist: boolean,
): Promise<void> {
  await banksList.goto();
  await banksList.openCreateDialog();
  await bankForm.expectOpen('create');
  await bankForm.programTrigger.click();
  // Radix Select renders options in portal under body. Wait briefly for list mount.
  await page.locator('[role="option"]').first().waitFor({ state: 'visible', timeout: 10_000 });
  const option = page.getByRole('option', { name, exact: true });
  if (shouldExist) {
    await expect(option).toBeVisible({ timeout: 10_000 });
  } else {
    await expect(option).toHaveCount(0, { timeout: 5_000 });
  }
  // Close picker + dialog without saving.
  await page.keyboard.press('Escape');
  await bankForm.cancel();
  await expect(bankForm.dialog).toBeHidden({ timeout: 5_000 });
}
