'use client';

import { ErrorBox } from '@/components/States';

export default function MainError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-10">
      <ErrorBox message="화면을 불러오지 못했어요. DB 연결을 확인하거나 잠시 후 다시 시도해 주세요." onRetry={reset} />
    </div>
  );
}
