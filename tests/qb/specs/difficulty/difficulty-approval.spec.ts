import { test, expect } from '../../fixtures/qb.fixture';
import { DifficultyDetailPage } from '../../pages/DifficultyDetailPage';

const KDK_APPROVE_PREFIX = 'TEST_KDK_APPROVE';

test.describe('Difficulty approval workflow (Duyệt/Từ chối + public toggle)', () => {
  test.describe.configure({ mode: 'serial' });

  let frameName = '';
  let frameId = '';

  test.beforeAll(() => {
    const stamp = Date.now();
    frameName = `${KDK_APPROVE_PREFIX}_${stamp}`;
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: '.auth/admin.json' });
    const page = await context.newPage();
    try {
      const difficulty = new DifficultyDetailPage(page);
      await difficulty.cleanupByPrefix(KDK_APPROVE_PREFIX);
    } catch {
      // ignore
    } finally {
      await context.close();
    }
  });

  test('seed draft khung', async ({ difficulty }) => {
    await difficulty.gotoTab('draft');
    frameId = await difficulty.createFramework(frameName);
    expect(frameId).toBeTruthy();
    await difficulty.expectDetailLoaded();
  });

  test('submit for review → card appears on Chờ duyệt tab', async ({ difficulty }) => {
    await difficulty.gotoTab('draft');
    await difficulty.expectCardVisible(frameName);
    await difficulty.submitForReview(frameName);
    await difficulty.gotoTab('pending');
    await difficulty.expectCardVisible(frameName);
  });

  test('refuse from Chờ duyệt → moves to Bị từ chối tab', async ({ difficulty }) => {
    await difficulty.gotoTab('pending');
    await difficulty.expectCardVisible(frameName);
    await difficulty.refuseFromCard(frameName);
    await difficulty.gotoTab('pending');
    await difficulty.expectCardHidden(frameName);
    await difficulty.gotoTab('refused');
    await difficulty.expectCardVisible(frameName);
  });

  test('resubmit refused framework → returns to Chờ duyệt tab', async ({ difficulty }) => {
    await difficulty.gotoTab('refused');
    await difficulty.expectCardVisible(frameName);
    await difficulty.resubmitForReview(frameName);
    await difficulty.gotoTab('pending');
    await difficulty.expectCardVisible(frameName);
  });

  test('approve from Chờ duyệt → moves to Đã duyệt tab', async ({ difficulty }) => {
    await difficulty.gotoTab('pending');
    await difficulty.expectCardVisible(frameName);
    await difficulty.approveFromCard(frameName);
    await difficulty.gotoTab('pending');
    await difficulty.expectCardHidden(frameName);
    await difficulty.gotoTab('approved');
    await difficulty.expectCardVisible(frameName);
  });

  test('toggle publish twice on approved framework', async ({ difficulty }) => {
    await difficulty.gotoTab('approved');
    await difficulty.expectCardVisible(frameName);

    const stateA = await difficulty.togglePublishOnCard(frameName);
    await difficulty.gotoTab('approved');
    const stateB = await difficulty.togglePublishOnCard(frameName);

    expect(stateB).not.toBe(stateA);
  });

  test('delete approved framework → card removed', async ({ difficulty }) => {
    await difficulty.gotoTab('approved');
    await difficulty.expectCardVisible(frameName);
    await difficulty.openDeleteDialog(frameName);
    await difficulty.confirmDelete();
    await difficulty.expectCardHidden(frameName);
  });
});
