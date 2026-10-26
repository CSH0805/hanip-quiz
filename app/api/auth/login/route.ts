import bcrypt from 'bcryptjs';
import { handleError, HttpError, readJson } from '@/lib/api';
import { loginResponse } from '@/lib/auth';
import { findUserByEmail } from '@/lib/queries';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) throw new HttpError(400, '이메일과 비밀번호를 입력해 주세요.');

    const user = await findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new HttpError(401, '이메일 또는 비밀번호가 맞지 않아요.');
    }
    return loginResponse(user);
  } catch (err) {
    return handleError(err);
  }
}
