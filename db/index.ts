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
  // `timezone: "Z"` only controls how the driver converts JS dates. Pin the
  // MySQL session to UTC too, otherwise TIMESTAMP columns (session expiry)
  // are shifted by the server's offset.
  pool.on("connection", (connection) => {
    connection.query("SET time_zone = '+00:00'");
  });
  return drizzle(pool, { schema, mode: "default" });
}

// Created on first use so that `next build` does not need a database.
// Cached on globalThis (in every environment) so hot reloads and production
// requests reuse a single pool.
export function getDb(): Db {
  if (globalForDb.__lifeManagerDb) return globalForDb.__lifeManagerDb;
  const db = createDb();
  globalForDb.__lifeManagerDb = db;
  return db;
}

export { schema };
