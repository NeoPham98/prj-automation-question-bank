import { test, expect } from '../../fixtures/qb.fixture';
import { CurriculumListPage } from '../../pages/CurriculumListPage';

// Tree CRUD (cây kiến thức) — add 3 levels L1→L2→L3, rename L2, delete L3 leaf.
// xlsx mapping: II.2 — Tree CRUD on detail. Admin acc (datpq20798) required for INSERT_/EDIT_/DELETE_SKELATON perms.
// All tree ops gated by `!isPublished` (CurriculumFrameworkDetail.tsx) — uses draft framework.
// Sources:
//   src/components/pages/curriculum-frame/CurriculumFrameworkDetail.tsx:223,263,308,341 — tree toasts
//   src/components/pages/curriculum-frame/components/Modals/AddSubjectModal.tsx — root add modal
//   src/components/pages/curriculum-frame/components/TreeNode.tsx:121,146-181,220-275,341-391 — inline edit + hover actions

const KCT_TREE_PREFIX = 'TEST_KCT_TREE';

test.describe('Curriculum tree CRUD (cây kiến thức)', () => {
  test.describe.configure({ mode: 'serial' });

  let frameName = '';
  let frameId = '';
  let L1 = '';
  let L2 = '';
  let L3 = '';
  let L2_RENAMED = '';

  test.beforeAll(() => {
    const stamp = Date.now();
    frameName = `${KCT_TREE_PREFIX}_${stamp}`;
    L1 = `L1_root_${stamp}`;
    L2 = `L2_child_${stamp}`;
    L3 = `L3_leaf_${stamp}`;
    L2_RENAMED = `L2_renamed_${stamp}`;
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext({ storageState: '.auth/admin.json' });
    const page = await context.newPage();
    try {
      const list = new CurriculumListPage(page);
      await list.cleanupByPrefix(KCT_TREE_PREFIX);
    } catch {
      // ignore
    } finally {
      await context.close();
    }
  });

  test('seed draft khung for tree CRUD', async ({
    curriculumList,
    curriculumForm,
    curriculum,
  }) => {
    await curriculumList.goto();
    await curriculumList.gotoTab('draft');
    await curriculumList.openCreateDialog();
    frameId = await curriculumForm.create(frameName, 'Tree CRUD smoke baseline');
    expect(frameId).toBeTruthy();
    await curriculum.expectDetailLoaded();
  });

  test('add 3 levels (L1 root → L2 → L3)', async ({ curriculum }) => {
    await curriculum.gotoDetail(frameId);
    await curriculum.addRootNode(L1);
    await curriculum.addChildToNode(L1, L2);
    await curriculum.addChildToNode(L2, L3);
    // Verify all three rows visible (auto-expand on add per TreeNode.tsx:227-228).
    await expect(curriculum.nodeRowByName(L1)).toBeVisible();
    await expect(curriculum.nodeRowByName(L2)).toBeVisible();
    await expect(curriculum.nodeRowByName(L3)).toBeVisible();
  });

  test('rename L2 → L2_RENAMED', async ({ curriculum }) => {
    await curriculum.gotoDetail(frameId);
    // Expand L1 to reveal L2 (lazy-load may collapse on reload).
    await curriculum.expandNode(L1);
    await curriculum.renameNode(L2, L2_RENAMED);
    await expect(curriculum.nodeRowByName(L2_RENAMED)).toBeVisible();
  });

  test('delete L3 leaf → row removed', async ({ curriculum }) => {
    await curriculum.gotoDetail(frameId);
    await curriculum.expandNode(L1);
    await curriculum.expandNode(L2_RENAMED);
    await curriculum.deleteNode(L3);
    await curriculum.expectNodeHidden(L3);
    // Parent L2_RENAMED still present.
    await expect(curriculum.nodeRowByName(L2_RENAMED)).toBeVisible();
  });
});
