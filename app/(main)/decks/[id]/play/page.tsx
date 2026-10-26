import { notFound } from 'next/navigation';
import { requirePageUser } from '@/lib/auth';
import { getDeck } from '@/lib/queries';
import { QuizPlayer } from '@/components/QuizPlayer';
import { EmptyState } from '@/components/States';

export const runtime = 'nodejs';

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const deck = await getDeck(user.uid, id);
  if (!deck) notFound();
  if (deck.questions.length === 0) {
    return (
      <EmptyState
        emoji="📝"
        title="아직 문제가 없어요"
        desc="문제를 하나 이상 추가하면 풀 수 있어요."
        action={{ href: `/decks/${deck.id}`, label: '문제 추가하러 가기' }}
      />
    );
  }
  return <QuizPlayer title={deck.title} questions={deck.questions} mode="deck" deckId={deck.id} backHref={`/decks/${deck.id}`} />;
}
