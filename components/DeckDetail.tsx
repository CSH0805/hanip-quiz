'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/fetcher';
import { SUBJECT_STYLE, type Difficulty, type Question, type Subject } from '@/lib/constants';
import { ConfirmModal } from './ConfirmModal';
import { DeckForm } from './DeckForm';
import { QuestionEditor } from './QuestionEditor';
import { EmptyState } from './States';

type Deck = {
  id: number;
  title: string;
  subject: Subject;
  difficulty: Difficulty;
  is_ai: number;
  questions: Question[];
};

export function DeckDetail({ deck }: { deck: Deck }) {
  const router = useRouter();
  const s = SUBJECT_STYLE[deck.subject];
  const [editingDeck, setEditingDeck] = useState(false);
  const [editingQ, setEditingQ] = useState<number | null>(null);
  const [adding, setAdding] = useState(deck.questions.length === 0);
  const [confirm, setConfirm] = useState<null | { kind: 'deck' } | { kind: 'question'; id: number }>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function doDelete() {
    if (!confirm) return;
    setDeleting(true);
    try {
      if (confirm.kind === 'deck') {
        await api(`/api/decks/${deck.id}`, { method: 'DELETE' });
        router.replace('/');
        router.refresh();
        return;
      }
      await api(`/api/questions/${confirm.id}`, { method: 'DELETE' });
      setConfirm(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setConfirm(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm font-bold text-muted hover:text-white">
        ← 홈
      </Link>

      {/* 덱 정보 */}
      <section className="card relative overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: s.color }} />
        {editingDeck ? (
          <DeckForm
            initial={deck}
            submitLabel="덱 정보 저장"
            onCancel={() => setEditingDeck(false)}
            onSubmit={async (fields) => {
              await api(`/api/decks/${deck.id}`, { method: 'PATCH', body: fields });
              setEditingDeck(false);
              router.refresh();
            }}
          />
        ) : (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 text-sm font-bold">
                <span className="rounded-full px-3 py-1" style={{ background: s.soft, color: s.color }}>
                  {s.emoji} {deck.subject}
                </span>
                <span className="rounded-full bg-white/5 px-3 py-1 text-muted">{deck.difficulty}</span>
                {deck.is_ai === 1 && <span className="rounded-full bg-lime/10 px-3 py-1 text-lime">✨ AI 생성</span>}
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-tight">{deck.title}</h1>
              <p className="mt-1 text-muted">
                문제 <b className="num text-white">{deck.questions.length}</b>개
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost py-2" onClick={() => setEditingDeck(true)}>
                ✏️ 수정
              </button>
              <button type="button" className="btn btn-ghost py-2" onClick={() => setConfirm({ kind: 'deck' })}>
                🗑️ 삭제
              </button>
              {deck.questions.length > 0 && (
                <Link href={`/decks/${deck.id}/play`} className="btn btn-lime px-6 text-lg">
                  ▶ 퀴즈 풀기
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      {error && <p className="font-semibold text-[#ffb3c1]">{error}</p>}

      {/* 문제 목록 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold">문제</h2>
          {!adding && (
            <button type="button" className="btn btn-pink py-2" onClick={() => setAdding(true)}>
              ＋ 문제 추가
            </button>
          )}
        </div>

        {adding && (
          <div className="card animate-fade-up border-pink/40 p-5">
            <p className="mb-4 font-extrabold text-pink">새 문제</p>
            <QuestionEditor
              submitLabel="문제 추가"
              onCancel={deck.questions.length > 0 ? () => setAdding(false) : undefined}
              onSubmit={async (q) => {
                await api(`/api/decks/${deck.id}/questions`, { method: 'POST', body: q });
                router.refresh();
              }}
            />
          </div>
        )}

        {deck.questions.length === 0 && !adding && (
          <EmptyState emoji="📝" title="문제가 없어요" desc="문제를 추가하면 퀴즈를 풀 수 있어요." />
        )}

        <ol className="space-y-3">
          {deck.questions.map((q, i) => (
            <li key={q.id} className="card p-5">
              {editingQ === q.id ? (
                <QuestionEditor
                  initial={q}
                  submitLabel="수정 저장"
                  onCancel={() => setEditingQ(null)}
                  onSubmit={async (draft) => {
                    await api(`/api/questions/${q.id}`, { method: 'PATCH', body: draft });
                    setEditingQ(null);
                    router.refresh();
                  }}
                />
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <span className="num mt-0.5 text-lg text-lime">Q{i + 1}</span>
                    <p className="flex-1 text-lg font-bold whitespace-pre-wrap">{q.question}</p>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-white/10 hover:text-white"
                        onClick={() => setEditingQ(q.id)}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-bad/20 hover:text-white"
                        onClick={() => setConfirm({ kind: 'question', id: q.id })}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {q.choices.map((c, ci) => (
                      <li
                        key={ci}
                        className={`rounded-2xl border px-4 py-2 text-sm ${
                          ci === q.answer_index
                            ? 'border-good/60 bg-good/15 font-bold text-white'
                            : 'border-white/10 text-muted'
                        }`}
                      >
                        {ci === q.answer_index ? '✓ ' : ''}
                        {c}
                      </li>
                    ))}
                  </ul>
                  {q.explanation && <p className="mt-3 text-sm text-muted">💡 {q.explanation}</p>}
                </>
              )}
            </li>
          ))}
        </ol>
      </section>

      <ConfirmModal
        open={confirm !== null}
        title={confirm?.kind === 'deck' ? '이 덱을 삭제할까요?' : '이 문제를 삭제할까요?'}
        desc={
          confirm?.kind === 'deck'
            ? '덱 안의 문제와 오답 기록도 함께 사라져요. 되돌릴 수 없어요.'
            : '이 문제의 풀이 기록도 함께 사라져요.'
        }
        busy={deleting}
        onConfirm={doDelete}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
