import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from './lib/session';

// 로그인 확인만 한다: DB 조회 없이 쿠키의 JWT를 jose로 검증.
// API 라우트는 각자 401을 돌려주므로 여기서는 페이지 요청만 다룬다.
const PUBLIC_PATHS = ['/login', '/signup'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (session && isPublic) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
};
