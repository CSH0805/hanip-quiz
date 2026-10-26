import bcrypt from 'bcryptjs';
import { handleError, HttpError, readJson } from '@/lib/api';
import { loginResponse } from '@/lib/auth';
import { createUser } from '@/lib/queries';
import { str } from '@/lib/validate';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const email = str(body.email, '이메일', { max: 255 }).toLowerCase();
    if (!EMAIL_RE.test(email)) throw new HttpError(400, '이메일 형식이 올바르지 않아요.');
    const nickname = str(body.nickname, '닉네임', { min: 1, max: 20 });
    if (typeof body.password !== 'string' || body.password.length < 6 || body.password.length > 72) {
      throw new HttpError(400, '비밀번호는 6~72자로 입력해 주세요.');
    }
    const hash = await bcrypt.hash(body.password, 10);
    const id = await createUser(email, hash, nickname);
    return loginResponse({ id, nickname });
  } catch (err) {
    return handleError(err);
  }
}
