// DB 생성 + 스키마 적용 스크립트
// 사용: npm run db:init (로컬) / npm run db:init:cloud (TiDB Cloud 등)
import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';

const env = (key, fallback = '') => (process.env[key] ?? fallback).trim();

const dbName = env('DB_NAME');
if (!dbName || !/^[A-Za-z0-9_]+$/.test(dbName)) {
  console.error('DB_NAME 환경 변수가 없거나 올바르지 않습니다.');
  process.exit(1);
}

const conn = await mysql.createConnection({
  host: env('DB_HOST', 'localhost'),
  port: Number(env('DB_PORT', '3306')) || 3306,
  user: env('DB_USER'),
  password: env('DB_PASSWORD'),
  ssl: env('DB_SSL') === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
});

try {
  // DB 이름은 플레이스홀더로 바인딩할 수 없어 위에서 정규식으로 검증한 뒤 식별자로 사용한다.
  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await conn.query(`USE \`${dbName}\``);

  const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  const statements = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await conn.query(stmt);
  }
  console.log(`✅ ${dbName} 데이터베이스에 테이블 ${statements.length}개 준비 완료`);
} catch (err) {
  console.error('❌ DB 초기화 실패:', err.message);
  process.exitCode = 1;
} finally {
  await conn.end();
}
