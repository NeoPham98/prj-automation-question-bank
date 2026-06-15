import { test as base } from '@playwright/test';
import { SidebarNav } from '../pages/SidebarNav';
import { DashboardPage } from '../pages/DashboardPage';
import { BanksListPage } from '../pages/BanksListPage';
import { BankFormDialog } from '../pages/BankFormDialog';
import { BankDetailPage } from '../pages/BankDetailPage';
import { QuestionFormPage } from '../pages/QuestionFormPage';
import { UploadQuestionPage } from '../pages/UploadQuestionPage';
import { ApprovalTab } from '../pages/ApprovalTab';
import { CurriculumDetailPage } from '../pages/CurriculumDetailPage';
import { DifficultyDetailPage } from '../pages/DifficultyDetailPage';

type QbFixtures = {
  sidebar: SidebarNav;
  dashboardPage: DashboardPage;
  banksList: BanksListPage;
  bankForm: BankFormDialog;
  bankDetail: BankDetailPage;
  questionForm: QuestionFormPage;
  uploadQuestion: UploadQuestionPage;
  approval: ApprovalTab;
  curriculum: CurriculumDetailPage;
  difficulty: DifficultyDetailPage;
};

export const test = base.extend<QbFixtures>({
  sidebar: async ({ page }, use) => {
    await use(new SidebarNav(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  banksList: async ({ page }, use) => {
    await use(new BanksListPage(page));
  },
  bankForm: async ({ page }, use) => {
    await use(new BankFormDialog(page));
  },
  bankDetail: async ({ page }, use) => {
    await use(new BankDetailPage(page));
  },
  questionForm: async ({ page }, use) => {
    await use(new QuestionFormPage(page));
  },
  uploadQuestion: async ({ page }, use) => {
    await use(new UploadQuestionPage(page));
  },
  approval: async ({ page }, use) => {
    await use(new ApprovalTab(page));
  },
  curriculum: async ({ page }, use) => {
    await use(new CurriculumDetailPage(page));
  },
  difficulty: async ({ page }, use) => {
    await use(new DifficultyDetailPage(page));
  },
});

export { expect } from '@playwright/test';
