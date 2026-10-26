import { requirePageUser } from '@/lib/auth';
import { SUBJECTS, type Subject } from '@/lib/constants';
import { listWrongNotes } from '@/lib/queries';
import { QuizPlayer } from '@/components/QuizPlayer';
import { EmptyState } from '@/components/States';

export const runtime = 'nodejs';

// 오답만 다시 풀기 (mode='review'). 맞히면 그 문제의 최근 응답이 정답이 되어 오답노트에서 빠진다.
export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const user = await requirePageUser();
  const raw = (await searchParams).subject;
  const subject = SUBJECTS.includes(raw as Subject) ? (raw as Subject) : undefined;
  const notes = await listWrongNotes(user.uid, subject);

  if (notes.length === 0) {
    return (
      <EmptyState
        emoji="🏅"
        title="틀린 문제가 없어요!"
        desc="오답노트가 깨끗해요. 새 퀴즈에 도전해 보세요."
        action={{ href: '/', label: '홈으로' }}
      />
    );
  }

  const questions = notes.slice(0, 20).map(({ id, deck_id, question, choices, answer_index, explanation }) => ({
    id,
    deck_id,
    question,
    choices,
    answer_index,
    explanation,
  }));
  return (
    <QuizPlayer
      title={subject ? `${subject} 오답 복습` : '오답 복습'}
      questions={questions}
      mode="review"
      deckId={null}
      backHref="/wrong-notes"
    />
  );
}
