import { test, expect } from '../../fixtures/qb.fixture';
import {
  createBankWithMcQuestion,
  deleteBank,
} from '../../data/setup-helpers';

// xlsx III.9 (R205) — edit existing question.
// Seed: owned bank + 1 multiple_choice question via createBankWithMcQuestion.
// Edit path: bankDetail.clickEditQuestion -> quiz-form?code=...&quizId=...
// Save reuses Lưu button; QuizNavbar.tsx:668 emits "Sửa câu hỏi thành công".
// handleAfterSave redirects /banks/{id}?tab=library&status=draft (same as add).

test.describe('Question edit', () => {
  let bankName = '';

  test.afterEach(async ({ banksList }) => {
    if (bankName) {
      await deleteBank(banksList, bankName);
      bankName = '';
    }
  });

  test('edit form scaffolds from card click', async ({
    page,
    banksList,
    bankForm,
    bankDetail,
    questionForm,
  }) => {
    const seed = await createBankWithMcQuestion(
      banksList,
      bankForm,
      bankDetail,
      questionForm,
      'EDIT_SCAFFOLD',
    );
    bankName = seed.bankName;

    // After save we land on /banks/{id}?tab=library&status=draft. Click edit on the card.
    await bankDetail.clickEditQuestion(seed.questionName);

    // Quiz form mounts: name editor visible + Lưu button visible.
    await expect(questionForm.nameEditor).toBeVisible({ timeout: 15_000 });
    await expect(questionForm.saveButton).toBeVisible({ timeout: 10_000 });
    // URL carries quizId.
    expect(new URL(page.url()).searchParams.get('quizId')).not.toBeNull();
  });

  test('edit name then save shows edit success toast', async ({
    banksList,
    bankForm,
    bankDetail,
    questionForm,
  }) => {
    const seed = await createBankWithMcQuestion(
      banksList,
      bankForm,
      bankDetail,
      questionForm,
      'EDIT_NAME',
    );
    bankName = seed.bankName;

    await bankDetail.clickEditQuestion(seed.questionName);
    const newName = `${seed.questionName}_EDITED`;
    await questionForm.setName(newName);
    await questionForm.save();
    await questionForm.expectEditSuccess();
  });

  test('edited name appears in library card list', async ({
    banksList,
    bankForm,
    bankDetail,
    questionForm,
  }) => {
    const seed = await createBankWithMcQuestion(
      banksList,
      bankForm,
      bankDetail,
      questionForm,
      'EDIT_ROUNDTRIP',
    );
    bankName = seed.bankName;

    await bankDetail.clickEditQuestion(seed.questionName);
    const newName = `${seed.questionName}_RT`;
    await questionForm.setName(newName);
    await questionForm.save();
    await questionForm.expectEditSuccess();

    // After redirect to library, new name renders on the card; old name absent.
    await expect(bankDetail.questionItemByName(newName)).toBeVisible({
      timeout: 15_000,
    });
  });

  // Edit câu hỏi (stem) — nameEditor IS the question prompt (top-action-quiz
  // placeholder "Nhập câu hỏi vào đây"). Setting it replaces the question text.
  test('edit câu hỏi (stem) — đổi nội dung câu hỏi rồi lưu', async ({
    banksList,
    bankForm,
    bankDetail,
    questionForm,
  }) => {
    const seed = await createBankWithMcQuestion(
      banksList,
      bankForm,
      bankDetail,
      questionForm,
      'EDIT_STEM',
    );
    bankName = seed.bankName;

    await bankDetail.clickEditQuestion(seed.questionName);
    const newStem = `${seed.questionName}_CÂU_HỎI_MỚI`;
    await questionForm.setName(newStem);
    await questionForm.save();
    await questionForm.expectEditSuccess();

    await expect(bankDetail.questionItemByName(newStem)).toBeVisible({
      timeout: 15_000,
    });
  });

  // Edit câu trả lời — fillAnswerAt(0, ...) thay nội dung row đáp án đầu.
  // Seed MC mặc định 2 row A/B, correct=A. Đổi text row A, lưu, expect edit toast.
  test('edit câu trả lời — đổi nội dung đáp án rồi lưu', async ({
    banksList,
    bankForm,
    bankDetail,
    questionForm,
  }) => {
    const seed = await createBankWithMcQuestion(
      banksList,
      bankForm,
      bankDetail,
      questionForm,
      'EDIT_ANSWER',
    );
    bankName = seed.bankName;

    await bankDetail.clickEditQuestion(seed.questionName);
    // Giữ nguyên stem, chỉ đổi text answer row 0.
    const newAnswer = `${seed.questionName} - ĐÁP ÁN SỬA`;
    await questionForm.fillAnswerAt(0, newAnswer);
    await questionForm.save();
    await questionForm.expectEditSuccess();
  });
});
