'use client';

import confetti from 'canvas-confetti';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/fetcher';
import type { Question } from '@/lib/constants';
import { ErrorBox, Loading } from './States';

const LETTERS = ['A', 'B', 'C', 'D'];

type Props = {
  title: string;
  questions: Question[];
  mode: 'deck' | 'review';
  deckId: number | null;
  backHref: string;
};

type Saved = { score: number; total: number };

export function QuizPlayer(props: Props) {
  // 「틀린 것만 다시」를 누르면 key를 바꿔 새 라운드(review 모드)를 시작한다.
  const [round, setRound] = useState<{ n: number; questions: Question[]; mode: 'deck' | 'review'; deckId: number | null }>({
    n: 0,
    questions: props.questions,
    mode: props.mode,
    deckId: props.deckId,
  });

  return (
    <Round
      key={round.n}
      title={round.n === 0 ? props.title : `${props.title} · 틀린 것만 다시`}
      questions={round.questions}
      mode={round.mode}
      deckId={round.deckId}
      backHref={props.backHref}
      onRetryWrong={(wrong) => setRound((r) => ({ n: r.n + 1, questions: wrong, mode: 'review', deckId: null }))}
      onRestart={() => setRound((r) => ({ n: r.n + 1, questions: props.questions, mode: props.mode, deckId: props.deckId }))}
    />
  );
}

