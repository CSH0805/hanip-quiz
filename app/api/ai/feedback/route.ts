import { NextResponse } from 'next/server';
import { HttpError, withUser } from '@/lib/api';
import { analyzeWrongAnswers } from '@/lib/gemini';
import { listFeedback, listWrongNotes, saveFeedback } from '@/lib/queries';

export const runtime = 'nodejs';
export const maxDuration = 30;

// 지난 분석 목록
export const GET = withUser(async (_req, userId) => {
  return NextResponse.json({ feedback: await listFeedback(userId) });
});

// 💡 AI 오답 분석: 틀린 문제는 클라이언트가 보낸 값이 아니라 DB의 오답노트에서 직접 가져온다.
export const POST = withUser(async (_req, userId) => {
  const notes = await listWrongNotes(userId);
  if (notes.length === 0) throw new HttpError(400, '틀린 문제가 없어요!');

  const items = notes.slice(0, 20).map((n) => ({
    subject: n.subject,
    question: n.question,
    chosen: n.choices[n.chosen_index] ?? '',
    answer: n.choices[n.answer_index] ?? '',
  }));
  const feedback = await analyzeWrongAnswers(items);
  const id = await saveFeedback(userId, feedback);
  return NextResponse.json({ feedback: { id, ...feedback } }, { status: 201 });
});
