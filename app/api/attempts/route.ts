import { NextResponse } from 'next/server';
import { HttpError, readJson, withUser } from '@/lib/api';
import { saveAttempt, type AnswerInput } from '@/lib/queries';

export const runtime = 'nodejs';

// 퀴즈 결과 저장: 클라이언트가 보낸 정답 여부는 믿지 않고, 서버에서 DB의 정답으로 다시 채점한다.
export const POST = withUser(async (req, userId) => {
  const body = await readJson(req);
  const mode = body.mode;
  if (mode !== 'deck' && mode !== 'review') throw new HttpError(400, 'mode는 deck 또는 review여야 해요.');

  let deckId: number | null = null;
  if (mode === 'deck') {
    if (!Number.isInteger(body.deckId) || (body.deckId as number) <= 0) throw new HttpError(400, 'deckId가 필요해요.');
    deckId = body.deckId as number;
  }

  if (!Array.isArray(body.answers) || body.answers.length === 0 || body.answers.length > 100) {
    throw new HttpError(400, '응답이 비어 있어요.');
  }
  const answers: AnswerInput[] = body.answers.map((a: unknown) => {
    const r = (a ?? {}) as Record<string, unknown>;
    const questionId = r.questionId;
    const chosenIndex = r.chosenIndex;
    if (!Number.isInteger(questionId) || !Number.isInteger(chosenIndex) || (chosenIndex as number) < 0 || (chosenIndex as number) > 3) {
      throw new HttpError(400, '응답 형식이 올바르지 않아요.');
    }
    return { questionId: questionId as number, chosenIndex: chosenIndex as number };
  });

  const result = await saveAttempt(userId, mode, deckId, answers);
  return NextResponse.json(result, { status: 201 });
});
