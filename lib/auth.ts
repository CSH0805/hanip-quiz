import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, signSession, sessionCookieOptions, verifySession, type SessionPayload } from './session';

/** 현재 로그인한 사용자 (없으면 null) */
export async function getSessionUser(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** 페이지용: 로그인 안 했으면 /login 으로 보낸다 */
export async function requirePageUser(): Promise<SessionPayload> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

/** 로그인 응답: JWT를 httpOnly 쿠키에 담는다 */
export async function loginResponse(user: { id: number; nickname: string }) {
  const token = await signSession({ uid: user.id, nick: user.nickname });
  const res = NextResponse.json({ ok: true, nickname: user.nickname });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
