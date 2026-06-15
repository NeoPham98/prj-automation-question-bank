import { test, expect } from '../../fixtures/qb.fixture';
import {
  QUESTION_TYPE_STRATEGIES,
  ALL_QUIZ_TEST_CASES,
} from '../../pages/question-forms/QuestionTypeStrategies';
import { SAMPLE_BANK_NAME_PREFIX } from '../../data/sample-questions';

// xlsx III.9 (R205) — edit per quiz type.
// 10 cases = 3 MC variants + 7 other types.
// Flow per case:
//   1. Seed: create bank → openCreateManual → (selectType / gotoQuizFormWithCode) → strategy.performSave(qname)
//   2. Edit: clickEditQuestion(qname) → setName(newStem) → strategy.editAnswer(newAnswer) → save → expectEditSuccess
//   3. Cleanup: deleteBank via list page (best-effort)
// Per-test bank isolates state; cleanup is in finally to survive seed/edit failures.

test.describe('Question edit per type (III.9)', () => {
  for (const tc of ALL_QUIZ_TEST_CASES) {
    test(`type=${tc.id} (${tc.label}) → edit stem + answer (III.9)`, async ({
      banksList,
      bankDetail,
      bankForm,
      questionForm,
      page,
    }) => {
      const bankName = `${SAMPLE_BANK_NAME_PREFIX}_EDIT_${tc.id}_${Date.now()}`;
      await banksList.goto();
      await banksList.openCreateDialog();
      await bankForm.createBank(bankName, `bank edit ${tc.id}`);
      await expect(banksList.cardByName(bankName)).toBeVisible({
        timeout: 15_000,
      });

      try {
        await banksList.openCardByName(bankName);
        await bankDetail.switchToLibrary();

        const canCreate = await bankDetail.hasCreatePermission();
        test.skip(
          !canCreate,
          `Test account lacks canInsertInThisBank on ${bankName}`,
        );

        // ─── Seed phase: create one question of this type ───
        await bankDetail.openCreateManual();
        await questionForm.nameEditor.waitFor({
          state: 'visible',
          timeout: 20_000,
        });

        // Same type-switch logic as question-create-manual spec:
        //   group bypasses dropdown (SelectItem hidden), MC is default, others use selectType.
        if (tc.code === 'group') {
          const bankId = questionForm.bankIdFromUrl();
          if (!bankId) throw new Error('bankId not in URL after openCreateManual');
          await questionForm.gotoQuizFormWithCode(bankId, tc.code);
        } else if (tc.code !== 'multiple_choice') {
          await questionForm.selectType(tc.code);
        }

        const strategy = QUESTION_TYPE_STRATEGIES[tc.code];
        await strategy.expectFormLoaded(page);

        const qname = `Q_EDIT_${tc.id}_${Date.now()}`;
        await strategy.performSave(questionForm, qname, tc);

        // ─── Edit phase: open card → change stem → change answer → save ───
        await bankDetail.clickEditQuestion(qname);
        await questionForm.nameEditor.waitFor({
          state: 'visible',
          timeout: 20_000,
        });
        await expect(questionForm.saveButton).toBeVisible({ timeout: 10_000 });

        const newStem = `${qname}_CÂU_HỎI_MỚI`;
        const newAnswer = `${qname}_ĐÁP_ÁN_SỬA`;
        await questionForm.setName(newStem);
        await strategy.editAnswer(questionForm, newAnswer, tc);
        await questionForm.save();
        await questionForm.expectEditSuccess();
      } finally {
        try {
          await banksList.goto();
          await banksList.openDeleteDialog(bankName);
          await banksList.confirmDelete();
        } catch {
          // Best-effort cleanup; manual delete by TEST_BANK_* prefix if needed.
        }
      }
    });
  }
});
