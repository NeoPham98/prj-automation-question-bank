import path from 'path';
import { fileURLToPath } from 'url';
import { Page, expect } from '@playwright/test';
import { QuestionFormPage, QuizTypeCode, QUIZ_TYPE_LABELS } from '../QuestionFormPage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Per-type strategy for smoke verification.
// Full save flow implemented for ALL 8 types. Sticker requires sample image fixture.
// MC has 3 sub-variants (single / multi / statement) → 3 test cases.
//
// Sources:
//   src/components/QuizStudio/quiz-form/types/multiple-quiz.tsx — Choices subtype switch
//   src/components/QuizStudio/quiz-form/types/essay-quiz.tsx + DialogAiJudge — popup rubric
//   src/components/QuizStudio/quiz-form/types/matching-quiz.tsx — 3 pairs
//   src/components/QuizStudio/quiz-form/types/fill-drag-drop-quiz/ — TipTap "__" blank
//   src/components/QuizStudio/quiz-form/types/group-quiz/index.tsx — parent + subs
//   src/components/QuizStudio/quiz-form/types/image-label-quiz/ — sticker
//   src/components/Studio/editor-node/input-fill-drag-drop-node/index.tsx:6 — /__$/
//   src/components/QuizStudio/quiz-form/quiz-service/index.tsx:32-148 — validation

export type MCVariant = 'single' | 'multi' | 'statement';

// Derive hint text from question name. Used by performSave + editAnswer.
// Spec verifies modal contains this text after redirect.
export function hintForName(name: string): string {
  return `Hint for ${name}`;
}

export interface QuizTestCase {
  readonly code: QuizTypeCode;
  readonly variant?: MCVariant;
  readonly id: string;
  readonly label: string;
}

export interface QuizUiExpectations {
  readonly stem: string;
  readonly answer?: string;
  readonly variant?: MCVariant;
}

export interface QuestionTypeStrategy {
  readonly code: QuizTypeCode;
  expectFormLoaded(page: Page): Promise<void>;
  expectCreateUi(form: QuestionFormPage, page: Page, tc: QuizTestCase): Promise<void>;
  expectReopenUi(
    form: QuestionFormPage,
    page: Page,
    expected: QuizUiExpectations,
    tc: QuizTestCase,
  ): Promise<void>;
  readonly canSmokeSave: boolean;
  performSave(form: QuestionFormPage, name: string, tc: QuizTestCase): Promise<void>;
  // Per-type answer edit. Called after clickEditQuestion + setName(newStem).
  // Implementation differs per type (MC rows, blanks, rubric dialog, sticker labels...).
  editAnswer(form: QuestionFormPage, newText: string, tc: QuizTestCase): Promise<void>;
}

async function expectSharedFormVisible(page: Page): Promise<void> {
  await expect(page.locator('.ProseMirror[contenteditable="true"]').first()).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator('#framework')).toBeVisible();
}

// Sample image fixture for sticker upload. Spec must ensure file exists.
export const SAMPLE_STICKER_IMAGE_PATH = path.join(
  __dirname,
  '..',
  '..',
  'data',
  'sample-sticker.png',
);

class MultipleChoiceStrategy implements QuestionTypeStrategy {
  readonly code = 'multiple_choice' as const;
  readonly canSmokeSave = true;
  async expectFormLoaded(page: Page): Promise<void> {
    await expectSharedFormVisible(page);
  }
  async expectCreateUi(form: QuestionFormPage, _page: Page, tc: QuizTestCase): Promise<void> {
    if (tc.variant === 'statement') {
      await form.expectStatementCellCount(4);
    } else if (tc.variant === 'multi') {
      await form.expectAnswerCount(3);
      await form.expectAnswerAt(0, ' - A');
      await form.expectAnswerAt(1, ' - B');
      await form.expectAnswerAt(2, ' - C');
    } else {
      await form.expectAnswerCount(2);
      await form.expectAnswerAt(0, ' - A');
      await form.expectAnswerAt(1, ' - B');
    }
  }
  async expectReopenUi(
    form: QuestionFormPage,
    _page: Page,
    expected: QuizUiExpectations,
    tc: QuizTestCase,
  ): Promise<void> {
    await form.expectStemContains(expected.stem);
    if (tc.variant === 'statement') {
      await form.expectStatementCellCount(4);
      await form.expectStatementAnyChecked();
      return;
    }
    if (tc.variant === 'multi') {
      await form.expectAnswerCount(3);
      await expect(form.answerEditorAt(1)).toContainText(' - B', { timeout: 10_000 });
      await expect(form.answerEditorAt(2)).toContainText(' - C', { timeout: 10_000 });
    } else {
      await form.expectAnswerCount(2);
      await expect(form.answerEditorAt(1)).toContainText(' - B', { timeout: 10_000 });
    }
    if (expected.answer) {
      await form.expectAnswerAt(0, expected.answer);
    }
  }
  async performSave(form: QuestionFormPage, name: string, tc: QuizTestCase): Promise<void> {
    await form.saveMultipleChoiceQuestion(name, tc.variant ?? 'single', { hint: hintForName(name) });
  }
  // single/multi: edit row-0 text. statement: flip 2nd preview cell.
  async editAnswer(form: QuestionFormPage, newText: string, tc: QuizTestCase): Promise<void> {
    if (tc.variant === 'statement') {
      await form.toggleStatementAlternateCorrect();
    } else {
      await form.fillAnswerAt(0, newText);
    }
    await form.editHint(hintForName(newText));
  }
}

