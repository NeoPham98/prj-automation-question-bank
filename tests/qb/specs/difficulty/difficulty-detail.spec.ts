import { test, expect } from '../../fixtures/qb.fixture';

// I.4 — KĐK detail view.
// Read-only smoke: list visible → open first framework → detail anchors present.

test.describe('Difficulty (KĐK) detail', () => {
  test('list page heading visible (I.4)', async ({ difficulty }) => {
    await difficulty.gotoList();
    await expect(difficulty.listHeading).toBeVisible();
    await expect(difficulty.tabDraft).toBeVisible();
    await expect(difficulty.tabApproved).toBeVisible();
  });

  test('open first framework → detail anchors visible (I.4)', async ({ difficulty }) => {
    await difficulty.gotoList();
    test.skip(
      !(await difficulty.hasFrameworkCard()),
      'No difficulty frameworks seeded for test user',
    );

    await difficulty.openFirstFramework();
    await difficulty.expectDetailLoaded();
  });

  test('detail page shows breadcrumb anchor (I.4)', async ({ difficulty }) => {
    await difficulty.gotoList();
    test.skip(
      !(await difficulty.hasFrameworkCard()),
      'No difficulty frameworks seeded for test user',
    );

    await difficulty.openFirstFramework();
    await expect(difficulty.breadcrumbParent).toBeVisible({ timeout: 15_000 });
  });
});
