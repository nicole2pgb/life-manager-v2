import "server-only";

import { eq } from "drizzle-orm";
import { getDb, schema } from "./index";

const { users } = schema;

export async function findUserByEmail(email: string) {
  const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<{ ok: true; id: number } | { ok: false; reason: "email_taken" }> {
  try {
    const [result] = await getDb().insert(users).values(input);
    return { ok: true, id: result.insertId };
  } catch (error) {
    if (isDuplicateKeyError(error)) return { ok: false, reason: "email_taken" };
    throw error;
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  // drizzle may wrap the driver error, so check the cause chain too.
  let current: unknown = error;
  for (let i = 0; i < 3 && current; i++) {
    if ((current as { code?: string }).code === "ER_DUP_ENTRY") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