class GroupStrategy implements QuestionTypeStrategy {
  readonly code = 'group' as const;
  readonly canSmokeSave = true;
  async expectFormLoaded(page: Page): Promise<void> {
    await expectSharedFormVisible(page);
  }
  async expectCreateUi(form: QuestionFormPage): Promise<void> {
    await form.expectGroupEditLoaded(2);
    await form.expectGroupSubAnswerAt(0, 'A');
  }
  async expectReopenUi(
    form: QuestionFormPage,
    _page: Page,
    expected: QuizUiExpectations,
  ): Promise<void> {
    await form.expectStemContains(expected.stem);
    await form.expectGroupSubCount(2);
    if (expected.answer) {
      await form.expectGroupSubAnswerAt(0, expected.answer);
    }
  }
  async performSave(form: QuestionFormPage, name: string): Promise<void> {
    await form.saveGroupQuestion(name, 2, { hint: hintForName(name) });
  }
  async editAnswer(form: QuestionFormPage, newText: string): Promise<void> {
    await form.editGroupFirstSubAnswer(newText);
    await form.editHint(hintForName(newText));
  }
}

class FillBlankStrategy implements QuestionTypeStrategy {
  readonly code = 'fill_in_the_blank' as const;
  readonly canSmokeSave = true;
  async expectFormLoaded(page: Page): Promise<void> {
    await expectSharedFormVisible(page);
  }
  async expectCreateUi(form: QuestionFormPage): Promise<void> {
    await form.expectBlankCount(2);
    await form.expectBlankAt(0, 'a1');
    await form.expectBlankAt(1, 'a2');
  }
  async expectReopenUi(
    form: QuestionFormPage,
    _page: Page,
    expected: QuizUiExpectations,
  ): Promise<void> {
    await form.expectStemContains(expected.stem);
    await form.expectBlankCount(2);
    await form.expectBlankAt(0, 'b1');
    await form.expectBlankAt(1, 'b2');
  }
  async performSave(form: QuestionFormPage, name: string): Promise<void> {
    await form.saveFillBlankQuestion(name, { hint: hintForName(name) });
  }
  async editAnswer(form: QuestionFormPage, newText: string): Promise<void> {
    await form.fillBlankAt(0, 'b1', { typeDelay: 30 });
    await form.fillBlankAt(1, 'b2', { typeDelay: 30 });
    await form.editHint(hintForName(newText));
  }
}

class EssayStrategy implements QuestionTypeStrategy {
  readonly code = 'essay' as const;
  readonly canSmokeSave = true;
  async expectFormLoaded(page: Page): Promise<void> {
    await expectSharedFormVisible(page);
  }
  async expectCreateUi(form: QuestionFormPage): Promise<void> {
    await form.expectImageVisible();
    await form.expectRubricSummaryContains('rubric reference');
  }
  async expectReopenUi(
    form: QuestionFormPage,
    _page: Page,
    expected: QuizUiExpectations,
  ): Promise<void> {
    await form.expectStemContains(expected.stem);
    await form.expectImageVisible();
    if (expected.answer) {
      await form.expectRubricSummaryContains(expected.answer);
    }
  }
  async performSave(form: QuestionFormPage, name: string): Promise<void> {
    await form.saveEssayQuestion(name, { hint: hintForName(name) });
  }
  async editAnswer(form: QuestionFormPage, newText: string): Promise<void> {
    await form.editEssayRubric(newText);
    await form.editHint(hintForName(newText));
  }
}

