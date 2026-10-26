// JWT 서명·검증 (jose). proxy.ts에서도 쓰므로 DB나 Node 전용 모듈을 import하지 않는다.
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'hq_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7일

export type SessionPayload = { uid: number; nick: string };

function secretKey(): Uint8Array {
  const secret = (process.env.SESSION_SECRET ?? '').trim();
  if (secret.length < 32) {
    throw new Error('SESSION_SECRET 환경 변수는 32자 이상이어야 합니다.');
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    if (typeof payload.uid !== 'number' || typeof payload.nick !== 'string') return null;
    return { uid: payload.uid, nick: payload.nick };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}
