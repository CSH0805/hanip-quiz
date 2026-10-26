import { NextResponse } from 'next/server';
import { HttpError, readJson, withUser } from '@/lib/api';
import { AI_SOURCE_MAX, DIFFICULTIES, SUBJECTS, type Difficulty, type Subject } from '@/lib/constants';
import { generateQuiz } from '@/lib/gemini';

export const runtime = 'nodejs';
export const maxDuration = 30;

// AI 퀴즈 미리보기 생성 (저장하지 않음 — 저장은 POST /api/decks 로)
export const POST = withUser(async (req) => {
  const body = await readJson(req);

  const count = body.count === 10 ? 10 : body.count === 5 ? 5 : null;
  if (!count) throw new HttpError(400, '문제 수는 5 또는 10이에요.');
  if (!DIFFICULTIES.includes(body.difficulty as Difficulty)) throw new HttpError(400, '난이도를 골라 주세요.');
  const difficulty = body.difficulty as Difficulty;

  let sourceText: string | null = null;
  let subject: Subject | null = null;
  let topic: string | null = null;

  if (body.method === 'text') {
    sourceText = typeof body.sourceText === 'string' ? body.sourceText.trim() : '';
    if (sourceText.length < 30) throw new HttpError(400, '공부 내용을 30자 이상 붙여넣어 주세요.');
    if (sourceText.length > AI_SOURCE_MAX) throw new HttpError(400, `공부 내용은 ${AI_SOURCE_MAX}자까지 넣을 수 있어요.`);
  } else if (body.method === 'topic') {
    if (!SUBJECTS.includes(body.subject as Subject)) throw new HttpError(400, '과목을 골라 주세요.');
    subject = body.subject as Subject;
    topic = typeof body.topic === 'string' ? body.topic.trim() : '';
    if (!topic) throw new HttpError(400, '주제를 한 줄 입력해 주세요.');
    if (topic.length > 60) throw new HttpError(400, '주제는 60자 이내로 입력해 주세요.');
  } else {
    throw new HttpError(400, '만드는 방식을 골라 주세요.');
  }

  const quiz = await generateQuiz({ sourceText, subject, topic, count, difficulty });
  return NextResponse.json({ ...quiz, source_text: sourceText });
});
