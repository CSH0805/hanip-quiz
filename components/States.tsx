import Link from 'next/link';

export function EmptyState({
  emoji,
  title,
  desc,
  action,
}: {
  emoji: string;
  title: string;
  desc?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="card animate-fade-up flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="animate-float text-6xl">{emoji}</div>
      <p className="text-xl font-extrabold">{title}</p>
      {desc && <p className="max-w-sm text-muted">{desc}</p>}
      {action && (
        <Link href={action.href} className="btn btn-lime mt-2">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function Loading({ text = '불러오는 중…', emoji = '🍙' }: { text?: string; emoji?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20" role="status" aria-live="polite">
      <div className="animate-float text-6xl">{emoji}</div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-3 w-3 animate-bounce rounded-full bg-lime"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="font-bold text-muted">{text}</p>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="animate-fade-up flex flex-col items-start gap-3 rounded-3xl border-2 border-pink/50 bg-pink/10 p-5 sm:flex-row sm:items-center"
    >
      <span className="text-3xl">😵‍💫</span>
      <p className="flex-1 font-semibold">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-ghost py-2" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  );
}