class MatchingStrategy implements QuestionTypeStrategy {
  readonly code = 'matching' as const;
  readonly canSmokeSave = true;
  async expectFormLoaded(page: Page): Promise<void> {
    await expectSharedFormVisible(page);
  }
  async expectCreateUi(form: QuestionFormPage): Promise<void> {
    await form.expectImageVisible();
    await form.expectAnswerCount(6);
    await form.expectAnswerAt(0, ' - P1L');
    await form.expectAnswerAt(1, ' - P1R');
  }
  async expectReopenUi(
    form: QuestionFormPage,
    _page: Page,
    expected: QuizUiExpectations,
  ): Promise<void> {
    await form.expectStemContains(expected.stem);
    await form.expectImageVisible();
    await form.expectAnswerCount(6);
    if (expected.answer) {
      await form.expectAnswerAt(0, expected.answer);
    }
    await form.expectAnswerAt(1, `${expected.stem} - P1R`);
    await form.expectAnswerAt(2, `${expected.stem} - P2L`);
    await form.expectAnswerAt(3, `${expected.stem} - P2R`);
    await form.expectAnswerAt(4, `${expected.stem} - P3L`);
    await form.expectAnswerAt(5, `${expected.stem} - P3R`);
  }
  async performSave(form: QuestionFormPage, name: string): Promise<void> {
    await form.saveMatchingQuestion(name, { hint: hintForName(name) });
  }
  async editAnswer(form: QuestionFormPage, newText: string): Promise<void> {
    await form.fillAnswerAt(0, newText);
    await form.editHint(hintForName(newText));
  }
}

class DropBoxStrategy implements QuestionTypeStrategy {
  readonly code = 'drop_box' as const;
  readonly canSmokeSave = true;
  async expectFormLoaded(page: Page): Promise<void> {
    await expectSharedFormVisible(page);
  }
  async expectCreateUi(form: QuestionFormPage): Promise<void> {
    await form.expectBlankCount(1);
    await form.expectBlankAt(0, '-correct');
    await form.expectAnswerCount(2);
    await form.expectAnswerAt(0, 'opt1');
    await form.expectAnswerAt(1, 'opt2');
  }
  async expectReopenUi(
    form: QuestionFormPage,
    _page: Page,
    expected: QuizUiExpectations,
  ): Promise<void> {
    const optPrefix = (expected.answer ?? '').replace(/_ANS$/, '');
    await form.expectStemContains(expected.stem);
    await form.expectBlankCount(1);
    if (expected.answer) {
      await form.expectBlankAt(0, expected.answer);
      await form.expectAnswerCount(2);
      await form.expectAnswerAt(0, `${optPrefix} opt1`);
      await form.expectAnswerAt(1, `${optPrefix} opt2`);
    }
  }
  async performSave(form: QuestionFormPage, name: string): Promise<void> {
    await form.saveDropBoxQuestion(name, { hint: hintForName(name) });
  }
  async editAnswer(form: QuestionFormPage, newText: string): Promise<void> {
    // drop_box edit: update blank(correct) + 2 extra choices.
    const optPrefix = newText.replace(/_ANS$/, '');
    await form.editDropBoxBlankAnswer(newText);
    await form.editDropBoxChoices(optPrefix);
    await form.editHint(hintForName(newText));
  }
}

class DragDropStrategy implements QuestionTypeStrategy {
  readonly code = 'drag_and_drop' as const;
  readonly canSmokeSave = true;
  async expectFormLoaded(page: Page): Promise<void> {
    await expectSharedFormVisible(page);
  }
  async expectCreateUi(form: QuestionFormPage): Promise<void> {
    await form.expectBlankCount(2);
    await form.expectBlankAt(0, '-a1');
    await form.expectBlankAt(1, '-a2');
    await form.expectWrongAnswerCount(2);
    await form.expectWrongAnswers(['-w1', '-w2']);
  }
  async expectReopenUi(
    form: QuestionFormPage,
    _page: Page,
    expected: QuizUiExpectations,
  ): Promise<void> {
    await form.expectStemContains(expected.stem);
    await form.expectBlankCount(2);
    await form.expectBlankAt(0, 'b1');
    await form.expectBlankAt(1, 'b2');
    await form.expectWrongAnswerCount(2);
    await form.expectWrongAnswers(['w1', 'w2']);
  }
  async performSave(form: QuestionFormPage, name: string): Promise<void> {
    await form.saveDragDropQuestion(name, { hint: hintForName(name) });
  }
  async editAnswer(form: QuestionFormPage, newText: string): Promise<void> {
    await form.fillBlankAt(0, 'b1', { typeDelay: 30 });
    await form.fillBlankAt(1, 'b2', { typeDelay: 30 });
    await form.editWrongAnswerAt(0, 'w1');
    await form.editWrongAnswerAt(1, 'w2');
    await form.editHint(hintForName(newText));
  }
}

