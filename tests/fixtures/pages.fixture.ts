import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SearchDialog } from '../pages/SearchDialog';

type Pages = {
  homePage: HomePage;
  searchDialog: SearchDialog;
};

export const test = base.extend<Pages>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },
  searchDialog: async ({ page }, use) => {
    const searchDialog = new SearchDialog(page);
    await use(searchDialog);
  },
});

export { expect } from '@playwright/test';
