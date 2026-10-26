'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/fetcher';
import {
  AI_SOURCE_MAX,
  DIFFICULTIES,
  SUBJECTS,
  SUBJECT_STYLE,
  type Difficulty,
  type DraftQuestion,
  type Subject,
} from '@/lib/constants';
import { ChipGroup } from './Chips';

type Preview = {
  title: string;
  subject: Subject;
  difficulty: Difficulty;
  questions: DraftQuestion[];
  requested: number;
  source_text: string | null;
};

const TOPIC_EXAMPLES: Partial<Record<Subject, string[]>> = {
  과학: ['광합성', '뉴턴의 운동 법칙', '산과 염기'],
  정보: ['TCP와 UDP', '정렬 알고리즘', '이진수'],
  사회: ['조선 후기 실학', '수요와 공급', '민주주의의 원리'],
  영어: ['가정법 과거', '관계대명사', '수능 빈출 숙어'],
  수학: ['이차방정식', '삼각함수', '확률의 기본'],
  국어: ['품사의 종류', '시의 표현 기법', '맞춤법 헷갈리는 말'],
  기타: ['세계의 수도', '경제 기초 상식', '올림픽 역사'],
};

const BAKING_LINES = ['문제 굽는 중…', '보기 반죽하는 중…', '오답 함정 숨기는 중…', '해설 토핑 올리는 중…'];
const LETTERS = ['A', 'B', 'C', 'D'];

