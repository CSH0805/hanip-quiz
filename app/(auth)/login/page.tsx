import { AuthForm } from '@/components/AuthForm';

export const metadata = { title: '로그인 · 한입퀴즈' };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
