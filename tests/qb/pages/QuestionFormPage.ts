import { Page, Locator, expect } from '@playwright/test';

// Shared question form scaffolding. URL: /question-bank/create/manual?bankId=<id>
// then switches to /question-bank/quiz-form?code=<type>&bankId=<id>&quizId=<id> after first save.
// Sources:
//   src/components/pages/question-bank/create-quiz/CreateManual.tsx — wrapper for QuizDetailMain
//   src/components/QuizStudio/quiz-form/index.tsx — orchestrator reads ?code,bankId,quizId
//   src/components/Studio/tools/top-action-quiz/index.tsx:547-558 — QuizStudioEditor name editor placeholder "Nhập câu hỏi vào đây"
//   src/components/layout/QuizNavbar.tsx:1052-1095 — type Select (#framework)
//   src/components/layout/QuizNavbar.tsx:1096-1118 — difficulty Select (#difficulty)
//   src/components/layout/QuizNavbar.tsx:1144-1161 — program button "Gán khung cho câu hỏi" / "Khung: <name>"
//   src/components/layout/QuizNavbar.tsx:1188-1196 — save Button "Lưu"
//   src/components/layout/QuizNavbar.tsx:712-758 — handleAddQuiz: toast "Thêm câu hỏi thành công" + redirect /banks/<id>?tab=library&status=draft
//   src/components/QuizStudio/quiz-form/components/ProgramFrameworkSidebar.tsx — sidebar header "Thuộc tính câu hỏi"
//   src/components/QuizStudio/quiz-form/components/ProgramFrameworkTree.tsx — tree nodes (input[type=checkbox] + span text)

export type QuizTypeCode =
  | 'multiple_choice'
  | 'group'
  | 'fill_in_the_blank'
  | 'essay'
  | 'matching'
  | 'drop_box'
  | 'drag_and_drop'
  | 'sticker';

// Labels per LIST_QUIZ_CODE_CONFIG in src/mock-data/quiz-studio/quiz-types.tsx
export const QUIZ_TYPE_LABELS: Record<QuizTypeCode, string> = {
  multiple_choice: 'Trắc nghiệm',
  group: 'Câu hỏi nhóm',
  fill_in_the_blank: 'Điền vào chỗ trống',
  essay: 'Tự luận',
  matching: 'Ghép đôi',
  drop_box: 'Hộp thả',
  drag_and_drop: 'Kéo thả',
  sticker: 'Dán nhãn',
};

export class QuestionFormPage {
  readonly nameEditor: Locator;
  readonly typeSelectTrigger: Locator;
  readonly difficultySelectTrigger: Locator;
  readonly programButton: Locator;
  readonly programSidebarHeader: Locator;
  readonly programTreeRows: Locator;
  readonly programSidebarClose: Locator;
  readonly saveButton: Locator;
  readonly previewButton: Locator;
  readonly toast: Locator;
  readonly toastSuccess: Locator;
  readonly toastWarning: Locator;

  constructor(private readonly page: Page) {
    // TipTap ProseMirror editor — placeholder via data-placeholder attr on .ProseMirror node.
    // First .ProseMirror = top-action-quiz name editor (question stem).
    this.nameEditor = page.locator('.ProseMirror[contenteditable="true"]').first();

    // Radix Select triggers with stable ids.
    this.typeSelectTrigger = page.locator('#framework');
    this.difficultySelectTrigger = page.locator('#difficulty');

    // Program button label switches based on state.
    this.programButton = page.getByRole('button', { name: /Gán khung cho câu hỏi|Khung:/ });
    // Sidebar header anchor.
    this.programSidebarHeader = page.getByRole('heading', { name: 'Thuộc tính câu hỏi' });
    this.programSidebarClose = page.getByRole('button', { name: 'Đóng', exact: true });
    // Tree rows: each leaf row contains checkbox + span.
    this.programTreeRows = page.locator('div.rounded-md:has(> div > div > input[type="checkbox"])');

    this.saveButton = page.getByRole('button', { name: 'Lưu', exact: true });
    this.previewButton = page.getByRole('button', { name: 'Xem trước' });

    // sonner toast.
    this.toast = page.locator('[data-sonner-toast]').first();
    this.toastSuccess = page.locator('[data-sonner-toast][data-type="success"]').first();
    this.toastWarning = page.locator('[data-sonner-toast][data-type="warning"]').first();
  }

  async gotoCreateManual(bankId: string): Promise<void> {
    await this.page.goto(`/question-bank/create/manual?bankId=${bankId}`);
    await this.nameEditor.waitFor({ state: 'visible', timeout: 20_000 });
    await this.saveButton.waitFor({ state: 'visible', timeout: 10_000 });
  }

