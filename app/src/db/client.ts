import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

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

  return drizzle(postgres(url), { schema });
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
