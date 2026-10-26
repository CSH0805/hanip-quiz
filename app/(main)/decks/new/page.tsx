import { NewDeck } from '@/components/NewDeck';

export const metadata = { title: '새 덱 · 한입퀴즈' };

export default function NewDeckPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-black tracking-tight">✍️ 새 덱 만들기</h1>
      <div className="card p-6">
        <NewDeck />
      </div>
    </div>
  );
}
