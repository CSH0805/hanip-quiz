import { DIFFICULTIES, SUBJECTS, type Difficulty, type DraftQuestion, type Subject } from './constants';
import { HttpError } from './api';

export function str(value: unknown, field: string, { min = 1, max = 1000 } = {}): string {
  if (typeof value !== 'string') throw new HttpError(400, `${field}을(를) 입력해 주세요.`);
  const v = value.trim();
  if (v.length < min) throw new HttpError(400, `${field}을(를) 입력해 주세요.`);
  if (v.length > max) throw new HttpError(400, `${field}은(는) ${max}자 이하로 입력해 주세요.`);
  return v;
}

export function subject(value: unknown): Subject {
  if (!SUBJECTS.includes(value as Subject)) throw new HttpError(400, '과목을 골라 주세요.');
  return value as Subject;
}

export function difficulty(value: unknown): Difficulty {
  if (!DIFFICULTIES.includes(value as Difficulty)) throw new HttpError(400, '난이도를 골라 주세요.');
  return value as Difficulty;
}

export function answerIndex(value: unknown): number {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 3) {
    throw new HttpError(400, '정답 보기를 골라 주세요.');
  }
  return value as number;
}

export function question(raw: unknown, label = '문제'): DraftQuestion {
  if (!raw || typeof raw !== 'object') throw new HttpError(400, `${label} 형식이 올바르지 않아요.`);
  const q = raw as Record<string, unknown>;
  if (!Array.isArray(q.choices) || q.choices.length !== 4) {
    throw new HttpError(400, `${label}: 보기는 정확히 4개여야 해요.`);
  }
  return {
    question: str(q.question, `${label} 내용`, { max: 1000 }),
    choices: q.choices.map((c, i) => str(c, `${label} 보기 ${i + 1}`, { max: 200 })),
    answer_index: answerIndex(q.answer_index),
    explanation: typeof q.explanation === 'string' ? q.explanation.trim().slice(0, 2000) : '',
  };
}
