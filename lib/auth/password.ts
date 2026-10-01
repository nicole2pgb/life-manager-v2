import "server-only";

import bcrypt from "bcryptjs";

const COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Compared against when the email is unknown, so a failed login costs about
// the same whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", COST);

export async function verifyAgainstDummy(password: string): Promise<void> {
  await bcrypt.compare(password, DUMMY_HASH);
}
