import { test, expect } from '../../fixtures/qb.fixture';

// xlsx mapping: III.13 (R229) — search filters bank list.
const BANK_PREFIX = 'TEST_BANK_';

test.describe('Banks search', () => {
  test('search by unique name shows matching card (III.13)', async ({ banksList, bankForm }) => {
    const unique = `${BANK_PREFIX}search_${Date.now()}`;

    await banksList.goto();
    await banksList.openCreateDialog();
    await bankForm.createBank(unique);
    await expect(banksList.cardByName(unique)).toBeVisible({ timeout: 15_000 });

    await banksList.search(unique);
    await expect(banksList.cardByName(unique)).toBeVisible({ timeout: 5_000 });

    await banksList.clearSearch();
    await banksList.openDeleteDialog(unique);
    await banksList.confirmDelete();
  });

  test('clear search restores list heading (III.13)', async ({ banksList }) => {
    await banksList.goto();
    await banksList.search('NoMatchPhrase_xyz_99999');
    await banksList.clearSearch();
    await expect(banksList.heading).toBeVisible();
  });
});