  // Direct nav with ?code= seeds objQuizFormStudio.code via handleInitQuiz
  // (quiz-form/index.tsx:240-308). Bypasses #framework dropdown when needed —
  // e.g. group SelectItem disabled+hidden when current codeURL matches it.
  async gotoQuizFormWithCode(bankId: string, code: QuizTypeCode): Promise<void> {
    await this.page.goto(
      `/question-bank/quiz-form?code=${code}&bankId=${bankId}`,
    );
    await this.nameEditor.waitFor({ state: 'visible', timeout: 20_000 });
  }

  bankIdFromUrl(): string | null {
    const url = new URL(this.page.url());
    return url.searchParams.get('bankId');
  }

  async selectType(code: QuizTypeCode): Promise<void> {
    // Type Select disabled once created_by set (after first save). Radix uses
    // data-disabled attr (not HTML disabled), so check both.
    const dataDisabled = await this.typeSelectTrigger.getAttribute('data-disabled');
    const htmlDisabled = await this.typeSelectTrigger.getAttribute('disabled');
    if (dataDisabled !== null || htmlDisabled !== null) return;

    await this.typeSelectTrigger.click();
    const label = QUIZ_TYPE_LABELS[code];

    // Wait until any option is rendered (Radix portal mount).
    await this.page.locator('[role="option"]').first().waitFor({
      state: 'visible',
      timeout: 10_000,
    });

    // SelectItem text = icon span (no text) + name. getByRole accessible name
    // matches the option's visible text. exact:true avoids "Kéo thả" matching
    // inside "Kéo thả nâng cao" if labels ever drift.
    const option = this.page.getByRole('option', { name: label, exact: true });
    await option.waitFor({ state: 'visible', timeout: 10_000 });
    await option.scrollIntoViewIfNeeded();
    await option.click();

    // Allow Zustand store sync + Select close animation.
    await this.page.waitForTimeout(600);

    // Verify trigger label changed (best-effort; some types share icons).
    await expect(this.typeSelectTrigger).toContainText(label, { timeout: 5_000 });
  }

  async setName(text: string): Promise<void> {
    // TipTap: use pressSequentially + blur so onUpdate fires reliably.
    // fill() on contenteditable can skip the editor's transaction hook.
    await this.nameEditor.click();
    await this.nameEditor.press('Control+a');
    await this.nameEditor.press('Delete');
    await this.nameEditor.pressSequentially(text, { delay: 15 });
    await this.nameEditor.blur();
    // Debounce auto-save in MultipleQuiz uses ~500ms — let store sync.
    await this.page.waitForTimeout(700);
  }

  async selectFirstDifficulty(): Promise<void> {
    await this.difficultySelectTrigger.click();
    // First SelectItem = first level (e.g. Bloom: Nhận biết).
    const firstOption = this.page.locator('[role="option"]').first();
    await firstOption.waitFor({ state: 'visible', timeout: 5_000 });
    await firstOption.click();
    await this.page.waitForTimeout(300);
  }

  async selectFirstProgramLeaf(): Promise<void> {
    await this.programButton.click();
    await this.programSidebarHeader.waitFor({ state: 'visible', timeout: 5_000 });
    // First root row click = selects level-1 attribute. Sufficient for required gate.
    const firstRow = this.programTreeRows.first();
    await firstRow.waitFor({ state: 'visible', timeout: 10_000 });
    await firstRow.click();
    // Close sidebar to avoid covering save button on narrow viewports.
    await this.programSidebarClose.click().catch(() => {});
    await this.page.waitForTimeout(300);
  }

  async fillSharedFields(name: string): Promise<void> {
    await this.setName(name);
    await this.selectFirstDifficulty();
    await this.selectFirstProgramLeaf();
  }

  // Attach image to question stem via CreateImageLessonModal "Dán link" tab.
  // Source: src/components/Modals/create-lessson-modal/image.tsx tab=3.
  // checkLinkImage (line 80) only requires url.includes('http'); onSubmit passes
  // through http string as media file. Safe for smoke — backend stores URL string.
  // Trigger: ImageIcon button in buttons-action-top.tsx:76-83 ("Ảnh" tooltip).
  async attachImageToStem(): Promise<void> {
    const imageBtn = this.page.locator('button:has(svg.lucide-image)').first();
    if (!(await imageBtn.isVisible().catch(() => false))) return;
    await imageBtn.click();
    const dialog = this.page.locator('[role="dialog"]:has-text("Thêm hình ảnh")').first();
    await dialog.waitFor({ state: 'visible', timeout: 5_000 });
    // Switch to "Dán link" tab (value=3).
    await dialog.getByRole('tab', { name: /Dán link/ }).click();
    const linkInput = dialog.locator('input[placeholder="Dán đường dẫn link ảnh ở đây"]');
    await linkInput.waitFor({ state: 'visible', timeout: 3_000 });
    await linkInput.fill('https://placehold.co/600x400.png');
    await this.page.waitForTimeout(400);
    await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    await this.page.waitForTimeout(500);
  }

