import { test, expect } from '../../fixtures/qb.fixture';
import {
  QUESTION_TYPE_STRATEGIES,
  ALL_QUIZ_TEST_CASES,
} from '../../pages/question-forms/QuestionTypeStrategies';
import { SAMPLE_BANK_NAME_PREFIX } from '../../data/sample-questions';

// xlsx III.5 (R137): Tạo câu hỏi thủ công per quiz type.
// 10 cases = 3 MC variants (single / multi / statement) + 7 other types.
// Per-test bank isolates state — prior shared-bank pattern leaked deletes
// between iterations (toast "Xóa ngân hàng thành công" mid-spec).

test.describe('Question create manual per type (III.5)', () => {
  test.describe.configure({ mode: 'serial' });

  let bankName = '';

  test.beforeAll(async ({ banksList, bankForm }) => {
    bankName = `${SAMPLE_BANK_NAME_PREFIX}_SHARED_${Date.now()}`;
    await banksList.goto();
    await banksList.openCreateDialog();
    await bankForm.createBank(bankName, `bank shared for create-manual`);
    await expect(banksList.cardByName(bankName)).toBeVisible({
      timeout: 15_000,
    });
  });

  test.afterAll(async ({ banksList }) => {
    if (!bankName) return;
    await banksList.goto();
    await banksList.openDeleteDialog(bankName);
    await banksList.confirmDelete();
  });

  for (const tc of ALL_QUIZ_TEST_CASES) {
    test(`type=${tc.id} (${tc.label}) → form scaffold loads (III.5)`, async ({
      banksList,
      bankDetail,
      questionForm,
      page,
    }) => {
      await banksList.openCardByName(bankName);
      await bankDetail.switchToLibrary();

      const canCreate = await bankDetail.hasCreatePermission();
      test.skip(
        !canCreate,
        `Test account lacks canInsertInThisBank on ${bankName}`,
      );

      await bankDetail.openCreateManual();
      await questionForm.nameEditor.waitFor({
        state: 'visible',
        timeout: 20_000,
      });

      // multiple_choice mounts by default on entry — no switch needed.
      // group: SelectItem hidden when current === group + special draft path
      //   (QuizNavbar.tsx:1081-1083, hasGroupedDraft). Bypass via direct URL.
      // Other 6: dropdown selectType works reliably.
      if (tc.code === 'group') {
        const bankId = questionForm.bankIdFromUrl();
        if (!bankId) throw new Error('bankId not in URL after openCreateManual');
        await questionForm.gotoQuizFormWithCode(bankId, tc.code);
      } else if (tc.code !== 'multiple_choice') {
        await questionForm.selectType(tc.code);
      }

      const strategy = QUESTION_TYPE_STRATEGIES[tc.code];
      await strategy.expectFormLoaded(page);

      if (strategy.canSmokeSave) {
        const qname = `Q_${tc.id}_${Date.now()}`;
        await strategy.performSave(questionForm, qname, tc);
      }
    });
  }
});
