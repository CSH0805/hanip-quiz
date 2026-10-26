'use client';

import { useState } from 'react';
import { DIFFICULTIES, SUBJECTS, SUBJECT_STYLE, type Difficulty, type Subject } from '@/lib/constants';
import { ChipGroup } from './Chips';

export type DeckFields = { title: string; subject: Subject; difficulty: Difficulty };

export function DeckForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: DeckFields;
  submitLabel: string;
  onSubmit: (fields: DeckFields) => Promise<void>;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [subject, setSubject] = useState<Subject>(initial?.subject ?? '기타');
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? '보통');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          await onSubmit({ title, subject, difficulty });
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <label className="label" htmlFor="deck-title">
          덱 제목
        </label>
        <input
          id="deck-title"
          className="input text-lg font-bold"
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 세포 분열 핵심 정리"
          required
        />
      </div>
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
        <span className="label">난이도</span>
        <ChipGroup label="난이도" options={DIFFICULTIES} value={difficulty} onChange={setDifficulty} />
      </div>
      {error && <p className="font-semibold text-[#ffb3c1]">{error}</p>}
      <div className="flex gap-3">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
            취소
          </button>
        )}
        <button type="submit" className="btn btn-lime flex-1" disabled={busy || !title.trim()}>
          {busy ? '저장 중…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
