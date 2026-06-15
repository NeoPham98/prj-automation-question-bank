import { test, expect } from '../../fixtures/qb.fixture';

// xlsx mapping: II.2 (R68) — KCT detail view.
// Read-only smoke: list visible → open first framework → tree section anchors present.
test.describe('Curriculum (KCT) detail', () => {
  test('list page heading visible (II.2)', async ({ curriculum }) => {
    await curriculum.gotoList();
    await expect(curriculum.listHeading).toBeVisible();
  });

  test('open first framework → detail anchors visible (II.2)', async ({ curriculum }) => {
    await curriculum.gotoList();
    test.skip(
      !(await curriculum.hasFrameworkCard()),
      'No curriculum frameworks seeded for test user',
    );

    await curriculum.openFirstFramework();
    await curriculum.expectDetailLoaded();
  });

  test('detail page shows max depth label (II.2)', async ({ curriculum }) => {
    await curriculum.gotoList();
    test.skip(
      !(await curriculum.hasFrameworkCard()),
      'No curriculum frameworks seeded for test user',
    );

    await curriculum.openFirstFramework();
    // Tree card section (sticky header) renders after h1 — wait for tree label first.
    await expect(curriculum.treeSectionLabel).toBeVisible({ timeout: 20_000 });
    await expect(curriculum.maxDepthLabel).toBeVisible({ timeout: 10_000 });
  });
});
