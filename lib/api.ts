import 'server-only';
import { NextResponse } from 'next/server';
import { getSessionUser } from './auth';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** API 라우트 공통 래퍼: 로그인 확인 + 에러를 { error } JSON으로 변환 */
export function withUser<Ctx>(
  handler: (req: Request, userId: number, ctx: Ctx) => Promise<Response>,
) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      const user = await getSessionUser();
      if (!user) return jsonError(401, '로그인이 필요해요.');
      return await handler(req, user.uid, ctx);
    } catch (err) {
      return handleError(err);
    }
  };
}

export function handleError(err: unknown) {
  if (err instanceof HttpError) return jsonError(err.status, err.message);
  console.error(err);
  return jsonError(500, '서버에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    // 아래에서 처리
  }
  throw new HttpError(400, '요청 형식이 올바르지 않아요.');
}

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, '잘못된 ID예요.');
  return id;
}
