import Link from 'next/link';
import { requirePageUser } from '@/lib/auth';
import { listDecks } from '@/lib/queries';
import { DeckCard } from '@/components/DeckCard';
import { EmptyState } from '@/components/States';

export const runtime = 'nodejs';

export default async function HomePage() {
  const user = await requirePageUser();
  const decks = await listDecks(user.uid);

  return (
    <div className="space-y-8">
      <section className="animate-fade-up">
        <p className="text-muted">안녕하세요, <b className="text-white">{user.nick}</b>님 👋</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">오늘은 뭘 한입 해볼까요?</h1>
      </section>

      <section className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <Link
          href="/ai"
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-pink to-[#8b3dff] p-6 shadow-[0_6px_0_0_var(--color-pink-dark)] transition active:translate-y-[4px] active:shadow-[0_2px_0_0_var(--color-pink-dark)] sm:p-8"
        >
          <span className="absolute -right-4 -bottom-6 text-[8rem] opacity-25 transition group-hover:rotate-12">✨</span>
          <p className="text-sm font-bold text-white/80">공부 내용 붙여넣기 or 주제 한 줄</p>
          <p className="mt-1 text-2xl font-black sm:text-3xl">✨ AI로 퀴즈 만들기</p>
          <p className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-sm font-bold">10초면 완성 →</p>
        </Link>
        <Link
          href="/decks/new"
          className="card flex flex-col justify-center gap-1 p-6 transition hover:border-lime/50 active:translate-y-[3px]"
        >
          <span className="text-3xl">✍️</span>
          <span className="text-lg font-extrabold">직접 덱 만들기</span>
          <span className="text-sm text-muted">문제를 한 땀 한 땀</span>
        </Link>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-extrabold">내 덱</h2>
          <span className="num text-muted">{decks.length}개</span>
        </div>
        {decks.length === 0 ? (
          <EmptyState
            emoji="🗂️"
            title="아직 덱이 없어요"
            desc="AI로 퀴즈를 만들거나 직접 덱을 만들어 첫 퀴즈를 시작해 보세요."
            action={{ href: '/ai', label: '✨ AI로 첫 덱 만들기' }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((d, i) => (
              <DeckCard key={d.id} deck={d} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
