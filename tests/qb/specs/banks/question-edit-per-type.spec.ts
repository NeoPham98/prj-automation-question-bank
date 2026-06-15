import { test, expect } from '../../fixtures/qb.fixture';
import {
  QUESTION_TYPE_STRATEGIES,
  ALL_QUIZ_TEST_CASES,
} from '../../pages/question-forms/QuestionTypeStrategies';
import { SAMPLE_BANK_NAME_PREFIX } from '../../data/sample-questions';
import { QUIZ_TYPE_LABELS } from '../../pages/QuestionFormPage';

// xlsx III.9 (R205): Tạo 1 câu hỏi + edit câu hỏi theo từng quiz type.
// Shared bank; within spec iterate types.

test.describe('Question edit per type (III.9)', () => {
  test.describe.configure({ mode: 'serial', retries: 0 });

  // giao tiếp UI chậm ở type=group; retry làm trông như “loop chạy lại từ đầu”.
  // Debug ổn định thì tắt retry cho spec này.

  let bankName = '';

  for (const tc of ALL_QUIZ_TEST_CASES) {
    test(`type=${tc.id} (${tc.label}) → edit stem + answer (III.9)`, async ({
      banksList,
      bankDetail,
      bankForm,
      questionForm,
      page,
    }) => {
      if (tc.code === 'group') {
        test.setTimeout(60_000);
      }
      if (tc.code === 'fill_in_the_blank') {
        test.setTimeout(45_000);
      }
      if (tc.code === 'drag_and_drop' || tc.code === 'drop_box') {
        test.setTimeout(60_000);
      }
      if (!bankName) {
        bankName = `${SAMPLE_BANK_NAME_PREFIX}_SHARED_${Date.now()}`;
        await banksList.goto();
        await banksList.openCreateDialog();
        await bankForm.createBank(bankName, 'bank shared for edit-per-type');
        await expect(banksList.cardByName(bankName)).toBeVisible({
          timeout: 15_000,
        });
      }

      await banksList.goto();
      await banksList.openCardByName(bankName);
      await bankDetail.switchToLibrary();

      const canCreate = await bankDetail.hasCreatePermission();
      test.skip(!canCreate, `Test account lacks canInsertInThisBank on ${bankName}`);

      // ─── Seed phase ───
      await bankDetail.openCreateManual();
      await questionForm.nameEditor.waitFor({
        state: 'visible',
        timeout: 20_000,
      });

      if (tc.code === 'group') {
        const bankId = questionForm.bankIdFromUrl();
        if (!bankId) throw new Error('bankId not in URL after openCreateManual');
        await questionForm.gotoQuizFormWithCode(bankId, tc.code);
      } else if (tc.code !== 'multiple_choice') {
        await questionForm.selectType(tc.code);
      }

      const strategy = QUESTION_TYPE_STRATEGIES[tc.code];
      await strategy.expectFormLoaded(page);

      const seedName = `Q_CREATE_${tc.id}_${Date.now()}`;
      const bankId = questionForm.bankIdFromUrl();
      if (!bankId && tc.code !== 'group') {
        throw new Error('bankId not found');
      }
      await strategy.performSave(questionForm, seedName, tc);

      // Delay để UI store/route settle xong rồi mới click Edit.
      await page.waitForTimeout(1000);

      // ─── Edit phase ───
      await bankDetail.clickEditQuestion(seedName);

      if (tc.code === 'group') {
        await questionForm.expectGroupEditLoaded(2);
      } else {
        await expect(questionForm.typeSelectTrigger).toContainText(QUIZ_TYPE_LABELS[tc.code], {
          timeout: 20_000,
        });
        await expect(questionForm.saveButton).toBeVisible({ timeout: 20_000 });
      }

      await questionForm.nameEditor.waitFor({
        state: 'visible',
        timeout: 20_000,
      });

      const newStem = `Q_EDIT_${tc.id}_${Date.now()}`;
      const newAnswer = `${seedName}_ANS`;

      if (tc.code === 'drop_box') {
        await questionForm.rebuildDropBoxLikeCreateWithChoices(newStem, newAnswer);
      } else {
        await (tc.code === 'fill_in_the_blank' || tc.code === 'drag_and_drop'
          ? questionForm.rebuildFillBlankStemLikeCreate(newStem, 2, {
              clearFromEnd: true,
              deleteDelay: 25,
              typeDelay: tc.code === 'drag_and_drop' ? 15 : 60,
              blankPrefixDelay: tc.code === 'drag_and_drop' ? 20 : 40,
              betweenBlanksMs: 250,
            })
          : questionForm.setName(newStem));
        await strategy.editAnswer(questionForm, newAnswer, tc);
      }

      if (tc.code === 'drop_box') {
        await expect(questionForm.nameEditor).toContainText(newStem, { timeout: 20_000 });
      }

      if (tc.code === 'drop_box') {
        await expect(questionForm.blankEditors()).toHaveCount(1, { timeout: 10_000 });
        await expect(questionForm.blankEditors().nth(0)).toContainText(newAnswer, { timeout: 10_000 });
      }

      await questionForm.save();
      await questionForm.expectEditSuccess();

      if (
        tc.code === 'fill_in_the_blank' ||
        tc.code === 'drag_and_drop'
      ) {
        await page.waitForTimeout(1000);
        await bankDetail.switchToLibrary();
        await bankDetail.clickEditQuestion(newStem);
        await questionForm.nameEditor.waitFor({ state: 'visible', timeout: 20_000 });
        await expect(questionForm.nameEditor).toContainText(newStem, { timeout: 10_000 });

        if (tc.code === 'drop_box') {
          await expect(questionForm.blankEditors()).toHaveCount(1, { timeout: 10_000 });
          await expect(questionForm.blankEditors().nth(0)).toContainText(newAnswer, {
            timeout: 10_000,
          });
        } else {
          await expect(questionForm.blankEditors()).toHaveCount(2, { timeout: 10_000 });
          await expect(questionForm.blankEditors().nth(0)).toContainText('b1', { timeout: 10_000 });
          await expect(questionForm.blankEditors().nth(1)).toContainText('b2', { timeout: 10_000 });
        }

        if (tc.code === 'drag_and_drop') {
          await expect(questionForm.wrongAnswerInputs()).toHaveCount(2, { timeout: 10_000 });
          await expect(questionForm.wrongAnswerInputs().nth(0)).toHaveValue('w1', { timeout: 10_000 });
          await expect(questionForm.wrongAnswerInputs().nth(1)).toHaveValue('w2', { timeout: 10_000 });
        }
      }
    });
  }
});