function Round({
  title,
  questions,
  mode,
  deckId,
  backHref,
  onRetryWrong,
  onRestart,
}: Props & { onRetryWrong: (wrong: Question[]) => void; onRestart: () => void }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<(number | null)[]>(() => questions.map(() => null));
  const [phase, setPhase] = useState<'playing' | 'saving' | 'result'>('playing');
  const [saved, setSaved] = useState<Saved | null>(null);
  const [saveError, setSaveError] = useState('');
  const nextRef = useRef<HTMLButtonElement>(null);

  const q = questions[index];
  const picked = chosen[index];
  const answered = picked !== null;
  const isLast = index === questions.length - 1;

  useEffect(() => {
    if (answered) nextRef.current?.focus();
  }, [answered]);

  async function save() {
    setPhase('saving');
    setSaveError('');
    try {
      const res = await api<Saved>('/api/attempts', {
        method: 'POST',
        body: {
          mode,
          deckId,
          answers: questions.map((qq, i) => ({ questionId: qq.id, chosenIndex: chosen[i] })),
        },
      });
      setSaved({ score: res.score, total: res.total });
      router.refresh(); // 상단 오답노트 배지 갱신
    } catch (err) {
      setSaveError((err as Error).message);
    }
    setPhase('result');
  }

  if (phase === 'saving') return <Loading text="채점하는 중…" emoji="🧮" />;

  if (phase === 'result') {
    const wrong = questions.filter((qq, i) => chosen[i] !== qq.answer_index);
    const correct = saved?.score ?? questions.length - wrong.length;
    const total = saved?.total ?? questions.length;
    return (
      <Result
        title={title}
        correct={correct}
        total={total}
        wrong={wrong}
        chosen={(id) => chosen[questions.findIndex((qq) => qq.id === id)]}
        saveError={saveError}
        onRetrySave={save}
        onRetryWrong={() => onRetryWrong(wrong)}
        onRestart={onRestart}
        backHref={backHref}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 상단 진행 바 */}
      <div className="flex items-center gap-4">
        <Link href={backHref} className="text-2xl text-muted hover:text-white" aria-label="그만 풀기">
          ✕
        </Link>
        <div
          className="h-4 flex-1 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={index + (answered ? 1 : 0)}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-lime to-[#7dff9a] shadow-[0_0_14px_rgba(198,255,61,0.6)] transition-all duration-500"
            style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
        <span className="num text-lg">
          <span className="text-lime">{index + 1}</span>
          <span className="text-muted">/{questions.length}</span>
        </span>
      </div>

      <p className="text-sm font-bold text-muted">{title}</p>

      <div key={q.id} className="animate-fade-up space-y-5">
        <h1 className="text-2xl leading-snug font-extrabold whitespace-pre-wrap sm:text-3xl">{q.question}</h1>

        <div className="space-y-3">
          {q.choices.map((c, i) => {
            let state: string | undefined;
            if (answered) {
              if (i === q.answer_index) state = 'correct';
              else if (i === picked) state = 'wrong';
              else state = 'dim';
            }
            return (
              <button
                key={i}
                type="button"
                className="choice"
                data-state={state}
                disabled={answered}
                onClick={() => setChosen((prev) => prev.map((v, k) => (k === index ? i : v)))}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-base font-black ${
                    state === 'correct' ? 'bg-good text-night' : state === 'wrong' ? 'bg-bad text-white' : 'bg-white/10'
                  }`}
                >
                  {state === 'correct' ? '✓' : state === 'wrong' ? '✕' : LETTERS[i]}
                </span>
                <span>{c}</span>
              </button>
            );
          })}
        </div>

        {answered && (
          <div
            className={`animate-fade-up rounded-3xl border-2 p-5 ${
              picked === q.answer_index ? 'border-good/50 bg-good/10' : 'border-bad/50 bg-bad/10'
            }`}
            aria-live="polite"
          >
            <p className={`text-xl font-black ${picked === q.answer_index ? 'text-good' : 'text-bad'}`}>
              {picked === q.answer_index ? '🎉 정답!' : '😣 아쉬워요'}
            </p>
            {picked !== q.answer_index && (
              <p className="mt-1 font-semibold">
                정답: {LETTERS[q.answer_index]}. {q.choices[q.answer_index]}
              </p>
            )}
            {q.explanation && <p className="mt-2 text-white/80">💡 {q.explanation}</p>}
            <button
              ref={nextRef}
              type="button"
              className="btn btn-lime mt-4 w-full text-lg"
              onClick={() => (isLast ? save() : setIndex(index + 1))}
            >
              {isLast ? '결과 보기 🏁' : '다음 →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Result({
  title,
  correct,
  total,
  wrong,
  chosen,
  saveError,
  onRetrySave,
  onRetryWrong,
  onRestart,
  backHref,
}: {
  title: string;
  correct: number;
  total: number;
  wrong: Question[];
  chosen: (id: number) => number | null;
  saveError: string;
  onRetrySave: () => void;
  onRetryWrong: () => void;
  onRestart: () => void;
  backHref: string;
}) {
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const [shown, setShown] = useState(0);

  // 점수 카운트업 + 80점 이상이면 컨페티
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(score * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (score >= 80) {
      timer = setTimeout(() => {
        const colors = ['#c6ff3d', '#ff3d9a', '#3dd6ff', '#ffffff'];
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors });
        setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0 }, colors }), 250);
        setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1 }, colors }), 400);
      }, duration - 200);
    }
    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };
  }, [score]);

  const message =
    score === 100 ? '완벽해요! 🏆' : score >= 80 ? '아주 잘했어요! 🔥' : score >= 50 ? '좋아요, 조금만 더! 💪' : '틀린 문제를 다시 보면 금방 늘어요 🌱';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="card animate-fade-up p-8 text-center">
        <p className="text-sm font-bold text-muted">{title}</p>
        <p className="num mt-2 text-8xl text-lime drop-shadow-[0_0_24px_rgba(198,255,61,0.45)]" aria-live="polite">
          {shown}
          <span className="text-4xl">점</span>
        </p>
        <p className="mt-2 text-lg">
          <b className="num text-good">{correct}</b> / <span className="num">{total}</span> 정답
        </p>
        <p className="mt-3 text-xl font-extrabold">{message}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {wrong.length > 0 ? (
            <button type="button" className="btn btn-pink sm:col-span-3" onClick={onRetryWrong}>
              🔁 틀린 것만 다시 ({wrong.length})
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost" onClick={onRestart}>
            처음부터
          </button>
          <Link href="/wrong-notes" className="btn btn-ghost">
            오답노트
          </Link>
          <Link href={backHref} className="btn btn-lime">
            돌아가기
          </Link>
        </div>
      </section>

      {saveError && <ErrorBox message={`기록 저장 실패: ${saveError}`} onRetry={onRetrySave} />}

      {wrong.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold">틀린 문제</h2>
          {wrong.map((q) => {
            const c = chosen(q.id);
            return (
              <div key={q.id} className="card animate-fade-up p-5">
                <p className="font-bold whitespace-pre-wrap">{q.question}</p>
                <p className="mt-2 text-sm text-[#ffb3c1]">✕ 내 답: {c == null ? '-' : q.choices[c]}</p>
                <p className="text-sm text-good">✓ 정답: {q.choices[q.answer_index]}</p>
                {q.explanation && <p className="mt-2 text-sm text-muted">💡 {q.explanation}</p>}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