export function AiCreator() {
  const router = useRouter();
  const [method, setMethod] = useState<'text' | 'topic'>('topic');
  const [sourceText, setSourceText] = useState('');
  const [subject, setSubject] = useState<Subject>('과학');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState<5 | 10>(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('보통');

  const [phase, setPhase] = useState<'form' | 'loading' | 'preview' | 'saving'>('form');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [line, setLine] = useState(0);

  useEffect(() => {
    if (phase !== 'loading') return;
    const t = setInterval(() => setLine((l) => (l + 1) % BAKING_LINES.length), 1600);
    return () => clearInterval(t);
  }, [phase]);

  const canGenerate =
    method === 'text' ? sourceText.trim().length >= 30 && sourceText.length <= AI_SOURCE_MAX : topic.trim().length > 0;

  async function generate() {
    setPhase('loading');
    setError('');
    setLine(0);
    try {
      const res = await api<Preview>('/api/ai/quiz', {
        method: 'POST',
        body: method === 'text' ? { method, sourceText, count, difficulty } : { method, subject, topic, count, difficulty },
      });
      setPreview(res);
      setExcluded(new Set());
      setPhase('preview');
    } catch (err) {
      setError((err as Error).message);
      setPhase('form');
    }
  }

  async function save() {
    if (!preview) return;
    const questions = preview.questions.filter((_, i) => !excluded.has(i));
    setPhase('saving');
    setError('');
    try {
      const { id } = await api<{ id: number }>('/api/decks', {
        method: 'POST',
        body: {
          title: preview.title,
          subject: preview.subject,
          difficulty: preview.difficulty,
          source_text: preview.source_text,
          is_ai: true,
          questions,
        },
      });
      router.push(`/decks/${id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setPhase('preview');
    }
  }

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center" role="status" aria-live="polite">
        <div className="relative">
          <div className="animate-float text-8xl">🍳</div>
          <div className="absolute -top-2 -right-4 animate-ping text-3xl">✨</div>
        </div>
        <p className="text-2xl font-black">{BAKING_LINES[line]}</p>
        <div className="h-3 w-64 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/3 animate-[shake_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-pink to-lime" />
        </div>
        <p className="text-muted">AI가 {count}문제를 만들고 있어요. 10초 정도 걸려요</p>
      </div>
    );
  }

  if ((phase === 'preview' || phase === 'saving') && preview) {
    const keep = preview.questions.length - excluded.size;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button type="button" className="text-sm font-bold text-muted hover:text-white" onClick={() => setPhase('form')}>
            ← 다시 만들기
          </button>
        </div>
        <section className="card space-y-5 p-6">
          <div>
            <label className="label" htmlFor="ai-title">
              덱 제목
            </label>
            <input
              id="ai-title"
              className="input text-xl font-extrabold"
              maxLength={100}
              value={preview.title}
              onChange={(e) => setPreview({ ...preview, title: e.target.value })}
            />
          </div>
          <div>
            <span className="label">과목</span>
            <ChipGroup
              label="과목"
              options={SUBJECTS}
              value={preview.subject}
              onChange={(s) => setPreview({ ...preview, subject: s })}
              render={(s) => `${SUBJECT_STYLE[s].emoji} ${s}`}
            />
          </div>
          {preview.questions.length < preview.requested && (
            <p className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-muted">
              ⚠️ 요청한 {preview.requested}문제 중 형식이 올바른 {preview.questions.length}문제만 가져왔어요.
            </p>
          )}
        </section>

        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-extrabold">미리보기</h2>
          <p className="text-sm text-muted">마음에 안 드는 문제는 눌러서 빼세요</p>
        </div>

        <ol className="space-y-3">
          {preview.questions.map((q, i) => {
            const off = excluded.has(i);
            return (
              <li key={i}>
                <button
                  type="button"
                  aria-pressed={!off}
                  onClick={() =>
                    setExcluded((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    })
                  }
                  className={`card block w-full p-5 text-left transition active:scale-[0.99] ${
                    off ? 'opacity-40 grayscale' : 'hover:border-lime/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="num text-lg text-lime">Q{i + 1}</span>
                    <p className={`flex-1 font-bold ${off ? 'line-through' : ''}`}>{q.question}</p>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        off ? 'bg-white/10 text-muted' : 'bg-lime/15 text-lime'
                      }`}
                    >
                      {off ? '제외됨' : '포함'}
                    </span>
                  </div>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {q.choices.map((c, ci) => (
                      <li
                        key={ci}
                        className={`rounded-xl border px-3 py-2 text-sm ${
                          ci === q.answer_index ? 'border-good/60 bg-good/10 font-bold' : 'border-white/10 text-muted'
                        }`}
                      >
                        {LETTERS[ci]}. {c}
                      </li>
                    ))}
                  </ul>
                  {q.explanation && <p className="mt-3 text-sm text-muted">💡 {q.explanation}</p>}
                </button>
              </li>
            );
          })}
        </ol>

        {error && <p className="font-semibold text-[#ffb3c1]">{error}</p>}

        <div className="sticky bottom-4 z-10">
          <button
            type="button"
            className="btn btn-lime w-full py-4 text-lg"
            disabled={keep === 0 || phase === 'saving' || !preview.title.trim()}
            onClick={save}
          >
            {phase === 'saving' ? '저장 중…' : keep === 0 ? '최소 1문제는 남겨 주세요' : `💾 ${keep}문제 덱으로 저장`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">✨ AI로 퀴즈 만들기</h1>
        <p className="mt-1 text-muted">공부한 내용을 붙여넣거나, 과목과 주제만 골라 주세요</p>
      </div>

      {error && (
        <div role="alert" className="animate-fade-up rounded-3xl border-2 border-pink/50 bg-pink/10 p-5">
          <p className="flex items-center gap-2 text-lg font-extrabold">
            <span className="text-3xl">😴</span> {error}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost py-2" onClick={generate} disabled={!canGenerate}>
              다시 시도
            </button>
            <Link href="/decks/new" className="btn btn-pink py-2">
              ✍️ 직접 문제 만들기
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 rounded-3xl bg-white/5 p-1.5" role="tablist">
        {(
          [
            ['topic', '🎯 주제 한 줄'],
            ['text', '📋 공부 내용 붙여넣기'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={method === m}
            onClick={() => setMethod(m)}
            className={`rounded-2xl px-3 py-3 font-bold transition ${
              method === m ? 'bg-lime text-night shadow-[0_3px_0_0_var(--color-lime-dark)]' : 'text-muted hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="card space-y-5 p-6">
        {method === 'text' ? (
          <div>
            <label className="label" htmlFor="ai-source">
              공부 내용 <span className="font-normal">(이 내용 안에서만 문제가 나와요)</span>
            </label>
            <textarea
              id="ai-source"
              className="input min-h-56 resize-y leading-relaxed"
              maxLength={AI_SOURCE_MAX}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="교과서·필기·요약 노트를 붙여넣어 주세요 (30자 이상)"
            />
            <p className={`mt-1 text-right text-sm num ${sourceText.length >= AI_SOURCE_MAX ? 'text-pink' : 'text-muted'}`}>
              {sourceText.length.toLocaleString()} / {AI_SOURCE_MAX.toLocaleString()}
            </p>
          </div>
        ) : (
          <>
            <div>
              <span className="label">과목</span>
              <ChipGroup
                label="과목"
                options={SUBJECTS}
                value={subject}
                onChange={setSubject}
                render={(s) => `${SUBJECT_STYLE[s].emoji} ${s}`}
              />
            </div>
            <div>
              <label className="label" htmlFor="ai-topic">
                주제
              </label>
              <input
                id="ai-topic"
                className="input text-lg"
                maxLength={60}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: 광합성, TCP와 UDP"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canGenerate) generate();
                }}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {(TOPIC_EXAMPLES[subject] ?? []).map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    className="rounded-full bg-white/5 px-3 py-1 text-sm text-muted hover:bg-white/10 hover:text-white"
                    onClick={() => setTopic(ex)}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <span className="label">문제 수</span>
            <ChipGroup label="문제 수" options={[5, 10] as const} value={count} onChange={setCount} render={(n) => `${n}문제`} />
          </div>
          <div>
            <span className="label">난이도</span>
            <ChipGroup label="난이도" options={DIFFICULTIES} value={difficulty} onChange={setDifficulty} />
          </div>
        </div>
      </section>

      <button type="button" className="btn btn-pink w-full py-4 text-xl" disabled={!canGenerate} onClick={generate}>
        ✨ 퀴즈 만들기
      </button>
    </div>
  );
}
