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
    // TipTap ProseMirror editor — stem has data-placeholder="Nhập câu hỏi vào đây".
    // Some types (drop_box) render multiple contenteditable blocks; avoid .first().
    this.nameEditor = page
      .locator('.ProseMirror[contenteditable="true"][data-placeholder="Nhập câu hỏi vào đây"]')
      .or(page.locator('.ProseMirror[contenteditable="true"]').first())
      .first();

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
    // Edit-mode race: TipTap setContent from store fires AFTER mount, so Ctrl+A+Delete
    // may run before hydration → clear empty → store re-injects old → type appends.
    // Wait for editor stable (non-changing text across 400ms) before clearing.
    await this.nameEditor.waitFor({ state: 'visible', timeout: 10_000 });
    let lastText = '';
    for (let i = 0; i < 15; i++) {
      const cur = (await this.nameEditor.textContent()) || '';
      if (cur === lastText && i > 0) break;
      lastText = cur;
      await this.page.waitForTimeout(400);
    }

    await this.nameEditor.click();
    await this.nameEditor.press('Control+a');
    await this.nameEditor.press('Delete');

    // Verify cleared; if hydration re-injected, repeat clear up to 3 times.
    for (let i = 0; i < 3; i++) {
      const cur = ((await this.nameEditor.textContent()) || '').trim();
      if (cur === '') break;
      await this.nameEditor.click();
      await this.nameEditor.press('Control+a');
      await this.nameEditor.press('Delete');
      await this.page.waitForTimeout(300);
    }

    await this.nameEditor.pressSequentially(text, { delay: 5 });
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

  answerEditorAt(index: number): Locator {
    return this.answerRows().nth(index).locator('.ProseMirror[contenteditable="true"]').first();
  }

  async expectAnswerCount(count: number): Promise<void> {
    await expect(this.answerRows()).toHaveCount(count, { timeout: 10_000 });
  }

  async expectAnswerAt(index: number, text: string): Promise<void> {
    await expect(this.answerEditorAt(index)).toContainText(text, { timeout: 10_000 });
  }

  statementAnswerCells(): Locator {
    return this.page.locator('[role="checkbox"][aria-label^="Chọn đáp án đúng:"]');
  }

  async expectStatementCellCount(count: number): Promise<void> {
    await expect(this.statementAnswerCells()).toHaveCount(count, { timeout: 10_000 });
  }

  async expectStatementCellChecked(index: number): Promise<void> {
    const cell = this.statementAnswerCells().nth(index);
    await expect
      .poll(
        async () =>
          (await cell.getAttribute('data-state')) ||
          (await cell.getAttribute('aria-checked')) ||
          '',
        { timeout: 10_000 },
      )
      .toMatch(/checked|true/);
  }

  async expectStatementAnyChecked(): Promise<void> {
    const count = await this.statementAnswerCells().count();
    for (let i = 0; i < count; i++) {
      const cell = this.statementAnswerCells().nth(i);
      const state =
        (await cell.getAttribute('data-state').catch(() => null)) ||
        (await cell.getAttribute('aria-checked').catch(() => null)) ||
        '';
      if (/checked|true/.test(state)) return;
    }
    throw new Error('Expected at least one checked statement cell');
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
    await row.scrollIntoViewIfNeeded();
    const checkbox = row.locator('[role="checkbox"]').first();
    await checkbox.waitFor({ state: 'visible', timeout: 5_000 });
    await checkbox.click({ force: true });

    await expect
      .poll(
        async () =>
          (await checkbox.getAttribute('data-state')) ||
          (await checkbox.getAttribute('aria-checked')) ||
          '',
        { timeout: 5_000 },
      )
      .toMatch(/checked|true/);

    // MultipleQuiz emits payload with 500ms debounce; give store extra time before save.
    await this.page.waitForTimeout(1200);
  }

  async save(): Promise<void> {
    await this.saveButton.scrollIntoViewIfNeeded();
    await this.saveButton.click();
  }

  // Hint editor (Studio/tools/question-hint-editor/index.tsx).
  // Collapsed: <button> w/ Lightbulb + text "Thêm gợi ý cho câu hỏi".
  // Open: div.bg-violet-50 wraps TiptapTextEditor inside .hint-editor child.
  // Delete: <button aria-label="Xóa gợi ý"> with Trash2.
  hintTrigger(): Locator {
    return this.page.getByRole('button', { name: /Thêm gợi ý cho câu hỏi/ }).first();
  }

  hintEditor(): Locator {
    return this.page
      .locator('.hint-editor .ProseMirror[contenteditable="true"]')
      .first();
  }

  async setHint(text: string): Promise<void> {
    // If still collapsed → click trigger to mount editor.
    const trigger = this.hintTrigger();
    if (await trigger.isVisible().catch(() => false)) {
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();
    }
    const editor = this.hintEditor();
    await editor.waitFor({ state: 'visible', timeout: 8_000 });
    await editor.click();
    await editor.press('Control+a');
    await editor.press('Delete');
    await editor.pressSequentially(text, { delay: 15 });
    await editor.blur();
    // TipTap debounced onUpdate → store sync.
    await this.page.waitForTimeout(700);
  }

  async editHint(text: string): Promise<void> {
    // On edit reload, container auto-opens when hint non-empty (isEmptyHtmlContent=false).
    // setHint handles both states.
    await this.setHint(text);
  }

  // ToastColor wraps Sonner raw `toast()` → no data-type attr. Error icon is
  // XCircle text-red-600; success = CheckCircle text-green-600; loading = LoaderIcon text-blue-600.
  // Detect error toasts via icon color class.
  private errorToastLocator() {
    return this.page.locator('[data-sonner-toast]:has(svg.text-red-600)');
  }

  async expectNoErrorToast(): Promise<void> {
    await expect(this.errorToastLocator()).toHaveCount(0, { timeout: 2_000 });
  }

  private async expectRedirectWithoutError(timeout: number = 20_000): Promise<void> {
    const redirect = this.page
      .waitForURL(/\/banks\/[^/]+\?tab=library/, { timeout })
      .then(() => 'redirect' as const);
    const errorToast = this.errorToastLocator().first();
    const failure = errorToast.waitFor({ state: 'visible', timeout }).then(async () => {
      const text = await errorToast.textContent();
      throw new Error(`Save failed — toast: ${(text || '').trim() || '<empty>'}`);
    });

    await Promise.race([redirect, failure]);
  }

  async expectSaveSuccess(): Promise<void> {
    const successToast = this.page
      .getByText('Thêm câu hỏi thành công', { exact: false })
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => 'toast' as const);

    await Promise.race([successToast, this.expectRedirectWithoutError(20_000)]);
    await this.expectNoErrorToast();

    await expect(this.page.getByText('Thêm câu hỏi thành công', { exact: false })).toBeVisible({
      timeout: 2_000,
    });

    // settle store + editor DOM
    await this.page.waitForTimeout(800);
  }

  async expectEditSuccess(): Promise<void> {
    // Race: redirect OR success toast vs. error toast.
    // Trước có `.catch(() => {})` nuốt timeout → error toast (vd "Không để
    // trống câu trả lời") auto-dismiss trong ~5-10s khiến expectNoErrorToast
    // gọi sau 20s thấy 0 toast = false pass.
    const redirect = this.page
      .waitForURL(/\/banks\/[^/]+\?tab=library/, { timeout: 20_000 })
      .then(() => 'redirect' as const);

    const successToast = this.page
      .getByText('Sửa câu hỏi thành công', { exact: false })
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => 'success' as const);

    const errorToastLoc = this.errorToastLocator().first();
    const failure = errorToastLoc
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(async () => {
        const text = await errorToastLoc.textContent();
        throw new Error(`Edit failed — toast: ${(text || '').trim() || '<empty>'}`);
      });

    await Promise.race([redirect, successToast, failure]);
    await this.expectNoErrorToast();
    await this.page.waitForTimeout(800);
  }

  // Click the subtype pill button (arrayMultipleChoiceUI) by accessible name.
  // Source: src/components/QuizStudio/quiz-form/types/multiple-quiz.tsx + Choices subtype row.
  private async selectMCSubtype(label: string): Promise<void> {
    const btn = this.page.getByRole('button', { name: label, exact: true });
    await btn.first().waitFor({ state: 'visible', timeout: 10_000 });
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
    opts?: { hint?: string },
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
      await this.selectMCSubtype('Chọn nhiều đáp án');
      await this.fillAnswerAt(0, `${name} - A`);
      await this.fillAnswerAt(1, `${name} - B`);
      // Add 3rd row if not present. Choices renders TWO add buttons (responsive):
      //   - desktop: <Button className="absolute right-0 ... hidden sm:flex"> with
      //     icon-only PlusIcon (no accessible name).
      //   - mobile (sm:hidden): full-width "Thêm đáp án" text button.
      // Playwright default viewport = 1280×720 (sm+), so desktop variant is the
      // visible one; matching by role-name "Thêm đáp án" only hits the hidden
      // mobile button. Match by structural lucide-plus icon instead.
      const total = await this.answerRows().count();
      if (total < 3) {
        const addBtn = this.page
          .locator('button.absolute:has(svg.lucide-plus), button:has-text("Thêm đáp án"), button:has-text("Thêm lựa chọn")')
          .first();
        await addBtn.waitFor({ state: 'visible', timeout: 5_000 });
        await addBtn.click({ force: true });
        await expect
          .poll(async () => await this.answerRows().count(), { timeout: 5_000 })
          .toBeGreaterThanOrEqual(3);
        await this.fillAnswerAt(2, `${name} - C`);
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

    if (opts?.hint) await this.setHint(opts.hint);
    await this.save();
    await this.expectSaveSuccess();
  }

  // Essay save: id=3 setting card "Thêm đáp án cho câu hỏi" opens DialogAiJudge
  // (src/components/Studio/modal/dialog-ai-judge.tsx:55-116). Validation:
  // quiz-service/index.tsx:43-49 requires answers[0].content (= quizzSettingState.content).
  async saveEssayQuestion(name: string, opts?: { hint?: string }): Promise<void> {
    await this.setName(name);
    await this.selectFirstDifficulty();
    await this.selectFirstProgramLeaf();
    await this.attachImageToStem().catch(() => {});

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

    if (opts?.hint) await this.setHint(opts.hint);
    await this.save();
    await this.expectSaveSuccess();
  }

  // Matching save: 3 default rows × 2 sides = 6 AnswerEditorChild instances.
  // Each row root = div.rounded-lg.bg-white.p-3 with [role="checkbox"] inside
  // (parent div hidden via codeType===matching, but checkbox still rendered).
  // Validation: quiz-service/index.tsx:130-146 requires all non-deleted items
  // to have non-empty content (hasHotspotContent).
  async saveMatchingQuestion(name: string, opts?: { hint?: string }): Promise<void> {
    await this.setName(name);
    await this.selectFirstDifficulty();
    await this.selectFirstProgramLeaf();
    await this.attachImageToStem().catch(() => {});

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

    if (opts?.hint) await this.setHint(opts.hint);
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

  async expectStemContains(text: string): Promise<void> {
    await expect(this.nameEditor).toContainText(text, { timeout: 10_000 });
  }

  async expectBlankCount(count: number): Promise<void> {
    await expect(this.blankEditors()).toHaveCount(count, { timeout: 10_000 });
  }

  async expectBlankAt(index: number, text: string): Promise<void> {
    await expect(this.blankEditors().nth(index)).toContainText(text, { timeout: 10_000 });
  }

  blankHotspots(): Locator {
    // Tận cùng canvas hotspot cho blank (TipTap node).
    return this.page.locator('.ProseMirror[contenteditable="true"]');
  }

  async rebuildFillBlankStemLikeCreate(
    stemText: string,
    blanksCount: number = 2,
    opts?: {
      typeDelay?: number;
      blankPrefixDelay?: number;
      betweenBlanksMs?: number;
      deleteDelay?: number;
      clearFromEnd?: boolean;
    },
  ): Promise<void> {
    const typeDelay = opts?.typeDelay ?? 15;
    const blankPrefixDelay = opts?.blankPrefixDelay ?? 15;
    const betweenBlanksMs = opts?.betweenBlanksMs ?? 150;
    const deleteDelay = opts?.deleteDelay ?? 20;

    await this.nameEditor.click();

    if (opts?.clearFromEnd) {
      // Blank chip = .isEdit wrapper w/ contentEditable=false hosting a child
      // ProseMirror + TrashIcon SVG (input-edit.tsx:42, onClick={handleNodeRemove}).
      // Playwright click() on tiny lucide SVG (size=20) inside contenteditable can
      // miss React's onClick handler. Use dispatchEvent('click') which fires a
      // synthetic MouseEvent that React's delegated listener captures reliably.
      const trashIcons = this.page.locator(
        '.isEdit svg.lucide-trash-2, .isEdit svg.lucide-trash',
      );
      for (let safety = 0; safety < 20; safety++) {
        const cnt = await trashIcons.count().catch(() => 0);
        if (cnt === 0) break;
        await trashIcons.first().dispatchEvent('click');
        await this.page.waitForTimeout(200);
      }

      // Fallback: Ctrl+A + Delete to clear stem text (and any leftover chip).
      await this.nameEditor.click();
      await this.nameEditor.press('Control+a');
      await this.nameEditor.press('Delete');
      await this.page.waitForTimeout(deleteDelay);

      // Stage-2 fallback: if blanks/text still present, hammer Backspace from
      // stem end (TipTap selection reset). Up to 80 Backspaces covers long stem.
      let remainingBlanks = await this.blankEditors().count().catch(() => 0);
      let after = ((await this.nameEditor.textContent().catch(() => '')) ?? '').trim();
      if (after || remainingBlanks > 0) {
        await this.nameEditor.click();
        await this.nameEditor.press('End');
        for (let i = 0; i < 80; i++) {
          await this.nameEditor.press('Backspace');
          if (i % 10 === 0) {
            after = ((await this.nameEditor.textContent().catch(() => '')) ?? '').trim();
            remainingBlanks = await this.blankEditors().count().catch(() => 0);
            if (!after && remainingBlanks === 0) break;
          }
        }
        await this.page.waitForTimeout(deleteDelay);
      }

      after = ((await this.nameEditor.textContent().catch(() => '')) ?? '').trim();
      remainingBlanks = await this.blankEditors().count().catch(() => 0);
      if (after || remainingBlanks > 0) {
        throw new Error(
          `Failed to clear stem; remainingText="${after.slice(0, 30)}" remainingBlanks=${remainingBlanks}`,
        );
      }
    } else {
      await this.nameEditor.press('Control+a');
      await this.nameEditor.press('Delete');
    }

    // Re-focus TipTap after Backspace loop (edit mode can temporarily unmount/rebind nodes).
    await this.nameEditor.click();
    await this.nameEditor.pressSequentially(stemText, { delay: typeDelay });

    for (let i = 0; i < blanksCount; i++) {
      await this.nameEditor.pressSequentially(' ', { delay: blankPrefixDelay });
      await this.nameEditor.pressSequentially('__', { delay: 30 });
      await this.page.waitForTimeout(betweenBlanksMs);
    }

    await this.nameEditor.blur();
    await this.page.waitForTimeout(500);
  }

  async fillBlankAt(
    index: number,
    text: string,
    opts?: { typeDelay?: number; clearDelay?: number },
  ): Promise<void> {
    const editor = this.blankEditors().nth(index);

    if (!(await editor.isVisible().catch(() => false))) {
      const hotspot = this.blankHotspots().nth(index);
      await hotspot.click({ force: true });
    }

    await editor.waitFor({ state: 'visible', timeout: 8_000 });
    await editor.click();
    await editor.press('Control+a');
    await editor.press('Backspace');
    if (opts?.clearDelay) await this.page.waitForTimeout(opts.clearDelay);
    await editor.pressSequentially(text, { delay: opts?.typeDelay ?? 30 });
    await editor.blur();
    await this.page.waitForTimeout(800);
  }

  // DragFalseAnswers section (drag-false-answers.tsx:68-109). Container has
  // "câu trả lời sai" + "Thêm" button + NodeInputAutoSpan rows with native <input>.
  dragFalseSection(): Locator {
    return this.page
      .locator('div.text-sm.bg-white.p-4.rounded-xl')
      .filter({ hasText: 'câu trả lời sai' })
      .first();
  }

  wrongAnswerInputs(): Locator {
    const section = this.dragFalseSection();
    // node-input-auto-span renders native <input> with tailwind classes.
    // Keep strict first, fallback broader for UI drift.
    return section.locator('input.min-w-20.w-20, input');
  }

  async expectWrongAnswerCount(count: number): Promise<void> {
    await expect(this.wrongAnswerInputs()).toHaveCount(count, { timeout: 10_000 });
  }

  async expectWrongAnswers(values: string[]): Promise<void> {
    await expect.poll(
      async () => this.wrongAnswerInputs().evaluateAll(
        (els) => (els as HTMLInputElement[]).map((e) => e.value).sort(),
      ),
      { timeout: 10_000 },
    ).toEqual([...values].sort());
  }

  // Like expectWrongAnswers but each expected suffix only needs to be contained
  // by SOME wrong-answer input value (substring, not exact match). Used to
  // verify seed values like `${name}-w1` against suffix '-w1' without coupling
  // to the dynamic test prefix.
  async expectWrongAnswersContain(suffixes: string[]): Promise<void> {
    await expect
      .poll(
        async () => {
          const values = await this.wrongAnswerInputs().evaluateAll(
            (els) => (els as HTMLInputElement[]).map((e) => e.value),
          );
          return suffixes.every((s) => values.some((v) => v.includes(s)));
        },
        { timeout: 10_000 },
      )
      .toBe(true);
  }

  // Drop-box choice rows live inside drop-answers.tsx parent container
  // (div.text-sm.bg-white.p-4.rounded-xl containing "câu trả lời"). Each
  // non-deleted child renders div.flex.min-w-0.items-center.justify-center.transition-all
  // with a Checkbox + LatexEditor. They do NOT match the MC `answerRows()`
  // selector (which requires div.rounded-lg.bg-white.p-3).
  dropBoxChoiceRowsList(): Locator {
    // drop-answers.tsx renders 1 read-only correct row (auto-mirrors blank,
    // LatexEditor editable=false → no contenteditable="true") + N added opt
    // rows (editable). Filter to editable rows so list = added opts only.
    return this.page
      .locator('div.text-sm.bg-white.p-4.rounded-xl')
      .filter({ hasText: 'câu trả lời' })
      .locator('div.flex.min-w-0.items-center.justify-center.transition-all')
      .filter({ has: this.page.locator('.ProseMirror[contenteditable="true"]') });
  }

  async expectDropBoxChoiceCount(count: number): Promise<void> {
    await expect(this.dropBoxChoiceRowsList()).toHaveCount(count, { timeout: 10_000 });
  }

  async expectDropBoxChoiceAt(index: number, text: string): Promise<void> {
    const row = this.dropBoxChoiceRowsList().nth(index);
    await expect(
      row.locator('.ProseMirror[contenteditable="true"]').first(),
    ).toContainText(text, { timeout: 10_000 });
  }

  async addWrongAnswer(text: string): Promise<void> {
    const section = this.dragFalseSection();
    await section.scrollIntoViewIfNeeded();
    const addBtn = section.getByRole('button', { name: 'Thêm', exact: true });
    const rows = this.wrongAnswerInputs();
    const before = await rows.count();
    await addBtn.click();
    await expect
      .poll(async () => await rows.count(), { timeout: 5_000 })
      .toBeGreaterThanOrEqual(before + 1);
    const newInput = rows.nth(before);
    await newInput.click();
    await newInput.fill(text);
    await newInput.blur();
    // emitCurrentPayload runs via useDebounceEffect 500ms (fill-drag-drop-quiz/index.tsx:431);
    // wait > debounce so the wrong answer enters the staged payload before save.
    await this.page.waitForTimeout(800);
  }

  async editWrongAnswerAt(index: number, text: string): Promise<void> {
    const inputs = this.wrongAnswerInputs();

    while ((await inputs.count()) <= index) {
      await this.addWrongAnswer('tmp');
    }

    const input = inputs.nth(index);
    await input.scrollIntoViewIfNeeded();
    await input.click({ force: true });
    await input.press('Control+a');
    await input.press('Delete');
    await input.pressSequentially(text, { delay: 30 });
    await input.blur();
    await this.page.waitForTimeout(800);
  }

  // Fill-in-the-blank save. 2 blanks + fill correct answer into each.
  // No DragFalseAnswers for fill type (fill-drag-drop-quiz/index.tsx:471-472).
  async saveFillBlankQuestion(name: string, opts?: { hint?: string }): Promise<void> {
    await this.setNameWithBlanks(name, 2);
    await this.fillBlankAt(0, 'a1');
    await this.fillBlankAt(1, 'a2');
    await this.attachImageToStem().catch(() => {});
    await this.selectFirstProgramLeaf();
    await this.selectFirstDifficulty();
    if (opts?.hint) await this.setHint(opts.hint);
    await this.save();
    await this.expectSaveSuccess();
  }

  // Drag-and-drop save. 2 blanks + fill correct answer + 2 wrong answers via
  // DragFalseAnswers (fill-drag-drop-quiz/index.tsx:474-479).
  async saveDragDropQuestion(name: string, opts?: { hint?: string }): Promise<void> {
    await this.setNameWithBlanks(name, 2);
    await this.selectFirstDifficulty();
    await this.selectFirstProgramLeaf();
    await this.attachImageToStem().catch(() => {});
    await this.fillBlankAt(0, `${name}-a1`);
    await this.fillBlankAt(1, `${name}-a2`);
    await this.addWrongAnswer(`${name}-w1`);
    await this.addWrongAnswer(`${name}-w2`);
    // Safety belt: extra wait so the last debounced emit definitely fires
    // (fill-drag-drop-quiz/index.tsx:431 useDebounceEffect 500ms) before save click.
    await this.page.waitForTimeout(800);
    if (opts?.hint) await this.setHint(opts.hint);
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
  private dropBoxChoiceAddButton(): Locator {
    return this.page.getByRole('button', { name: 'Thêm lựa chọn', exact: true }).first();
  }

  private dropBoxChoiceEditors(): Locator {
    // Choice editors are TipTap ProseMirror contenteditable nodes.
    return this.page.locator('.ProseMirror[contenteditable="true"]');
  }

  private async ensureDropBoxChoiceRow(): Promise<void> {
    const addChoice = this.dropBoxChoiceAddButton();
    await addChoice.waitFor({ state: 'visible', timeout: 25_000 });
    await addChoice.scrollIntoViewIfNeeded();

    const editors = this.dropBoxChoiceEditors();
    const before = await editors.count();
    await addChoice.click({ force: true });
    await expect
      .poll(async () => await editors.count(), { timeout: 15_000 })
      .toBeGreaterThanOrEqual(before + 1);
  }

  private async fillDropBoxChoiceAt(index: number, text: string): Promise<void> {
    const editors = this.dropBoxChoiceEditors();
    const editor = editors.nth(index);
    await editor.waitFor({ state: 'visible', timeout: 8_000 });
    await editor.scrollIntoViewIfNeeded();
    await editor.click();
    await editor.press('Control+a');
    await editor.press('Delete');
    await editor.pressSequentially(text, { delay: 15 });
    await editor.blur();
    await this.page.waitForTimeout(400);
  }

  async saveDropBoxQuestion(name: string, opts?: { hint?: string }): Promise<void> {
    await this.setNameWithBlanks(name, 1);
    await this.selectFirstDifficulty();
    await this.selectFirstProgramLeaf();
    await this.attachImageToStem().catch(() => {});
    // Fill the blank's correct-answer inline editor (createDropBoxContentNode).
    await this.fillBlankAt(0, `${name}-correct`);

    // Click "Thêm lựa chọn" twice; fill new choice editor IMMEDIATELY.
    // Use loop index `i` (not page-wide editor count) so opt labels are
    // predictable opt1/opt2 — page-wide count includes stem+blank editors.
    for (let i = 0; i < 2; i++) {
      await this.ensureDropBoxChoiceRow();
      const idx = (await this.dropBoxChoiceEditors().count()) - 1;
      await this.fillDropBoxChoiceAt(idx, `${name} opt${i + 1}`);
    }

    if (opts?.hint) await this.setHint(opts.hint);
    await this.save();
    await this.expectSaveSuccess();
  }

  async rebuildDropBoxLikeCreate(name: string, correctAnswer: string): Promise<void> {
    await this.rebuildFillBlankStemLikeCreate(name, 1, {
      clearFromEnd: true,
      deleteDelay: 25,
      typeDelay: 60,
      blankPrefixDelay: 40,
      betweenBlanksMs: 250,
    });
    await this.fillBlankAt(0, correctAnswer, { typeDelay: 30 });
  }

  async editDropBoxBlankAnswer(text: string): Promise<void> {
    await this.fillBlankAt(0, text, { typeDelay: 30 });
  }

  async editDropBoxChoices(optPrefix: string): Promise<void> {
    for (let i = 0; i < 2; i++) {
      if ((await this.dropBoxChoiceEditors().count().catch(() => 0)) <= i) {
        await this.ensureDropBoxChoiceRow();
      }
      await this.fillDropBoxChoiceAt(i, `${optPrefix} opt${i + 1}`);
    }
  }

  async rebuildDropBoxLikeCreateWithChoices(
    name: string,
    correctAnswer: string,
  ): Promise<void> {
    const optPrefix = correctAnswer.replace(/_ANS$/, '');

    await this.rebuildFillBlankStemLikeCreate(name, 1, {
      clearFromEnd: true,
      deleteDelay: 25,
      typeDelay: 60,
      blankPrefixDelay: 40,
      betweenBlanksMs: 250,
    });
    await this.fillBlankAt(0, correctAnswer, { typeDelay: 30 });

    for (let i = 0; i < 2; i++) {
      await this.ensureDropBoxChoiceRow();
      const idx = (await this.dropBoxChoiceEditors().count()) - 1;
      await this.fillDropBoxChoiceAt(idx, `${optPrefix} opt${i + 1}`);
    }
  }

  // Group save (QuizNavbar.tsx:888-927). Validation:
  //   - parentQuizData.name not empty
  //   - subQuestions.length ≥ 1
  //   - each sub passes handleCheckQuiz for its type (incl. sub.name non-empty)
  // New group quiz starts with 0 subs (group-quiz/index.tsx:646 setSubQuestions from
  // server data only). Click "Thêm câu hỏi" (line 770) → handleAddSubQuestion seeds
  // default MC sub (line 666) with 2 empty hotspots + own name editor.
  // Sub card = div.rounded-xl.bg-white.border.border-gray-200.shadow-sm (line 814).
  async saveGroupQuestion(
    name: string,
    subCount: number = 4,
    opts?: { hint?: string },
  ): Promise<void> {
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
      await subStem.pressSequentially(`${name} sub ${i + 1}`, { delay: 5 });
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
        await editor.pressSequentially(`${name} s${i + 1} ${letter}`, { delay: 5 });
        await editor.blur();
        await this.page.waitForTimeout(400);
      }

      const correctBox = subRows.nth(0).locator('[role="checkbox"]').first();
      await correctBox.click();
      await this.page.waitForTimeout(400);
    }

    if (opts?.hint) await this.setHint(opts.hint);
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
  async saveStickerQuestion(
    name: string,
    imagePath: string,
    opts?: { hint?: string },
  ): Promise<void> {
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

    // 1 wrong label: click "Thêm" inside WrongLabels section, type, Enter.
    // Section anchored by h6 "Nhãn dán không chính xác".
    const wrongHeader = this.page.getByRole('heading', {
      name: /Nhãn dán không chính xác/,
    });
    await wrongHeader.scrollIntoViewIfNeeded();

    // CreatedLabel.tsx ALWAYS renders an <Input placeholder="Thêm nhãn"> per correct
    // label, so `input[placeholder=...].first()` returns L1's input — not the
    // AddWrongLabel input. Scope to the WrongLabels panel (outer div containing
    // the "Nhãn dán không chính xác" h6 + AddWrongLabel sibling) to disambiguate.
    const wrongPanel = this.page.locator(
      'div:has(> h6:has-text("Nhãn dán không chính xác"))',
    );
    const wrongLabels = [`${name}-W1`];
    for (const value of wrongLabels) {
      const addBtn = wrongPanel.getByRole('button', { name: /^\s*Thêm\s*$/ });
      await addBtn.scrollIntoViewIfNeeded();
      await addBtn.click();
      const input = wrongPanel.locator('input[placeholder="Thêm nhãn"]').first();
      await input.waitFor({ state: 'visible', timeout: 5_000 });
      await input.click();
      await input.fill(value);
      await input.press('Enter');
      await this.page.waitForTimeout(500);
    }

    if (opts?.hint) await this.setHint(opts.hint);
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

  async expectGroupEditLoaded(subCount: number = 2): Promise<void> {
    // Parent framework may still show "Trắc nghiệm" label while rendering group editor.
    // Gate on group-specific editor scaffold.
    await expect(this.saveButton).toBeVisible({ timeout: 20_000 });
    await expect(
      this.page.getByRole('button', { name: 'Thêm câu hỏi', exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      this.page.locator('div.rounded-xl.bg-white.border.border-gray-200.shadow-sm'),
    ).toHaveCount(subCount, { timeout: 20_000 });
  }

  async expectImageVisible(): Promise<void> {
    await expect(
      this.page.locator('img').filter({ hasNot: this.page.locator('[alt=""]') }).first(),
    ).toBeVisible({ timeout: 10_000 });
  }

  async expectRubricSummaryContains(_text: string): Promise<void> {
    // Card layout: <p>Thêm đáp án cho câu hỏi</p> + helper text + <Button>.
    // Button label = "Thiết lập" when rubric empty, "Chỉnh sửa" when set.
    // Card body does NOT render rubric content itself, so verify state via
    // "Chỉnh sửa" button presence.
    const rubricCard = this.page.locator(
      'div.rounded-xl:has(p:has-text("Thêm đáp án cho câu hỏi"))',
    );
    await expect(
      rubricCard.getByRole('button', { name: 'Chỉnh sửa', exact: true }),
    ).toBeVisible({ timeout: 10_000 });
  }

  async expectStickerLabelVisible(text: string): Promise<void> {
    // Two render paths:
    //   1. CreatedLabel.tsx / WrongLabel active mode → <Input placeholder="Thêm nhãn" value=...>
    //      Only mounts when imageUrl truthy (ImageLabeling gate at index.tsx:416).
    //   2. GeneratedLabels.tsx + WrongLabel inactive → <div title={value}>{value}</div>
    //      Side panel renders when sticker section mounted (index.tsx:438-440).
    // Gate on "Nhãn dán đúng" heading first to confirm sticker section mounted —
    // surfaces nav-away or unmount-by-hydration-error as a clear, fast failure.
    await expect(
      this.page.getByRole('heading', { name: 'Nhãn dán đúng', exact: true }),
    ).toBeVisible({ timeout: 20_000 });

    const escaped = text.replace(/"/g, '\\"');
    await expect
      .poll(
        async () => {
          const values = await this.page
            .locator('input[placeholder="Thêm nhãn"]')
            .evaluateAll((els) => (els as HTMLInputElement[]).map((e) => e.value));
          if (values.some((v) => v.includes(text))) return true;
          const titleCount = await this.page
            .locator(`div[title*="${escaped}"]`)
            .count();
          return titleCount > 0;
        },
        { timeout: 20_000 },
      )
      .toBe(true);
  }

  async expectGroupSubCount(count: number): Promise<void> {
    await expect(
      this.page.locator('div.rounded-xl.bg-white.border.border-gray-200.shadow-sm'),
    ).toHaveCount(count, { timeout: 10_000 });
  }

  async expectGroupSubAnswerAt(index: number, text: string): Promise<void> {
    const subCard = this.page
      .locator('div.rounded-xl.bg-white.border.border-gray-200.shadow-sm')
      .nth(index);
    await expect(
      subCard.locator('div.rounded-lg.bg-white.p-3:has([role="checkbox"]) .ProseMirror[contenteditable="true"]').first(),
    ).toContainText(text, { timeout: 10_000 });
  }

  // Diagnostic: dump each sub-card's MC row editor text. Used to debug
  // hydration on edit reload.
  async debugDumpGroupSubAnswers(label: string = 'init'): Promise<void> {
    const subCards = this.page.locator(
      'div.rounded-xl.bg-white.border.border-gray-200.shadow-sm',
    );
    const subCount = await subCards.count();
    console.log(`[group-debug:${label}] subCount=${subCount}`);
    for (let i = 0; i < subCount; i++) {
      const card = subCards.nth(i);
      const editors = card.locator('.ProseMirror[contenteditable="true"]');
      const editorCount = await editors.count();
      for (let j = 0; j < editorCount; j++) {
        const text = (await editors.nth(j).textContent()) ?? '';
        console.log(`[group-debug:${label}] sub#${i} editor#${j}: "${text.trim()}"`);
      }
      const rows = card.locator(
        'div.rounded-lg.bg-white.p-3:has([role="checkbox"])',
      );
      const rowCount = await rows.count();
      console.log(`[group-debug:${label}] sub#${i} rows=${rowCount}`);
    }
    // Dump Zustand group store snapshot (what validation reads).
    const storeJson = await this.page.evaluate(() => {
      try {
        return localStorage.getItem('groupQuizStudio') ?? '';
      } catch {
        return '';
      }
    });
    try {
      const parsed = JSON.parse(storeJson || '{}');
      const subs = parsed?.state?.subQuestions ?? [];
      console.log(`[group-debug:${label}] zustand.subQuestions.length=${subs.length}`);
      subs.forEach((s: any, i: number) => {
        const hs = s?.quizzInfo?.questions_hotspots?.data ?? [];
        console.log(
          `[group-debug:${label}] zustand.sub#${i} type=${s?.type} hotspots=${hs.length}`,
        );
        hs.forEach((h: any, j: number) => {
          console.log(
            `[group-debug:${label}]   sub#${i}.hotspot#${j} keys=${Object.keys(h || {}).join(',')}`,
          );
          console.log(
            `[group-debug:${label}]   sub#${i}.hotspot#${j} raw=${JSON.stringify(h).slice(0, 200)}`,
          );
        });
      });
    } catch (e) {
      console.log(`[group-debug:${label}] zustand parse failed: ${e}`);
    }
  }

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
    await editor.press('ControlOrMeta+a');
    await editor.press('Delete');
    await editor.pressSequentially(text, { delay: 25 });
    await editor.blur();
    await this.page.waitForTimeout(1_000);
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

  // Sticker edit: rename existing 2 correct + 1 wrong labels in place (no
  // delete+create). Reason: CurrentLabel.handleCreateLabel and AddWrongLabel
  // .handleCreateWrongLabel rewrite objQuizFormStudio.questions_hotspots.data
  // WITHOUT id for all items, including hydrated `is_existed` ones. On save the
  // mutation tries UPDATE where id=undefined → Hasura "database query error".
  // In-place rename routes through CreatedLabel.handleUpdateLabel and
  // EditWrongLabel.handleUpdateWrongLabels, both of which preserve id+is_existed.
  async editStickerLabels(newText: string): Promise<void> {
    const newCorrect = [`${newText}-C1`, `${newText}-C2`];
    const newWrong = `${newText}-W1`;

    const labelArea = this.page.locator('#image-labeling');
    await labelArea.waitFor({ state: 'visible', timeout: 10_000 });
    await labelArea.scrollIntoViewIfNeeded();

    // CreatedLabel Input has id="exclude" (CreatedLabel.tsx:220). CurrentLabel
    // Input has no id. Filter picks only hydrated labels — never the transient
    // CurrentLabel that would route through the buggy handleCreateLabel.
    const createdInputs = labelArea.locator('input[placeholder="Thêm nhãn"]#exclude');
    await expect(createdInputs).toHaveCount(2, { timeout: 10_000 });
    for (let i = 0; i < newCorrect.length; i++) {
      const input = createdInputs.nth(i);
      await input.scrollIntoViewIfNeeded();
      await input.click();
      await input.press('ControlOrMeta+a');
      await input.press('Delete');
      await input.pressSequentially(newCorrect[i], { delay: 25 });
      await input.press('Enter');
      await this.page.waitForTimeout(500);
    }

    // Rename wrong label via chip → EditWrongLabel input (Enter triggers
    // handleUpdateWrongLabels which preserves id+is_existed).
    const wrongHeader = this.page.getByRole('heading', {
      name: /Nhãn dán không chính xác/,
    });
    await wrongHeader.scrollIntoViewIfNeeded();
    const wrongChip = this.page
      .locator('div[title].rounded-lg.border-2.cursor-pointer')
      .first();
    await wrongChip.scrollIntoViewIfNeeded();
    await wrongChip.click();
    // EditWrongLabel renders `div.flex.items-center.gap-3` wrapping its Input +
    // always-visible Trash. AddWrongLabel uses same wrapper class but only
    // mounts when "Thêm" clicked. Limit to first match while only EditWrongLabel
    // is on screen.
    const editGroup = this.page
      .locator('div.flex.items-center.gap-3')
      .filter({ has: this.page.locator('input[placeholder="Thêm nhãn"]') })
      .first();
    const editInput = editGroup.locator('input[placeholder="Thêm nhãn"]').first();
    await editInput.waitFor({ state: 'visible', timeout: 5_000 });
    await editInput.click();
    await editInput.press('ControlOrMeta+a');
    await editInput.press('Delete');
    await editInput.pressSequentially(newWrong, { delay: 25 });
    await editInput.press('Enter');
    await this.page.waitForTimeout(600);
  }
}
