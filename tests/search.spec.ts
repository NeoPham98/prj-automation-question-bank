import { test, expect } from './fixtures/pages.fixture';

test.describe('Search dialog (POM + skill patterns)', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
    await homePage.openSearch();
  });

  test('dialog opens with empty input', async ({ searchDialog }) => {
    await expect(searchDialog.dialog).toBeVisible();
    await expect(searchDialog.input).toBeFocused();
    await expect(searchDialog.input).toHaveValue('');
  });

  test('typing a query shows matching results', async ({ searchDialog }) => {
    await searchDialog.search('locator');

    await expect(searchDialog.results.first()).toBeVisible();
    const count = await searchDialog.results.count();
    expect(count).toBeGreaterThan(0);
  });

  test('different queries produce different result sets', async ({ searchDialog }) => {
    await searchDialog.search('fixtures');
    await expect(searchDialog.results.first()).toBeVisible();
    const firstHit = await searchDialog.results.first().textContent();

    await searchDialog.clear();
    await searchDialog.search('trace');
    await expect(searchDialog.results.first()).toBeVisible();
    const secondHit = await searchDialog.results.first().textContent();

    expect(firstHit).not.toBe(secondHit);
  });

  test('escape closes the dialog', async ({ searchDialog }) => {
    await searchDialog.close();
    await expect(searchDialog.dialog).toBeHidden();
  });
});
