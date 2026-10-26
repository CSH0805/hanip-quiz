import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="animate-float text-7xl">🫥</div>
      <h1 className="num text-5xl text-lime">404</h1>
      <p className="text-muted">찾는 페이지가 없어요. 덱이 삭제되었을 수도 있어요.</p>
      <Link href="/" className="btn btn-lime">
        홈으로
      </Link>
    </main>
  );
}