  // multiple_choice answer rows: AnswerEditorChild root = div.rounded-lg.bg-white.p-3
  // containing a [role="checkbox"] for is_correct toggle.
  // Source: src/components/Studio/tools/answer-editor-child.tsx:183-260
  answerRows() {
    return this.page.locator(
      'div.rounded-lg.bg-white.p-3:has([role="checkbox"])',
    );
  }

  async fillAnswerAt(index: number, text: string): Promise<void> {
    // Each row has 1 .ProseMirror[contenteditable] inside QuizStudioEditor.
    // TipTap onUpdate fires only on actual key/blur events. Playwright fill()
    // on contenteditable inserts text but may skip the editor's update hook,
    // so use pressSequentially + explicit blur to force commit.
    const row = this.answerRows().nth(index);
    await row.waitFor({ state: 'visible', timeout: 5_000 });
    const editor = row.locator('.ProseMirror[contenteditable="true"]').first();
    await editor.click();
    await editor.press('Control+a');
    await editor.press('Delete');
    await editor.pressSequentially(text, { delay: 15 });
    await editor.blur();
    // TipTap debounced onUpdate → Zustand sync (~500ms per MultipleQuiz).
    await this.page.waitForTimeout(700);
  }

  async markAnswerCorrectAt(index: number): Promise<void> {
    // Default subtype = single_choice (Choices.tsx:145) → checkbox click fires
    // handleCheckCorrectChange(id, 1) at answer-editor-child.tsx:241-243.
    const row = this.answerRows().nth(index);
    const checkbox = row.locator('[role="checkbox"]').first();
    await checkbox.click();
    // Wait for aria-checked or data-state to flip to confirm toggle landed.
    await expect(checkbox).toHaveAttribute('data-state', /checked|true/, {
      timeout: 5_000,
    }).catch(async () => {
      // Some Radix versions use aria-checked instead.
      await expect(checkbox).toHaveAttribute('aria-checked', 'true', {
        timeout: 3_000,
      });
    });
    await this.page.waitForTimeout(400);
  }

  async save(): Promise<void> {
    // Extra settle before clicking Lưu — pending debounced TipTap or Select
    // updates can race the save handler and trigger "chưa nhập đáp án" warning.
    await this.page.waitForTimeout(600);
    await this.saveButton.click();
  }

  async expectSaveSuccess(): Promise<void> {
    // Race success vs error/warning toast — fail-fast on validation reject.
    const success = this.page
      .getByText('Thêm câu hỏi thành công', { exact: false })
      .waitFor({ state: 'visible', timeout: 20_000 });
    const errorToast = this.page
      .locator(
        '[data-sonner-toast][data-type="error"], [data-sonner-toast][data-type="warning"]',
      )
      .first();
    const failure = errorToast
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(async () => {
        const text = await errorToast.textContent();
        throw new Error(`Save failed — toast: ${(text || '').trim() || '<empty>'}`);
      });
    await Promise.race([success, failure]);
    await this.page.waitForURL(/\/banks\/[^/]+\?tab=library/, { timeout: 20_000 });
  }

  async expectEditSuccess(): Promise<void> {
    // Edit toast "Sửa câu hỏi thành công" (QuizNavbar.tsx:668) + same handleAfterSave redirect.
    await expect(
      this.page.getByText('Sửa câu hỏi thành công', { exact: false }),
    ).toBeVisible({ timeout: 20_000 });
    await this.page.waitForURL(/\/banks\/[^/]+\?tab=library/, { timeout: 20_000 });
  }

  // Click the subtype pill button (arrayMultipleChoiceUI) by accessible name.
  // Source: src/components/QuizStudio/quiz-form/types/multiple-quiz.tsx + Choices subtype row.
  private async selectMCSubtype(label: string): Promise<void> {
    const btn = this.page.getByRole('button', { name: label, exact: true });
    await btn.first().scrollIntoViewIfNeeded();
    await btn.first().click();
    await this.page.waitForTimeout(400);
  }

  // Toggle statement-mode (Tự do | Nhận định) on StatementTemplateControls.
  // Buttons have aria-pressed attribute. Source: Studio/tools/choices/StatementTemplateControls.tsx.
  private async toggleStatementMode(): Promise<void> {
    const btn = this.page.locator('button[aria-pressed]').filter({ hasText: 'Nhận định' }).first();
    await btn.waitFor({ state: 'visible', timeout: 5_000 });
    await btn.click();
    await this.page.waitForTimeout(500);
  }

