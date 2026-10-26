'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { api } from '@/lib/fetcher';
import { SUBJECT_STYLE, type AiFeedback, type Subject, type WrongNote } from '@/lib/constants';
import { ErrorBox, EmptyState } from './States';

type FeedbackRow = AiFeedback & { id: number; created_at?: string };

export function WrongNotesView({ notes, feedback: initialFeedback }: { notes: WrongNote[]; feedback: FeedbackRow[] }) {
  const [filter, setFilter] = useState<Subject | null>(null);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // 과목 칩: 실제 오답이 있는 과목만 개수와 함께 보여 준다
  const subjects = useMemo(() => {
    const m = new Map<Subject, number>();
    notes.forEach((n) => m.set(n.subject, (m.get(n.subject) ?? 0) + 1));
    return [...m.entries()];
  }, [notes]);
  const visible = filter ? notes.filter((n) => n.subject === filter) : notes;

  async function analyze() {
    setAnalyzing(true);
    setAiError('');
    try {
      const res = await api<{ feedback: FeedbackRow }>('/api/ai/feedback', { method: 'POST' });
      setFeedback((prev) => [{ ...res.feedback, created_at: '방금 전' }, ...prev]);
    } catch (err) {
      setAiError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  const latest = feedback[0];
  const history = feedback.slice(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <h1 className="text-3xl font-black tracking-tight">📒 오답노트</h1>
          <p className="mt-1 text-muted">
            가장 최근에 틀린 문제 <b className="num text-pink">{notes.length}</b>개 · 다시 맞히면 자동으로 빠져요
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={analyze}
            disabled={notes.length === 0 || analyzing}
            title={notes.length === 0 ? '틀린 문제가 없어요!' : undefined}
          >
            {analyzing ? '🔍 분석하는 중…' : '💡 AI 오답 분석'}
          </button>
          {notes.length > 0 ? (
            <Link href={filter ? `/review?subject=${encodeURIComponent(filter)}` : '/review'} className="btn btn-pink">
              🔁 오답만 다시 풀기{filter ? ` (${filter})` : ''}
            </Link>
          ) : (
            <span className="btn btn-pink pointer-events-none opacity-45">🔁 오답만 다시 풀기</span>
          )}
        </div>
      </div>

      {/* AI 분석 */}
      {analyzing && (
        <div className="card flex items-center gap-4 border-lime/30 p-5">
          <span className="animate-float text-4xl">🤖</span>
          <div>
            <p className="font-extrabold">AI가 오답 패턴을 살펴보는 중…</p>
            <p className="text-sm text-muted">보통 5~10초 걸려요</p>
          </div>
        </div>
      )}
      {aiError && <ErrorBox message={aiError} onRetry={notes.length > 0 ? analyze : undefined} />}
      {latest && !analyzing && <FeedbackCard fb={latest} highlight />}
      {history.length > 0 && (
        <div>
          <button
            type="button"
            className="text-sm font-bold text-muted hover:text-white"
            onClick={() => setShowHistory((v) => !v)}
            aria-expanded={showHistory}
          >
            {showHistory ? '▾' : '▸'} 지난 분석 {history.length}개
          </button>
          {showHistory && (
            <div className="mt-3 space-y-3">
              {history.map((fb) => (
                <FeedbackCard key={fb.id} fb={fb} />
              ))}
            </div>
          )}
        </div>
      )}

      {notes.length === 0 ? (
        <EmptyState
          emoji="🏅"
          title="틀린 문제가 없어요!"
          desc="퀴즈를 풀다 틀린 문제가 생기면 여기에 모여요."
          action={{ href: '/', label: '퀴즈 풀러 가기' }}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="과목 필터">
            <button type="button" className="chip" data-on={filter === null} onClick={() => setFilter(null)}>
              전체 {notes.length}
            </button>
            {subjects.map(([s, n]) => (
              <button key={s} type="button" className="chip" data-on={filter === s} onClick={() => setFilter(s)}>
                {SUBJECT_STYLE[s].emoji} {s} {n}
              </button>
            ))}
          </div>

          <ul className="grid gap-3 md:grid-cols-2">
            {visible.map((n, i) => {
              const s = SUBJECT_STYLE[n.subject];
              return (
                <li key={n.id} className="card animate-fade-up p-5" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="rounded-full px-2.5 py-1" style={{ background: s.soft, color: s.color }}>
                      {s.emoji} {n.subject}
                    </span>
                    <Link href={`/decks/${n.deck_id}`} className="truncate text-muted hover:text-white">
                      {n.deck_title}
                    </Link>
                    <span className="ml-auto shrink-0 text-white/40">{n.answered_at.slice(5, 16)}</span>
                  </div>
                  <p className="mt-3 font-bold whitespace-pre-wrap">{n.question}</p>
                  <p className="mt-3 rounded-xl bg-bad/10 px-3 py-2 text-sm text-[#ffb3c1]">
                    ✕ 내 답: {n.choices[n.chosen_index]}
                  </p>
                  <p className="mt-1.5 rounded-xl bg-good/10 px-3 py-2 text-sm text-good">
                    ✓ 정답: {n.choices[n.answer_index]}
                  </p>
                  {n.explanation && <p className="mt-2 text-sm text-muted">💡 {n.explanation}</p>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function FeedbackCard({ fb, highlight = false }: { fb: FeedbackRow; highlight?: boolean }) {
  return (
    <section
      className={`card animate-fade-up p-6 ${highlight ? 'border-lime/40 shadow-[0_0_40px_-10px_rgba(198,255,61,0.35)]' : ''}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">💡</span>
        <h2 className="font-extrabold text-lime">AI 오답 분석</h2>
        {fb.created_at && <span className="ml-auto text-xs text-white/40">{fb.created_at}</span>}
      </div>
      <p className="mt-3 leading-relaxed">{fb.summary}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {fb.weak_points.length > 0 && (
          <div className="rounded-2xl bg-pink/10 p-4">
            <p className="mb-2 text-sm font-extrabold text-pink">🎯 약한 부분</p>
            <ul className="space-y-1.5 text-sm">
              {fb.weak_points.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </div>
        )}
        {fb.study_tips.length > 0 && (
          <div className="rounded-2xl bg-lime/10 p-4">
            <p className="mb-2 text-sm font-extrabold text-lime">📚 공부 팁</p>
            <ul className="space-y-1.5 text-sm">
              {fb.study_tips.map((t, i) => (
                <li key={i}>• {t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
