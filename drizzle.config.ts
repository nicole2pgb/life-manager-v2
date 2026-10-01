import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

// `generate` only reads the schema; every other command needs a connection.
const needsConnection = !process.argv.includes("generate");
const url = process.env.DATABASE_URL;

if (needsConnection && !url) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill in your local MySQL connection.",
  );
}

export default defineConfig({
  dialect: "mysql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: url ?? "",
  },
});
