import { test, expect } from '../../fixtures/qb.fixture';

// xlsx mapping: III.13 (R229) — search filters bank list.
const BANK_PREFIX = 'TEST_BANK_';

test.describe('Banks search', () => {
  test('search by unique name shows matching card (III.13)', async ({ banksList, bankForm }) => {
    const unique = `${BANK_PREFIX}search_${Date.now()}`;

    await banksList.goto();
    await expect(banksList.heading).toBeVisible();
    await expect(banksList.searchInput).toBeVisible();

    await banksList.openCreateDialog();
    await bankForm.createBank(unique);
    const card = banksList.cardByName(unique);
    await expect(card).toBeVisible({ timeout: 15_000 });

    await banksList.search(unique);
    await expect(banksList.searchInput).toHaveValue(unique);
    await expect(card).toBeVisible({ timeout: 5_000 });

    await banksList.search('NoMatchPhrase_xyz_99999');
    await expect(banksList.searchInput).toHaveValue('NoMatchPhrase_xyz_99999');
    await expect(card).toHaveCount(0);

    await banksList.clearSearch();
    await expect(banksList.searchInput).toHaveValue('');
    await expect(banksList.heading).toBeVisible();

    await banksList.openDeleteDialog(unique);
    await banksList.confirmDelete();
  });

  test('clear search restores list heading (III.13)', async ({ banksList }) => {
    await banksList.goto();
    await expect(banksList.heading).toBeVisible();
    await expect(banksList.searchInput).toBeVisible();
    await expect(banksList.systemSection.or(banksList.schoolSection).first()).toBeVisible();

    await banksList.search('NoMatchPhrase_xyz_99999');
    await expect(banksList.searchInput).toHaveValue('NoMatchPhrase_xyz_99999');

    await banksList.clearSearch();
    await expect(banksList.searchInput).toHaveValue('');
    await expect(banksList.heading).toBeVisible();
    await expect(banksList.systemSection.or(banksList.schoolSection).first()).toBeVisible();
  });
});