  // Full save flow for multiple_choice smoke. Variants:
  //   - single: default mode, 2 rows, 1 correct.
  //   - multi: subtype "Trắc nghiệm nhiều đáp án", 3 rows, 2 correct.
  //   - statement: toggle "Nhận định", first correct cell on StatementTemplatePreviewGrid.
  async saveMultipleChoiceQuestion(
    name: string,
    variant: 'single' | 'multi' | 'statement' = 'single',
  ): Promise<void> {
    await this.setName(name);
    await this.selectFirstDifficulty();
    await this.selectFirstProgramLeaf();
    await this.attachImageToStem().catch(() => {});

    if (variant === 'statement') {
      await this.toggleStatementMode();
      // StatementTemplatePreviewGrid renders preview cells; mark first correct cell.
      // Each cell exposes Checkbox aria-label "Chọn đáp án đúng: <content>".
      const correctCell = this.page
        .locator('[role="checkbox"][aria-label^="Chọn đáp án đúng:"]')
        .first();
      await correctCell.waitFor({ state: 'visible', timeout: 10_000 });
      await correctCell.click();
      await this.page.waitForTimeout(500);
    } else if (variant === 'multi') {
      await this.selectMCSubtype('Trắc nghiệm nhiều đáp án');
      await this.fillAnswerAt(0, `${name} - A`);
      await this.fillAnswerAt(1, `${name} - B`);
      // Add 3rd row if not present, fill, mark 2 correct.
      const total = await this.answerRows().count();
      if (total < 3) {
        const addBtn = this.page.getByRole('button', { name: /Thêm đáp án|Thêm lựa chọn/ }).first();
        if (await addBtn.isVisible().catch(() => false)) {
          await addBtn.click();
          await expect
            .poll(async () => await this.answerRows().count(), { timeout: 5_000 })
            .toBeGreaterThanOrEqual(3);
          await this.fillAnswerAt(2, `${name} - C`);
        }
      } else {
        await this.fillAnswerAt(2, `${name} - C`);
      }
      await this.markAnswerCorrectAt(0);
      await this.markAnswerCorrectAt(1);
    } else {
      // single
      await this.fillAnswerAt(0, `${name} - A`);
      await this.fillAnswerAt(1, `${name} - B`);
      await this.markAnswerCorrectAt(0);
    }

    await this.save();
    await this.expectSaveSuccess();
  }

  // Essay save: id=3 setting card "Thêm đáp án cho câu hỏi" opens DialogAiJudge
  // (src/components/Studio/modal/dialog-ai-judge.tsx:55-116). Validation:
  // quiz-service/index.tsx:43-49 requires answers[0].content (= quizzSettingState.content).
  async saveEssayQuestion(name: string): Promise<void> {
    await this.setName(name);
    await this.selectFirstDifficulty();
    await this.selectFirstProgramLeaf();

    // Open id=3 popup: card containing title "Thêm đáp án cho câu hỏi".
    // Button text is "Thiết lập" when content empty (essay-quiz.tsx:227).
    const rubricCard = this.page.locator('div.rounded-xl:has(p:has-text("Thêm đáp án cho câu hỏi"))');
    await rubricCard.waitFor({ state: 'visible', timeout: 10_000 });
    await rubricCard.getByRole('button', { name: /Thiết lập|Chỉnh sửa/ }).click();

    // Dialog mounts LatexEditor (TipTap) + placeholder "Nhập văn bản ở đây".
    // Locate the popup ProseMirror; sonner toast portal lives elsewhere so first()
    // after the open click is safe.
    const dialog = this.page.locator('[role="dialog"]').first();
    await dialog.waitFor({ state: 'visible', timeout: 5_000 });
    const popupEditor = dialog.locator('.ProseMirror[contenteditable="true"]').first();
    await popupEditor.waitFor({ state: 'visible', timeout: 5_000 });
    await popupEditor.click();
    await popupEditor.press('Control+a');
    await popupEditor.press('Delete');
    await popupEditor.pressSequentially(`${name} - rubric reference`, { delay: 15 });
    await popupEditor.blur();
    await this.page.waitForTimeout(400);

    // Dialog save → toasts.success "Thêm thành công" + handleClose (dialog-ai-judge.tsx:40-41).
    await dialog.getByRole('button', { name: 'Lưu thông tin', exact: true }).click();
    await expect(
      this.page.getByText('Thêm thành công', { exact: false }),
    ).toBeVisible({ timeout: 10_000 });
    await dialog.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    await this.page.waitForTimeout(700);

    await this.save();
    await this.expectSaveSuccess();
  }

