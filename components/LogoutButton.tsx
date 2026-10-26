'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className="rounded-xl px-3 py-2 text-sm font-bold text-muted transition hover:bg-white/10 hover:text-white disabled:opacity-50"
      onClick={async () => {
        setBusy(true);
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
        router.replace('/login');
        router.refresh();
      }}
    >
      로그아웃
    </button>
  );
}
