'use client';

import { useRouter } from 'next/navigation';
import { api } from '@/lib/fetcher';
import { DeckForm } from './DeckForm';

export function NewDeck() {
  const router = useRouter();
  return (
    <DeckForm
      submitLabel="덱 만들고 문제 추가하기 →"
      onCancel={() => router.back()}
      onSubmit={async (fields) => {
        const { id } = await api<{ id: number }>('/api/decks', { method: 'POST', body: fields });
        router.push(`/decks/${id}`);
        router.refresh();
      }}
    />
  );
}
