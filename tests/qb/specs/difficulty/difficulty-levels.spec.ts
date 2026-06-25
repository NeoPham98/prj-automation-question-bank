import { test, expect } from '../../fixtures/qb.fixture';
import { DifficultyDetailPage } from '../../pages/DifficultyDetailPage';

const KDK_LEVEL_PREFIX = 'TEST_KDK_LEVEL';

test.describe('Difficulty levels CRUD (mức độ)', () => {
  test.describe.configure({ mode: 'serial' });

  let frameName = '';
  let frameId = '';
  let levelA = '';
  let levelB = '';
  let levelBEdited = '';

  test.beforeAll(() => {
    const stamp = Date.now();
    frameName = `${KDK_LEVEL_PREFIX}_${stamp}`;
    levelA = `Muc_do_1_${stamp}`;
    levelB = `Muc_do_2_${stamp}`;
    levelBEdited = `Muc_do_2_EDIT_${stamp}`;
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: '.auth/admin.json' });
    const page = await context.newPage();
    try {
      const difficulty = new DifficultyDetailPage(page);
      await difficulty.cleanupByPrefix(KDK_LEVEL_PREFIX);
    } catch {
      // ignore
    } finally {
      await context.close();
    }
  });

  test('seed draft khung for level CRUD', async ({ difficulty }) => {
    await difficulty.gotoTab('draft');
    frameId = await difficulty.createFramework(frameName);
    expect(frameId).toBeTruthy();
    await difficulty.expectDetailLoaded();
  });

  test('add 2 levels on detail page', async ({ difficulty }) => {
    await difficulty.gotoDetail(frameId);
    await difficulty.addLevel(levelA);
    await difficulty.addLevel(levelB);
    await expect(difficulty.levelRowByName(levelA)).toBeVisible();
    await expect(difficulty.levelRowByName(levelB)).toBeVisible();
  });

  test('edit level name', async ({ difficulty }) => {
    await difficulty.gotoDetail(frameId);
    await difficulty.editLevel(levelB, levelBEdited);
    await expect(difficulty.levelRowByName(levelBEdited)).toBeVisible();
  });

  test('delete edited level', async ({ difficulty }) => {
    await difficulty.gotoDetail(frameId);
    await difficulty.deleteLevel(levelBEdited);
    await difficulty.expectLevelHidden(levelBEdited);
    await expect(difficulty.levelRowByName(levelA)).toBeVisible();
  });
});