  // Matching save: 3 default rows × 2 sides = 6 AnswerEditorChild instances.
  // Each row root = div.rounded-lg.bg-white.p-3 with [role="checkbox"] inside
  // (parent div hidden via codeType===matching, but checkbox still rendered).
  // Validation: quiz-service/index.tsx:130-146 requires all non-deleted items
  // to have non-empty content (hasHotspotContent).
  async saveMatchingQuestion(name: string): Promise<void> {
    await this.setName(name);
    await this.selectFirstDifficulty();
    await this.selectFirstProgramLeaf();

    const total = await this.answerRows().count();
    if (total < 6) {
      throw new Error(`Expected ≥6 matching cells, got ${total}`);
    }
    // Fill all 6 (3 pairs × left/right) so no item fails validation.
    for (let i = 0; i < 6; i++) {
      const pairIndex = Math.floor(i / 2);
      const side = i % 2 === 0 ? 'L' : 'R';
      await this.fillAnswerAt(i, `${name} - P${pairIndex + 1}${side}`);
    }

    await this.save();
    await this.expectSaveSuccess();
  }

  // Type name then append N blanks (space + "__") so TipTap InputRule
  // (input-fill-drag-drop-node/index.tsx:6, regex /__$/) converts each trailing "__"
  // into a fill-drag-drop blank node. QuizStudioEditor.onUpdate (quiz-studio-editor.tsx:69-82,
  // 254-291) auto-applies description=`edit - ${codeQuiz}` → isEdit=true → InputEdit visible.
  private async setNameWithBlanks(name: string, count: number = 1): Promise<void> {
    await this.nameEditor.click();
    await this.nameEditor.press('Control+a');
    await this.nameEditor.press('Delete');
    await this.nameEditor.pressSequentially(name, { delay: 15 });
    for (let i = 0; i < count; i++) {
      await this.nameEditor.pressSequentially(' ', { delay: 15 });
      // Type "__" as separate sequence so InputRule fires at end of buffer.
      await this.nameEditor.pressSequentially('__', { delay: 30 });
      // Wait for new blank to mount before typing next.
      await this.page.waitForTimeout(400);
    }
    await this.nameEditor.blur();
    // Debounce 500ms in QuizStudioEditor + Zustand sync.
    await this.page.waitForTimeout(800);
  }

  // Inline blank editor inside stem (input-fill-drag-drop-node/component.tsx:260-277).
  // Active when description starts with "edit -".
  blankEditors(): Locator {
    return this.page.locator('.isEdit .ProseMirror[contenteditable="true"]');
  }

  async fillBlankAt(index: number, text: string): Promise<void> {
    const editor = this.blankEditors().nth(index);
    await editor.waitFor({ state: 'visible', timeout: 8_000 });
    await editor.click();
    await editor.press('Control+a');
    await editor.press('Delete');
    await editor.pressSequentially(text, { delay: 15 });
    await editor.blur();
    await this.page.waitForTimeout(400);
  }

  // DragFalseAnswers section (drag-false-answers.tsx:68-109). Container has
  // "câu trả lời sai" + "Thêm" button + NodeInputAutoSpan rows with native <input>.
  dragFalseSection(): Locator {
    return this.page
      .locator('div.text-sm.bg-white.p-4.rounded-xl')
      .filter({ hasText: 'câu trả lời sai' })
      .first();
  }

  async addWrongAnswer(text: string): Promise<void> {
    const section = this.dragFalseSection();
    await section.scrollIntoViewIfNeeded();
    const addBtn = section.getByRole('button', { name: 'Thêm', exact: true });
    const rows = section.locator('input.min-w-20.w-20');
    const before = await rows.count();
    await addBtn.click();
    await expect
      .poll(async () => await rows.count(), { timeout: 5_000 })
      .toBeGreaterThanOrEqual(before + 1);
    const newInput = rows.nth(before);
    await newInput.click();
    await newInput.fill(text);
    await newInput.blur();
    await this.page.waitForTimeout(400);
  }

  // Fill-in-the-blank save. 2 blanks + fill correct answer into each.
  // No DragFalseAnswers for fill type (fill-drag-drop-quiz/index.tsx:471-472).
  async saveFillBlankQuestion(name: string): Promise<void> {
    await this.setNameWithBlanks(name, 2);
    await this.selectFirstDifficulty();
    await this.selectFirstProgramLeaf();
    await this.attachImageToStem().catch(() => {});
    await this.fillBlankAt(0, `${name}-a1`);
    await this.fillBlankAt(1, `${name}-a2`);
    await this.save();
    await this.expectSaveSuccess();
  }

