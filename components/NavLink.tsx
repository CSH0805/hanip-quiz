'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition hover:bg-white/10 ${
        active ? 'bg-white/10 text-white' : 'text-muted'
      }`}
    >
      {children}
    </Link>
  );
}
