// 클라이언트에서 API를 부를 때 쓰는 작은 헬퍼 (항상 상대 경로)
export async function api<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init?.method ?? (init?.body ? 'POST' : 'GET'),
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new Error('네트워크에 연결할 수 없어요.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 세션 만료: 클라이언트 상태를 모두 비우도록 전체 새로고침으로 이동 (로그인 실패 401은 제외)
    if (res.status === 401 && !path.startsWith('/api/auth/') && typeof window !== 'undefined') {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/login';
    }
    throw new Error((data as { error?: string }).error ?? '요청을 처리하지 못했어요.');
  }
  return data as T;
}