  // Drag-and-drop save. 2 blanks + fill correct answer + 2 wrong answers via
  // DragFalseAnswers (fill-drag-drop-quiz/index.tsx:474-479).
  async saveDragDropQuestion(name: string): Promise<void> {
    await this.setNameWithBlanks(name, 2);
    await this.selectFirstDifficulty();
    await this.selectFirstProgramLeaf();
    await this.attachImageToStem().catch(() => {});
    await this.fillBlankAt(0, `${name}-a1`);
    await this.fillBlankAt(1, `${name}-a2`);
    await this.addWrongAnswer(`${name}-w1`);
    await this.addWrongAnswer(`${name}-w2`);
    await this.save();
    await this.expectSaveSuccess();
  }

  // Drop-box save. Extra validation (quiz-service:81-112):
  //   - ≥3 non-deleted children per non-deleted hotspot
  //   - all children content non-empty
  // Default seed: 1 correct child per blank (TopActionQuiz.createDropBoxCorrectChild,
  // editable=true via createDropBoxContentNode description='edit - drop_box').
  // Added children via "Thêm lựa chọn" are editable.
  //
  // BUG WORKAROUND: normalizeDropBoxChildrenData (fill-drag-drop-quiz/index.tsx:68-102
  // and QuizNavbar.tsx:98-131) keys children by `${content}::${isCorrect}`. Two empty
  // is_correct=false adjacent children collide → 2nd marked is_deleted=true. Fix:
  // fill content into each new editable child BEFORE clicking "Thêm lựa chọn" again,
  // so each child has a unique normalized key.
  async saveDropBoxQuestion(name: string): Promise<void> {
    await this.setNameWithBlanks(name, 1);
    await this.selectFirstDifficulty();
    await this.selectFirstProgramLeaf();
    await this.attachImageToStem().catch(() => {});
    // Fill the blank's correct-answer inline editor (createDropBoxContentNode).
    await this.fillBlankAt(0, `${name}-correct`);

    const blankSection = this.page
      .locator('div.rounded-lg')
      .filter({ hasText: /chỗ trống\s*\d+/ })
      .first();
    await blankSection.waitFor({ state: 'visible', timeout: 10_000 });

    const addChoice = blankSection.getByRole('button', { name: 'Thêm lựa chọn' });
    await addChoice.scrollIntoViewIfNeeded();

    // Editable children = added via "Thêm lựa chọn". Seed correct child has
    // editable=false so does NOT count. Need 2 editable children total.
    const editableChildEditors = blankSection.locator(
      '.ProseMirror[contenteditable="true"]',
    );

    // Fill content into the editor at given index. Unique text per index avoids
    // normalize-dup-key collision.
    const fillEditableAt = async (index: number): Promise<void> => {
      const editor = editableChildEditors.nth(index);
      await editor.waitFor({ state: 'visible', timeout: 5_000 });
      await editor.click();
      await editor.press('Control+a');
      await editor.press('Delete');
      await editor.pressSequentially(`${name} opt${index + 1}`, { delay: 15 });
      await editor.blur();
      await this.page.waitForTimeout(400);
    };

    // Click "Thêm" then wait for editable count to grow. Fill new child IMMEDIATELY
    // with unique content before next click.
    for (let target = 1; target <= 2; target++) {
      const beforeCount = await editableChildEditors.count();
      await addChoice.click({ force: true });
      await expect
        .poll(async () => await editableChildEditors.count(), { timeout: 8_000 })
        .toBeGreaterThanOrEqual(beforeCount + 1);
      await fillEditableAt(beforeCount);
    }

    await this.save();
    await this.expectSaveSuccess();
  }

