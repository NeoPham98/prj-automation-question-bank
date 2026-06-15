import { test, expect } from '../../fixtures/qb.fixture';

// xlsx mapping: III.1 (open dialog), III.2 (create), III.3 (edit),
// III.4 (delete confirm), III.11 (cancel create), III.12 (cancel delete).
const BANK_PREFIX = 'TEST_BANK_';

test.describe('Banks CRUD', () => {
  test('open create dialog and cancel — dialog hidden (III.1, III.11)', async ({
    banksList,
    bankForm,
  }) => {
    await banksList.goto();
    await banksList.openCreateDialog();
    await bankForm.expectOpen('create');
    await bankForm.cancel();
    await expect(bankForm.dialog).toBeHidden({ timeout: 5_000 });
  });

  test('create bank → card visible in list (III.2)', async ({ banksList, bankForm }) => {
    const name = `${BANK_PREFIX}create_${Date.now()}`;
    await banksList.goto();
    await banksList.openCreateDialog();
    await bankForm.createBank(name, 'auto smoke description');
    await expect(banksList.cardByName(name)).toBeVisible({ timeout: 15_000 });

    await banksList.openDeleteDialog(name);
    await banksList.confirmDelete();
  });

  test('edit bank → rename → new card visible (III.3)', async ({ banksList, bankForm }) => {
    const original = `${BANK_PREFIX}edit_${Date.now()}`;
    const renamed = `${original}_renamed`;

    await banksList.goto();
    await banksList.openCreateDialog();
    await bankForm.createBank(original);
    await expect(banksList.cardByName(original)).toBeVisible({ timeout: 15_000 });

    await banksList.openEditDialog(original);
    await bankForm.expectOpen('edit');
    await bankForm.fillName(renamed);
    await bankForm.submit('edit');
    await expect(banksList.cardByName(renamed)).toBeVisible({ timeout: 15_000 });

    await banksList.openDeleteDialog(renamed);
    await banksList.confirmDelete();
  });

  test('delete bank with confirm → card gone (III.4)', async ({ banksList, bankForm }) => {
    const name = `${BANK_PREFIX}delete_${Date.now()}`;
    await banksList.goto();
    await banksList.openCreateDialog();
    await bankForm.createBank(name);
    await expect(banksList.cardByName(name)).toBeVisible({ timeout: 15_000 });

    await banksList.openDeleteDialog(name);
    await banksList.confirmDelete();
    await expect(banksList.cardByName(name)).toBeHidden({ timeout: 10_000 });
  });

  test('cancel delete keeps card (III.12)', async ({ banksList, bankForm }) => {
    const name = `${BANK_PREFIX}canceldel_${Date.now()}`;
    await banksList.goto();
    await banksList.openCreateDialog();
    await bankForm.createBank(name);
    await expect(banksList.cardByName(name)).toBeVisible({ timeout: 15_000 });

    await banksList.openDeleteDialog(name);
    await banksList.cancelDelete();
    await expect(banksList.deleteDialog).toBeHidden({ timeout: 5_000 });
    await expect(banksList.cardByName(name)).toBeVisible();

    await banksList.openDeleteDialog(name);
    await banksList.confirmDelete();
  });
});
