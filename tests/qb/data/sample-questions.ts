import type { QuizTypeCode } from '../pages/QuestionFormPage';

// Synthetic test data for question-create-manual smoke.
// Unique name per type to avoid contention when specs run parallel.

export const QUESTION_NAME_PREFIX = 'TEST_Q';

export function sampleQuestionName(code: QuizTypeCode, suffix: string): string {
  return `${QUESTION_NAME_PREFIX}_${code}_${suffix}`;
}

export const SAMPLE_QUESTION_NAMES: Record<QuizTypeCode, string> = {
  multiple_choice: 'Câu hỏi trắc nghiệm smoke 1+1=?',
  group: 'Câu hỏi nhóm smoke chủ đề A',
  fill_in_the_blank: 'Việt Nam thủ đô là ___',
  essay: 'Trình bày ý nghĩa định lý Pythagore',
  matching: 'Nối tên thủ đô với quốc gia',
  drop_box: 'Phân loại các từ vào nhóm',
  drag_and_drop: 'Kéo từ vào chỗ trống',
  sticker: 'Đánh dấu các vị trí trên ảnh',
};

export const SAMPLE_BANK_NAME_PREFIX = 'TEST_BANK_QCREATE';