  // Group save (QuizNavbar.tsx:888-927). Validation:
  //   - parentQuizData.name not empty
  //   - subQuestions.length ≥ 1
  //   - each sub passes handleCheckQuiz for its type (incl. sub.name non-empty)
  // New group quiz starts with 0 subs (group-quiz/index.tsx:646 setSubQuestions from
  // server data only). Click "Thêm câu hỏi" (line 770) → handleAddSubQuestion seeds
  // default MC sub (line 666) with 2 empty hotspots + own name editor.
  // Sub card = div.rounded-xl.bg-white.border.border-gray-200.shadow-sm (line 814).
  async saveGroupQuestion(name: string, subCount: number = 4): Promise<void> {
    await this.setName(name);
    await this.selectFirstDifficulty();
    await this.selectFirstProgramLeaf();
    await this.attachImageToStem().catch(() => {});

    const subCards = this.page.locator(
      'div.rounded-xl.bg-white.border.border-gray-200.shadow-sm',
    );
    const addSub = this.page.getByRole('button', { name: 'Thêm câu hỏi', exact: true });

    for (let i = 0; i < subCount; i++) {
      await addSub.scrollIntoViewIfNeeded();
      await addSub.click();
      await expect
        .poll(async () => await subCards.count(), { timeout: 10_000 })
        .toBeGreaterThanOrEqual(i + 1);
      await this.page.waitForTimeout(500);
    }

    for (let i = 0; i < subCount; i++) {
      const card = subCards.nth(i);
      await card.scrollIntoViewIfNeeded();

      const subStem = card.locator('.ProseMirror[contenteditable="true"]').first();
      await subStem.waitFor({ state: 'visible', timeout: 8_000 });
      await subStem.click();
      await subStem.press('Control+a');
      await subStem.press('Delete');
      await subStem.pressSequentially(`${name} sub ${i + 1}`, { delay: 15 });
      await subStem.blur();
      await this.page.waitForTimeout(500);

      const subRows = card.locator(
        'div.rounded-lg.bg-white.p-3:has([role="checkbox"])',
      );
      const rowCount = await subRows.count();
      if (rowCount < 2) {
        throw new Error(`Sub ${i + 1}: expected ≥2 MC answer rows, got ${rowCount}`);
      }

      for (const [idx, letter] of [[0, 'A'], [1, 'B']] as const) {
        const row = subRows.nth(idx);
        const editor = row.locator('.ProseMirror[contenteditable="true"]').first();
        await editor.click();
        await editor.press('Control+a');
        await editor.press('Delete');
        await editor.pressSequentially(`${name} s${i + 1} ${letter}`, { delay: 15 });
        await editor.blur();
        await this.page.waitForTimeout(400);
      }

      const correctBox = subRows.nth(0).locator('[role="checkbox"]').first();
      await correctBox.click();
      await this.page.waitForTimeout(400);
    }

    await this.save();
    await this.expectSaveSuccess();
  }

