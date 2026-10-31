import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

/**
 * Neon 풀러(PgBouncer 트랜잭션 모드)에서 쓰는 연결 옵션.
 * - prepare: false — 트랜잭션 모드는 이름 있는 prepared statement를 세션 사이에 유지하지 못한다.
 * - connect_timeout: Neon이 잠에서 깨는 시간을 넉넉히 덮는다.
 */
export function postgresOptions(): {
  prepare: false;
  max: number;
  idle_timeout: number;
  connect_timeout: number;
} {
  return {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  };
}

function createDb() {
  const url =
    process.env.NODE_ENV === "test"
      ? process.env.DATABASE_URL_TEST
      : process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      process.env.NODE_ENV === "test"
        ? "DATABASE_URL_TEST is not set"
        : "DATABASE_URL is not set",
    );
  }

  return drizzle(postgres(url, postgresOptions()), { schema });
}

export type Db = ReturnType<typeof createDb>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

let instance: Db | undefined;

/** import 시점이 아니라 첫 사용 시점에 연결을 만든다. (URL 없이도 next build가 되도록) */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    instance ??= createDb();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
