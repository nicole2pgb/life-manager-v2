"use server";

import { redirect } from "next/navigation";
import { findUserByEmail } from "@/db/users";
import { verifyAgainstDummy, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { normalizeEmail } from "@/lib/auth/validation";
import type { AuthFormState } from "@/lib/auth/form-state";

const text = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};

export async function loginAction(_prev: AuthFormState, data: FormData): Promise<AuthFormState> {
  const email = text(data, "email");
  const password = text(data, "password");
  const values = { email };

  const errors: NonNullable<AuthFormState>["errors"] = {};
  if (!email.trim()) errors.email = "Email is required.";
  if (!password) errors.password = "Password is required.";
  if (Object.keys(errors).length > 0) return { errors, values };

  const user = await findUserByEmail(normalizeEmail(email));
  let valid = false;
  if (user) valid = await verifyPassword(password, user.passwordHash);
  else await verifyAgainstDummy(password);

  if (!user || !valid) return { errors: { form: "Invalid email or password." }, values };

  await createSession(user.id);
  redirect("/dashboard");
}
