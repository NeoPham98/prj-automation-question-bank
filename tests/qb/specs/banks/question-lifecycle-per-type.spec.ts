import { test, expect } from '../../fixtures/qb.fixture';
import {
  QUESTION_TYPE_STRATEGIES,
  ALL_QUIZ_TEST_CASES,
  hintForName,
} from '../../pages/question-forms/QuestionTypeStrategies';
import { SAMPLE_BANK_NAME_PREFIX } from '../../data/sample-questions';
import { QUIZ_TYPE_LABELS } from '../../pages/QuestionFormPage';
import { BanksListPage } from '../../pages/BanksListPage';
import { BankFormDialog } from '../../pages/BankFormDialog';
import { deleteBank } from '../../data/setup-helpers';

// xlsx III.5 (R137) + III.9 (R205) + III.8 (R194) — full lifecycle per quiz type.
// Pipeline per type:
//   1. Seed (create) — copy of question-edit-per-type Seed phase (canonical reference).
//   2. Edit — copy of question-edit-per-type Edit phase.
//   3. fill_in_the_blank / drag_and_drop — re-open verify (copy).
//   4. Approve — promote draft → pending → Duyệt → assert visible in Công khai.
// Shared bank seeded in beforeAll (admin moderator) + afterAll deletes (cascades questions).
// Skip case if account lacks canInsertInThisBank or canModerateThisBank.

test.describe('Question lifecycle per type (III.5 + III.9 + III.8)', () => {
  test.describe.configure({ mode: 'default', retries: 0 });

  let bankName = '';

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: '.auth/admin.json' });
    const page = await ctx.newPage();
    const banksList = new BanksListPage(page);
    const bankForm = new BankFormDialog(page);
    bankName = `${SAMPLE_BANK_NAME_PREFIX}_LIFECYCLE_${Date.now()}`;
    await banksList.goto();
    await banksList.openCreateDialog();
    await bankForm.createBank(bankName, 'bank shared for lifecycle-per-type');
    await expect(banksList.cardByName(bankName)).toBeVisible({ timeout: 15_000 });
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!bankName) return;
    const ctx = await browser.newContext({ storageState: '.auth/admin.json' });
    const page = await ctx.newPage();
    try {
      const banksList = new BanksListPage(page);
      await deleteBank(banksList, bankName);
    } catch {
      // best-effort cleanup
    } finally {
      await ctx.close();
    }
  });

  for (const tc of ALL_QUIZ_TEST_CASES) {
    test(`type=${tc.id} (${tc.label}) → create + edit + approve → Công khai`, async ({
      banksList,
      bankDetail,
      questionForm,
      approval,
      page,
    }) => {
      // Lifecycle longer than edit-only: bumped timeouts per type.
      if (tc.code === 'group') test.setTimeout(180_000);
      if (tc.code === 'fill_in_the_blank') test.setTimeout(120_000);
      if (tc.code === 'drag_and_drop' || tc.code === 'drop_box') test.setTimeout(150_000);

      await banksList.goto();
      await banksList.openCardByName(bankName);
      await bankDetail.switchToLibrary();

      const canCreate = await bankDetail.hasCreatePermission();
      test.skip(!canCreate, `Test account lacks canInsertInThisBank on ${bankName}`);
      const canModerate = await bankDetail.hasModeratePermission();
      test.skip(!canModerate, `Account lacks canModerateThisBank — lifecycle needs approve.`);

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

      // Verify hint persisted after seed save (auto-redirected to library).
      await bankDetail.switchToLibrary();
      await bankDetail.openHintModalOnCard(seedName);
      await bankDetail.expectHintModalContains(hintForName(seedName));
      await bankDetail.closeHintModal();

      // Delay để UI store/route settle xong rồi mới click Edit.
      await page.waitForTimeout(1000);

      // ─── Edit phase ───
      await bankDetail.clickEditQuestion(seedName);

      if (tc.code === 'group') {
        await questionForm.expectGroupEditLoaded(2);
        await page.waitForTimeout(1500);
        await questionForm.debugDumpGroupSubAnswers('after-hydrate');
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
        await questionForm.editHint(hintForName(newAnswer));
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

      if (tc.code === 'group') {
        await questionForm.debugDumpGroupSubAnswers('pre-save');
      }

      await questionForm.save();
      await questionForm.expectEditSuccess();

      // Verify new hint after edit save (auto-redirected to library).
      await bankDetail.switchToLibrary();
      await bankDetail.openHintModalOnCard(newStem);
      await bankDetail.expectHintModalContains(hintForName(newAnswer));
      await bankDetail.closeHintModal();

      if (
        tc.code === 'fill_in_the_blank' ||
        tc.code === 'drag_and_drop'
      ) {
        await page.waitForTimeout(1000);
        await bankDetail.switchToLibrary();
        await bankDetail.clickEditQuestion(newStem);
        await questionForm.nameEditor.waitFor({ state: 'visible', timeout: 20_000 });
        await expect(questionForm.nameEditor).toContainText(newStem, { timeout: 10_000 });

        await expect(questionForm.blankEditors()).toHaveCount(2, { timeout: 10_000 });
        await expect(questionForm.blankEditors().nth(0)).toContainText('b1', { timeout: 10_000 });
        await expect(questionForm.blankEditors().nth(1)).toContainText('b2', { timeout: 10_000 });

        if (tc.code === 'drag_and_drop') {
          await expect(questionForm.wrongAnswerInputs()).toHaveCount(2, { timeout: 10_000 });
          // Backend wrong-answer order non-deterministic on reload; assert order-agnostic.
          await expect.poll(
            async () => questionForm.wrongAnswerInputs().evaluateAll(
              (els) => (els as HTMLInputElement[]).map((e) => e.value).sort(),
            ),
            { timeout: 10_000 },
          ).toEqual(['w1', 'w2']);
        }

        // fill/drag re-verify ended up on quiz-form route. Bounce back to bank library.
        await banksList.goto();
        await banksList.openCardByName(bankName);
      }

      // ─── Approve phase ───
      await bankDetail.switchToLibrary();
      await bankDetail.setLibraryStatusFilter('draft');
      await bankDetail.clickSendForReview(newStem);

      await bankDetail.switchToPendingTab();
      await approval.switchToPendingSub();
      const card = bankDetail.questionItemByName(newStem);
      await expect(card).toBeVisible({ timeout: 15_000 });
      await approval.approveRow(card);

      await bankDetail.switchToPublic();
      await expect(
        bankDetail.questionItemByName(newStem),
      ).toBeVisible({ timeout: 15_000 });
    });
  }
});
