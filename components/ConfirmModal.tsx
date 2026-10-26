'use client';

import { useEffect } from 'react';

export function ConfirmModal({
  open,
  title,
  desc,
  confirmLabel = '삭제',
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  desc?: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="card animate-fade-up w-full max-w-sm bg-indigo-deep p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 text-5xl">🗑️</div>
        <h2 id="confirm-title" className="text-xl font-extrabold">
          {title}
        </h2>
        {desc && <p className="mt-2 text-muted">{desc}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            취소
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={busy}>
            {busy ? '삭제 중…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
