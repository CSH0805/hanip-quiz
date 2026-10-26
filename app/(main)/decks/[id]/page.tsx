import { notFound } from 'next/navigation';
import { requirePageUser } from '@/lib/auth';
import { getDeck } from '@/lib/queries';
import { DeckDetail } from '@/components/DeckDetail';

export const runtime = 'nodejs';

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const deck = await getDeck(user.uid, id);
  if (!deck) notFound();
  return <DeckDetail deck={deck} />;
}
