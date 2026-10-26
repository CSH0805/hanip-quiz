import Link from 'next/link';
import { SUBJECT_STYLE, type DeckSummary } from '@/lib/constants';

export function DeckCard({ deck, index }: { deck: DeckSummary; index: number }) {
  const s = SUBJECT_STYLE[deck.subject];
  return (
    <div
      className="card animate-fade-up group relative flex flex-col overflow-hidden p-5 transition hover:-translate-y-1 hover:border-white/25"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: s.color }} />
      <div className="flex items-center gap-2 text-sm font-bold">
        <span className="rounded-full px-3 py-1" style={{ background: s.soft, color: s.color }}>
          {s.emoji} {deck.subject}
        </span>
        <span className="rounded-full bg-white/5 px-3 py-1 text-muted">{deck.difficulty}</span>
        {deck.is_ai === 1 && <span className="ml-auto text-xs text-lime">✨ AI</span>}
      </div>

      <Link href={`/decks/${deck.id}`} className="mt-4 text-xl leading-snug font-extrabold after:absolute after:inset-0">
        {deck.title}
      </Link>

      <div className="mt-5 flex items-end gap-6">
        <div>
          <p className="text-xs font-bold text-muted">문제</p>
          <p className="num text-3xl">{deck.question_count}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-muted">내 최고</p>
          <p className="num text-3xl" style={{ color: deck.best_score == null ? undefined : s.color }}>
            {deck.best_score == null ? '–' : deck.best_score}
            {deck.best_score != null && <span className="text-base">점</span>}
          </p>
        </div>
        {deck.question_count > 0 && (
          <Link
            href={`/decks/${deck.id}/play`}
            className="btn btn-lime relative z-10 ml-auto px-4 py-2"
            aria-label={`${deck.title} 풀기`}
          >
            ▶ 풀기
          </Link>
        )}
      </div>
    </div>
  );
}
