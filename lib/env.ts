// 환경 변수는 읽을 때 항상 trim() 한다 (Vercel 대시보드에 붙여넣을 때 공백·개행이 섞이는 경우 대비).
export function env(key: string, fallback = ''): string {
  return (process.env[key] ?? fallback).trim();
}