  // Sticker save (image-label-quiz/index.tsx:385-443). Validation:
  //   - name non-empty
  //   - imageUrl present (S3 URL after upload) — uploads via MaterialFileUploadModal
  //     (react-dropzone hidden input) when imageUrl falsy.
  //   - questions_hotspots.data with ≥1 is_correct=true (createdLabels) + ≥1 false (wrongLabels)
  //
  // Correct label flow (CurrentLabel.tsx + ImageLabeling.tsx):
  //   1. Click #image-labeling → handleClickContainer sets currentLabel + activeLabelId='current'
  //   2. CurrentLabel renders <Input placeholder="Thêm nhãn"> bound to currentLabel.value
  //   3. Type into Input → onChange updates store
  //   4. Press Enter → handleCreateLabel pushes into createdLabels + clears currentLabel
  //
  // Wrong label flow (WrongLabels.tsx → AddWrongLabel.tsx):
  //   1. Click "Thêm" Button (Plus icon + span "Thêm") → setIsInput(true)
  //   2. Same <Input placeholder="Thêm nhãn"> appears
  //   3. Type → Enter → handleCreateWrongLabel pushes into wrongLabels
  //
  // Wrong section header h6 text: "Nhãn dán không chính xác".
  async saveStickerQuestion(name: string, imagePath: string): Promise<void> {
    await this.setName(name);
    await this.selectFirstDifficulty();
    await this.selectFirstProgramLeaf();

    // Upload image via dropzone hidden input.
    const fileInput = this.page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 10_000 });
    await fileInput.setInputFiles(imagePath);

    // After upload, MaterialFileUploadModal unmounts → ImageLabeling renders.
    const labelArea = this.page.locator('#image-labeling');
    await labelArea.waitFor({ state: 'visible', timeout: 30_000 });
    await this.page.waitForTimeout(1_000);

    const box = await labelArea.boundingBox();
    if (!box) throw new Error('image-labeling has no bounding box');

    // Place 2 correct labels: click point → fill appeared Input → Enter.
    const correctLabels = [`${name}-L1`, `${name}-L2`];
    const points = [
      { x: box.x + box.width * 0.3, y: box.y + box.height * 0.3 },
      { x: box.x + box.width * 0.7, y: box.y + box.height * 0.65 },
    ];
    for (let i = 0; i < correctLabels.length; i++) {
      await this.page.mouse.click(points[i].x, points[i].y);
      // CurrentLabel mounts; its Input is unique because activeLabelId='current'.
      const input = this.page.locator('input[placeholder="Thêm nhãn"]').first();
      await input.waitFor({ state: 'visible', timeout: 5_000 });
      await input.click();
      await input.fill(correctLabels[i]);
      await input.press('Enter');
      // Wait for store commit + currentLabel clear so next click creates new.
      await this.page.waitForTimeout(600);
    }

    // Wrong labels: click "Thêm" inside WrongLabels section, type, Enter.
    // Section anchored by h6 "Nhãn dán không chính xác".
    const wrongHeader = this.page.getByRole('heading', {
      name: /Nhãn dán không chính xác/,
    });
    await wrongHeader.scrollIntoViewIfNeeded();

    const wrongLabels = [`${name}-W1`, `${name}-W2`];
    for (const value of wrongLabels) {
      const addBtn = this.page
        .locator('button:has(span:has-text("Thêm"))')
        .filter({ hasNotText: 'câu hỏi' })
        .last();
      await addBtn.scrollIntoViewIfNeeded();
      await addBtn.click();
      const input = this.page.locator('input[placeholder="Thêm nhãn"]').first();
      await input.waitFor({ state: 'visible', timeout: 5_000 });
      await input.click();
      await input.fill(value);
      await input.press('Enter');
      await this.page.waitForTimeout(500);
    }

    await this.save();
    await this.expectSaveSuccess();
  }

  // ─── Per-type EDIT helpers (used by question-edit-per-type spec) ───

  // Statement-mode: toggle alternate correct cell. Seed creates first cell correct;
  // editing flips the 2nd cell (different aria-label content) so payload changes.
  async toggleStatementAlternateCorrect(): Promise<void> {
    const cells = this.page.locator('[role="checkbox"][aria-label^="Chọn đáp án đúng:"]');
    await cells.first().waitFor({ state: 'visible', timeout: 10_000 });
    const count = await cells.count();
    if (count < 2) {
      throw new Error(`Expected ≥2 statement cells, got ${count}`);
    }
    await cells.nth(1).click();
    await this.page.waitForTimeout(500);
  }

  // Group edit: replace first sub-card's first MC answer row text.
  // Sub card selector matches saveGroupQuestion's locator.
  async editGroupFirstSubAnswer(text: string): Promise<void> {
    const subCard = this.page
      .locator('div.rounded-xl.bg-white.border.border-gray-200.shadow-sm')
      .first();
    await subCard.waitFor({ state: 'visible', timeout: 10_000 });
    await subCard.scrollIntoViewIfNeeded();
    const firstRow = subCard
      .locator('div.rounded-lg.bg-white.p-3:has([role="checkbox"])')
      .first();
    await firstRow.waitFor({ state: 'visible', timeout: 8_000 });
    const editor = firstRow.locator('.ProseMirror[contenteditable="true"]').first();
    await editor.click();
    await editor.press('Control+a');
    await editor.press('Delete');
    await editor.pressSequentially(text, { delay: 15 });
    await editor.blur();
    await this.page.waitForTimeout(500);
  }

  // Essay edit: rubric card button = "Chỉnh sửa" when content present (essay-quiz.tsx:227).
  // Reopen DialogAiJudge, replace ProseMirror content, save dialog.
  async editEssayRubric(text: string): Promise<void> {
    const rubricCard = this.page.locator(
      'div.rounded-xl:has(p:has-text("Thêm đáp án cho câu hỏi"))',
    );
    await rubricCard.waitFor({ state: 'visible', timeout: 10_000 });
    await rubricCard.getByRole('button', { name: /Chỉnh sửa|Thiết lập/ }).click();

    const dialog = this.page.locator('[role="dialog"]').first();
    await dialog.waitFor({ state: 'visible', timeout: 5_000 });
    const popupEditor = dialog.locator('.ProseMirror[contenteditable="true"]').first();
    await popupEditor.waitFor({ state: 'visible', timeout: 5_000 });
    await popupEditor.click();
    await popupEditor.press('Control+a');
    await popupEditor.press('Delete');
    await popupEditor.pressSequentially(text, { delay: 15 });
    await popupEditor.blur();
    await this.page.waitForTimeout(400);

    await dialog.getByRole('button', { name: 'Lưu thông tin', exact: true }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    await this.page.waitForTimeout(700);
  }

  // Sticker edit: append one extra wrong label. Same flow as save loop body.
  async addStickerWrongLabel(text: string): Promise<void> {
    const wrongHeader = this.page.getByRole('heading', {
      name: /Nhãn dán không chính xác/,
    });
    await wrongHeader.scrollIntoViewIfNeeded();
    const addBtn = this.page
      .locator('button:has(span:has-text("Thêm"))')
      .filter({ hasNotText: 'câu hỏi' })
      .last();
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click();
    const input = this.page.locator('input[placeholder="Thêm nhãn"]').first();
    await input.waitFor({ state: 'visible', timeout: 5_000 });
    await input.click();
    await input.fill(text);
    await input.press('Enter');
    await this.page.waitForTimeout(500);
  }
}
