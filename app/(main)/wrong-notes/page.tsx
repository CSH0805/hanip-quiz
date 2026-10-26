import { requirePageUser } from '@/lib/auth';
import { listFeedback, listWrongNotes } from '@/lib/queries';
import { WrongNotesView } from '@/components/WrongNotesView';

export const runtime = 'nodejs';
export const metadata = { title: '오답노트 · 한입퀴즈' };

export default async function WrongNotesPage() {
  const user = await requirePageUser();
  const [notes, feedback] = await Promise.all([listWrongNotes(user.uid), listFeedback(user.uid)]);
  return <WrongNotesView notes={notes} feedback={feedback} />;
}