class StickerStrategy implements QuestionTypeStrategy {
  readonly code = 'sticker' as const;
  readonly canSmokeSave = true;
  async expectFormLoaded(page: Page): Promise<void> {
    await expectSharedFormVisible(page);
  }
  async expectCreateUi(form: QuestionFormPage): Promise<void> {
    await form.expectStickerLabelVisible('-L1');
    await form.expectStickerLabelVisible('-L2');
    await form.expectStickerLabelVisible('-W1');
  }
  async expectReopenUi(
    form: QuestionFormPage,
    _page: Page,
    expected: QuizUiExpectations,
  ): Promise<void> {
    await form.expectStemContains(expected.stem);
    if (expected.answer) {
      await form.expectStickerLabelVisible(`${expected.answer}-C1`);
      await form.expectStickerLabelVisible(`${expected.answer}-C2`);
      await form.expectStickerLabelVisible(`${expected.answer}-W1`);
    }
  }
  async performSave(form: QuestionFormPage, name: string): Promise<void> {
    await form.saveStickerQuestion(name, SAMPLE_STICKER_IMAGE_PATH, { hint: hintForName(name) });
  }
  async editAnswer(form: QuestionFormPage, newText: string): Promise<void> {
    await form.editStickerLabels(newText);
    await form.editHint(hintForName(newText));
  }
}

export const QUESTION_TYPE_STRATEGIES: Record<QuizTypeCode, QuestionTypeStrategy> = {
  multiple_choice: new MultipleChoiceStrategy(),
  group: new GroupStrategy(),
  fill_in_the_blank: new FillBlankStrategy(),
  essay: new EssayStrategy(),
  matching: new MatchingStrategy(),
  drop_box: new DropBoxStrategy(),
  drag_and_drop: new DragDropStrategy(),
  sticker: new StickerStrategy(),
};

export const ALL_QUIZ_TYPE_CODES: QuizTypeCode[] = Object.keys(
  QUIZ_TYPE_LABELS,
) as QuizTypeCode[];

// 10 test cases: 3 MC variants + 7 other types. Drives spec iteration.
// User requirement: "trắc nghiệm 1 đáp án, nhiều đáp án và trắc nghiệm đúng sai".
export const ALL_QUIZ_TEST_CASES: QuizTestCase[] = [
  {
    code: 'multiple_choice',
    variant: 'single',
    id: 'mc_single',
    label: `${QUIZ_TYPE_LABELS.multiple_choice} - 1 đáp án`,
  },
  {
    code: 'multiple_choice',
    variant: 'multi',
    id: 'mc_multi',
    label: `${QUIZ_TYPE_LABELS.multiple_choice} - nhiều đáp án`,
  },
  {
    code: 'multiple_choice',
    variant: 'statement',
    id: 'mc_statement',
    label: `${QUIZ_TYPE_LABELS.multiple_choice} - đúng sai`,
  },
  { code: 'group', id: 'group', label: QUIZ_TYPE_LABELS.group },
  {
    code: 'fill_in_the_blank',
    id: 'fill_in_the_blank',
    label: QUIZ_TYPE_LABELS.fill_in_the_blank,
  },
  { code: 'essay', id: 'essay', label: QUIZ_TYPE_LABELS.essay },
  { code: 'matching', id: 'matching', label: QUIZ_TYPE_LABELS.matching },
  { code: 'drop_box', id: 'drop_box', label: QUIZ_TYPE_LABELS.drop_box },
  { code: 'drag_and_drop', id: 'drag_and_drop', label: QUIZ_TYPE_LABELS.drag_and_drop },
  { code: 'sticker', id: 'sticker', label: QUIZ_TYPE_LABELS.sticker },
];
