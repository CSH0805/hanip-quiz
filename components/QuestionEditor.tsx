'use client';

import { useState } from 'react';
import type { DraftQuestion } from '@/lib/constants';

const EMPTY: DraftQuestion = { question: '', choices: ['', '', '', ''], answer_index: -1, explanation: '' };
const LETTERS = ['A', 'B', 'C', 'D'];

export function QuestionEditor({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: DraftQuestion;
  submitLabel: string;
  onSubmit: (q: DraftQuestion) => Promise<void>;
  onCancel?: () => void;
}) {
  const [q, setQ] = useState<DraftQuestion>(initial ?? EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ready = q.question.trim() && q.choices.every((c) => c.trim()) && q.answer_index >= 0;

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ready) return;
        setBusy(true);
        setError('');
        try {
          await onSubmit(q);
          if (!initial) setQ(EMPTY);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <label className="label" htmlFor="q-text">
          문제
        </label>
        <textarea
          id="q-text"
          className="input min-h-20 resize-y"
          maxLength={1000}
          value={q.question}
          onChange={(e) => setQ({ ...q, question: e.target.value })}
          placeholder="예: 광합성이 일어나는 세포 소기관은?"
          required
        />
      </div>

      <fieldset>
        <legend className="label">보기 (정답 옆 동그라미를 눌러 주세요)</legend>
        <div className="space-y-2">
          {q.choices.map((c, i) => {
            const isAnswer = q.answer_index === i;
            return (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={isAnswer}
                  aria-label={`보기 ${LETTERS[i]}를 정답으로`}
                  onClick={() => setQ({ ...q, answer_index: i })}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black transition active:scale-90 ${
                    isAnswer
                      ? 'border-good bg-good text-night shadow-[0_0_0_4px_rgba(52,224,122,0.2)]'
                      : 'border-white/20 text-muted hover:border-white/40'
                  }`}
                >
                  {isAnswer ? '✓' : LETTERS[i]}
                </button>
                <input
                  className={`input ${isAnswer ? 'border-good/60' : ''}`}
                  maxLength={200}
                  value={c}
                  onChange={(e) => {
                    const choices = [...q.choices];
                    choices[i] = e.target.value;
                    setQ({ ...q, choices });
                  }}
                  placeholder={`보기 ${LETTERS[i]}`}
                  required
                />
              </div>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="q-exp">
          해설 <span className="font-normal">(선택)</span>
        </label>
        <textarea
          id="q-exp"
          className="input min-h-16 resize-y"
          maxLength={2000}
          value={q.explanation}
          onChange={(e) => setQ({ ...q, explanation: e.target.value })}
          placeholder="정답인 이유를 적어 두면 오답노트에서 도움이 돼요"
        />
      </div>

      {error && <p className="font-semibold text-[#ffb3c1]">{error}</p>}
      {!ready && q.question.trim() && q.answer_index < 0 && (
        <p className="text-sm text-muted">👆 정답 보기를 골라 주세요</p>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            취소
          </button>
        )}
        <button type="submit" className="btn btn-lime flex-1" disabled={busy || !ready}>
          {busy ? '저장 중…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
