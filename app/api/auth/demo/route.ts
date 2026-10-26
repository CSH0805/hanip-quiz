import { handleError, HttpError } from '@/lib/api';
import { loginResponse } from '@/lib/auth';
import { findUserByEmail } from '@/lib/queries';

export const runtime = 'nodejs';

const DEMO_EMAIL = 'demo@hanipquiz.com';

// 「체험 계정으로 둘러보기」: 비밀번호 입력 없이 시드로 만든 데모 계정으로 로그인
export async function POST() {
  try {
    const user = await findUserByEmail(DEMO_EMAIL);
    if (!user) throw new HttpError(404, '체험 계정이 아직 준비되지 않았어요. (npm run db:seed 필요)');
    return loginResponse(user);
  } catch (err) {
    return handleError(err);
  }
}
