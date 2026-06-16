import { test, expect } from '../../fixtures/qb.fixture';
import { CurriculumListPage } from '../../pages/CurriculumListPage';

// KCT CRUD (Khung chương trình) — Tạo / Sửa / Xóa khung (draft tab).
// xlsx mapping: II.1 — KCT CRUD. Admin acc (datpq20798) needed for INSERT_/EDIT_/DELETE_CURRICULUM_FRAMEWORK perms.
// Sources:
//   src/components/pages/curriculum-frame/components/CurriculumFrameworkList.tsx:131-143 — "Thêm khung chương trình" CTA card
//   src/components/pages/curriculum-frame/components/CurriculumFrameworkFormModal.tsx:74-124 — create/edit modal
//   src/components/pages/curriculum-frame/components/CurriculumFrameworkCard.tsx:191-202 — pencil + trash hover actions
//   src/components/pages/curriculum-frame/index.tsx:284,332,438 — toasts 'Đã tạo khung chương trình mới', 'Đã cập nhật', 'Đã xóa khung chương trình.'

const KCT_CRUD_PREFIX = 'TEST_KCT_CRUD';

test.describe('Curriculum CRUD (Tạo/Sửa/Xóa khung)', () => {
  test.describe.configure({ mode: 'serial' });

  let baseName = '';
  let renamedName = '';

  test.beforeAll(() => {
    const stamp = Date.now();
    baseName = `${KCT_CRUD_PREFIX}_${stamp}`;
    renamedName = `${KCT_CRUD_PREFIX}_EDITED_${stamp}`;
  });

  test.afterAll(async ({ browser }) => {
    // page/context fixtures are test-scoped — afterAll runs at worker scope.
    // Spin up a fresh context with the same storageState to run cleanup.
    const context = await browser.newContext({ storageState: '.auth/admin.json' });
    const page = await context.newPage();
    try {
      const list = new CurriculumListPage(page);
      await list.cleanupByPrefix(KCT_CRUD_PREFIX);
    } catch {
      // ignore — cleanup best-effort
    } finally {
      await context.close();
    }
  });

  test('create khung (draft) → redirects to detail page', async ({
    curriculumList,
    curriculumForm,
    curriculum,
  }) => {
    await curriculumList.goto();
    await curriculumList.gotoTab('draft');
    await curriculumList.openCreateDialog();
    const id = await curriculumForm.create(baseName, 'CRUD smoke baseline');
    expect(id).toBeTruthy();
    await curriculum.expectDetailLoaded();
    await expect(curriculum.detailHeading).toContainText(baseName, { timeout: 15_000 });
  });

  test('edit khung name → card reflects new name in draft tab', async ({
    curriculumList,
    curriculumForm,
  }) => {
    await curriculumList.gotoTab('draft');
    await curriculumList.expectCardVisible(baseName);
    await curriculumList.openEditDialog(baseName);
    await curriculumForm.update(renamedName);
    await curriculumList.expectCardVisible(renamedName);
    await curriculumList.expectCardHidden(baseName);
  });

  test('delete khung → card removed from draft tab', async ({ curriculumList }) => {
    await curriculumList.gotoTab('draft');
    await curriculumList.expectCardVisible(renamedName);
    await curriculumList.openDeleteDialog(renamedName);
    await curriculumList.confirmDelete();
    await curriculumList.expectCardHidden(renamedName);
  });
});
