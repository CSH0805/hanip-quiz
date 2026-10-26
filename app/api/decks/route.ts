import { NextResponse } from 'next/server';
import { HttpError, readJson, withUser } from '@/lib/api';
import { AI_SOURCE_MAX } from '@/lib/constants';
import { createDeck, listDecks } from '@/lib/queries';
import * as v from '@/lib/validate';

export const runtime = 'nodejs';

export const GET = withUser(async (_req, userId) => {
  return NextResponse.json({ decks: await listDecks(userId) });
});

// questions 배열을 함께 보내면 덱 + 문제를 한 트랜잭션으로 저장한다 (AI 미리보기 저장에 사용)
export const POST = withUser(async (req, userId) => {
  const body = await readJson(req);
  const rawQuestions = body.questions ?? [];
  if (!Array.isArray(rawQuestions)) throw new HttpError(400, 'questions는 배열이어야 해요.');
  if (rawQuestions.length > 50) throw new HttpError(400, '한 번에 50문제까지 저장할 수 있어요.');
  const questions = rawQuestions.map((q, i) => v.question(q, `${i + 1}번 문제`));

  const sourceText =
    typeof body.source_text === 'string' && body.source_text.trim()
      ? body.source_text.trim().slice(0, AI_SOURCE_MAX)
      : null;

  const id = await createDeck(
    userId,
    {
      title: v.str(body.title, '덱 제목', { max: 100 }),
      subject: v.subject(body.subject),
      difficulty: v.difficulty(body.difficulty),
      source_text: sourceText,
      is_ai: body.is_ai === true,
    },
    questions,
  );
  return NextResponse.json({ id }, { status: 201 });
});
