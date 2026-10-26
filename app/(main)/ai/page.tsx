import { AiCreator } from '@/components/AiCreator';

export const metadata = { title: 'AI로 퀴즈 만들기 · 한입퀴즈' };

export default function AiPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <AiCreator />
    </div>
  );
}
