import { Pool, QueryResult, QueryResultRow } from "pg";

let pool: Pool | null = null;

/**
 * Neon PostgreSQL 연결 풀 인스턴스를 반환합니다.
 * 환경 변수가 제공되지 않은 빌드 타임이나 초기화 시점에 throw하지 않고 안전하게 처리합니다.
 */
export function getDbPool(): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  return pool;
}

/**
 * 안전한 쿼리 실행 헬퍼
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const p = getDbPool();
  if (!p) {
    // DB 연결 주소가 없는 환경(빌드 타임 등)에서는 안전하게 빈 결과 반환
    return {
      rows: [],
      command: "",
      rowCount: 0,
      oid: 0,
      fields: [],
    };
  }

  return p.query<T>(text, params);
}
