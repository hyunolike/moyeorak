import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

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

const client = postgres(url);

export const db = drizzle(client, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
