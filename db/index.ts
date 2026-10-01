import "server-only";

import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { createPool, type Pool } from "mysql2/promise";
import * as schema from "./schema";

type Db = MySql2Database<typeof schema>;

const globalForDb = globalThis as unknown as { __lifeManagerDb?: Db };

function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill in your local MySQL connection.",
    );
  }
  const pool: Pool = createPool({ uri: url, timezone: "Z" });
  return drizzle(pool, { schema, mode: "default" });
}

// Created on first use so that `next build` does not need a database.
// Cached on globalThis so dev hot reloads reuse a single pool.
export function getDb(): Db {
  if (globalForDb.__lifeManagerDb) return globalForDb.__lifeManagerDb;
  const db = createDb();
  if (process.env.NODE_ENV !== "production") globalForDb.__lifeManagerDb = db;
  return db;
}

export { schema };
