'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/fetcher';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState<null | 'form' | 'demo'>(null);
  const [error, setError] = useState('');

  async function submit(path: string, body?: unknown, kind: 'form' | 'demo' = 'form') {
    setBusy(kind);
    setError('');
    try {
      await api(path, { method: 'POST', body });
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  }

  const isSignup = mode === 'signup';

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <div className="animate-float mb-3 inline-block text-7xl">🍙</div>
        <h1 className="text-4xl font-black tracking-tight">
          한입<span className="text-lime">퀴즈</span>
        </h1>
        <p className="mt-2 text-muted">공부한 내용, AI가 한입 크기 퀴즈로 만들어 줄게요</p>
      </div>

      <form
        className="card space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit(isSignup ? '/api/auth/signup' : '/api/auth/login', { email, password, nickname });
        }}
      >
        <h2 className="text-xl font-extrabold">{isSignup ? '회원가입' : '로그인'}</h2>
        {isSignup && (
          <div>
            <label className="label" htmlFor="nickname">
              닉네임
            </label>
            <input
              id="nickname"
              className="input"
              maxLength={20}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="퀴즈왕"
              required
            />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">
            이메일
          </label>
          <input
            id="email"
            type="email"
            className="input"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="me@school.kr"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            비밀번호 {isSignup && <span className="font-normal">(6자 이상)</span>}
          </label>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            minLength={isSignup ? 6 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p role="alert" className="rounded-2xl bg-bad/15 px-4 py-3 text-sm font-semibold text-[#ffb3c1]">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-lime w-full text-lg" disabled={busy !== null}>
          {busy === 'form' ? '잠시만요…' : isSignup ? '가입하고 시작하기' : '로그인'}
        </button>

        {!isSignup && (
          <>
            <div className="flex items-center gap-3 text-xs text-white/40">
              <span className="h-px flex-1 bg-white/10" /> 또는 <span className="h-px flex-1 bg-white/10" />
            </div>
            <button
              type="button"
              className="btn btn-pink w-full text-lg"
              disabled={busy !== null}
              onClick={() => submit('/api/auth/demo', undefined, 'demo')}
            >
              {busy === 'demo' ? '입장하는 중…' : '🎮 체험 계정으로 둘러보기'}
            </button>
          </>
        )}
      </form>

      <p className="mt-6 text-center text-muted">
        {isSignup ? '이미 계정이 있나요? ' : '처음이신가요? '}
        <Link href={isSignup ? '/login' : '/signup'} className="font-bold text-lime underline-offset-4 hover:underline">
          {isSignup ? '로그인' : '회원가입'}
        </Link>
      </p>
    </main>
  );
}
