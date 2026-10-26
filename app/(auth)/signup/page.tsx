import { AuthForm } from '@/components/AuthForm';

export const metadata = { title: '회원가입 · 한입퀴즈' };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
