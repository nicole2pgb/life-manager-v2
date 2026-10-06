import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { and, eq, gt, lte, type SQL } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { SESSION_COOKIE } from "./constants";
import { generateToken, hashToken } from "./token";

const { sessions, users } = schema;

const SESSION_DAYS = 30;
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;

export type CurrentUser = { id: number; name: string; email: string };

// Deletes the sessions matching `scope` that have already expired.
async function deleteExpiredSessions(scope: SQL): Promise<void> {
  await getDb().delete(sessions).where(and(scope, lte(sessions.expiresAt, new Date())));
}

async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_SECONDS,
  });
}

// Starts a new session for the user. Any session presented with the current
// request is deleted first, so a login never reuses an old token.
export async function createSession(userId: number): Promise<void> {
  const jar = await cookies();
  const old = jar.get(SESSION_COOKIE)?.value;
  const db = getDb();
  if (old) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(old)));
  // Housekeeping: drop this user's expired sessions.
  await deleteExpiredSessions(eq(sessions.userId, userId));

  const token = generateToken();
  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000),
  });
  await setSessionCookie(token);
}

export async function deleteSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  jar.delete(SESSION_COOKIE);
}

// The only source of the current user's id. Returns null for a missing,
// unknown or expired session. Read-only (safe during rendering); expired
// rows are removed here when they are found.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const db = getDb();
  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (row) return row;

  await deleteExpiredSessions(eq(sessions.tokenHash, tokenHash));
  return null;
});
