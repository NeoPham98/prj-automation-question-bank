import { test, expect } from '../../fixtures/qb.fixture';
import { DifficultyDetailPage } from '../../pages/DifficultyDetailPage';

const KDK_CRUD_PREFIX = 'TEST_KDK_CRUD';

test.describe('Difficulty CRUD (Tạo/Sửa/Xóa khung)', () => {
  test.describe.configure({ mode: 'serial' });

  let baseName = '';
  let renamedName = '';

  test.beforeAll(() => {
    const stamp = Date.now();
    baseName = `${KDK_CRUD_PREFIX}_${stamp}`;
    renamedName = `${KDK_CRUD_PREFIX}_EDITED_${stamp}`;
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: '.auth/admin.json' });
    const page = await context.newPage();
    try {
      const difficulty = new DifficultyDetailPage(page);
      await difficulty.cleanupByPrefix(KDK_CRUD_PREFIX);
    } catch {
      // ignore
    } finally {
      await context.close();
    }
  });

  test('create khung (draft) → redirects to detail page', async ({ difficulty }) => {
    await difficulty.gotoTab('draft');
    const id = await difficulty.createFramework(baseName);
    expect(id).toBeTruthy();
    await difficulty.expectDetailLoaded();
    await expect(difficulty.detailHeading).toContainText(baseName, { timeout: 15_000 });
  });

  test('edit khung name → card reflects new name in draft tab', async ({ difficulty }) => {
    await difficulty.gotoTab('draft');
    await difficulty.expectCardVisible(baseName);
    await difficulty.openEditDialog(baseName);
    await difficulty.updateFramework(renamedName);
    await difficulty.expectCardVisible(renamedName);
    await difficulty.expectCardHidden(baseName);
  });

  test('delete khung → card removed from draft tab', async ({ difficulty }) => {
    await difficulty.gotoTab('draft');
    await difficulty.expectCardVisible(renamedName);
    await difficulty.openDeleteDialog(renamedName);
    await difficulty.confirmDelete();
    await difficulty.expectCardHidden(renamedName);
  });
});
