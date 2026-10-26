import Link from 'next/link';
import { requirePageUser } from '@/lib/auth';
import { countWrongNotes } from '@/lib/queries';
import { LogoutButton } from '@/components/LogoutButton';
import { NavLink } from '@/components/NavLink';

export const runtime = 'nodejs';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  const wrongCount = await countWrongNotes(user.uid);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-night/70 backdrop-blur-md">
        <nav className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-3">
          <Link href="/" className="mr-auto flex items-center gap-1.5 text-xl font-black tracking-tight">
            <span className="text-2xl">🍙</span>
            <span className="hidden sm:inline">
              한입<span className="text-lime">퀴즈</span>
            </span>
          </Link>
          <NavLink href="/wrong-notes">
            <span>오답노트</span>
            {wrongCount > 0 && (
              <span className="num min-w-6 rounded-full bg-pink px-1.5 py-0.5 text-center text-xs text-white shadow-[0_0_12px_rgba(255,61,154,0.6)]">
                {wrongCount > 99 ? '99+' : wrongCount}
              </span>
            )}
          </NavLink>
          <NavLink href="/stats">통계</NavLink>
          <LogoutButton />
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-20">
        <p className="sr-only">{user.nick}님으로 로그인됨</p>
        {children}
      </main>
    </>
  );
}
