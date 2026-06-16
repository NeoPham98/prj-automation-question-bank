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
import { CurriculumListPage } from '../pages/CurriculumListPage';
import { CurriculumFormDialog } from '../pages/CurriculumFormDialog';
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
  curriculumList: CurriculumListPage;
  curriculumForm: CurriculumFormDialog;
  difficulty: DifficultyDetailPage;
  uiGate: undefined;
};

export const test = base.extend<QbFixtures>({
  uiGate: [
    async ({ page }, use) => {
      const errors: string[] = [];

      const onPageError = (err: Error) => {
        errors.push(`pageerror: ${err.message}`);
      };

      const onConsole = (msg: any) => {
        try {
          if (msg.type?.() === 'error') {
            errors.push(`console.error: ${msg.text()}`);
          }
        } catch {
          // ignore
        }
      };

      const onRequestFailed = (req: any) => {
        try {
          const errorText = req.failure()?.errorText || 'unknown';
          // Navigation/route changes abort in-flight requests (common on Next.js RSC).
          if (errorText.includes('net::ERR_ABORTED')) return;
          errors.push(`requestfailed: ${req.url()} (${errorText})`);
        } catch {
          errors.push('requestfailed: unknown');
        }
      };

      page.on('pageerror', onPageError);
      page.on('console', onConsole);
      page.on('requestfailed', onRequestFailed);

      await use(undefined);

      page.off('pageerror', onPageError);
      page.off('console', onConsole);
      page.off('requestfailed', onRequestFailed);

      if (errors.length) {
        throw new Error(errors.join('\n'));
      }
    },
    { auto: true },
  ],
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
  curriculumList: async ({ page }, use) => {
    await use(new CurriculumListPage(page));
  },
  curriculumForm: async ({ page }, use) => {
    await use(new CurriculumFormDialog(page));
  },
  difficulty: async ({ page }, use) => {
    await use(new DifficultyDetailPage(page));
  },
});

export { expect } from '@playwright/test';
