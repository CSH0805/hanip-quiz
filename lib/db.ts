import 'server-only';
import mysql, { type Pool, type PoolConnection } from 'mysql2/promise';
import { env } from './env';

// 개발 모드의 핫 리로드나 서버리스 인스턴스 재사용 시 풀이 여러 개 생기지 않도록 globalThis에 한 번만 만든다.
const globalForDb = globalThis as unknown as { __qzPool?: Pool };

function createPool(): Pool {
  const pool = mysql.createPool({
    host: env('DB_HOST', 'localhost'),
    port: Number(env('DB_PORT', '3306')) || 3306,
    user: env('DB_USER'),
    password: env('DB_PASSWORD'),
    database: env('DB_NAME'),
    ssl: env('DB_SSL') === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
    connectionLimit: 5,
    waitForConnections: true,
    dateStrings: true,
    decimalNumbers: true,
    charset: 'utf8mb4',
  });
  // 서버 위치(Vercel은 UTC)와 상관없이 NOW()·CURDATE()·DATE()가 한국 시간 기준이 되도록 세션 시간대를 고정한다.
  pool.on('connection', (conn) => {
    conn.query("SET time_zone = '+09:00'");
  });
  return pool;
}

export const db: Pool = globalForDb.__qzPool ?? createPool();
globalForDb.__qzPool = db;

/** 여러 테이블에 함께 쓰는 작업을 하나의 트랜잭션으로 묶는다. 오류가 나면 롤백된다. */
export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
