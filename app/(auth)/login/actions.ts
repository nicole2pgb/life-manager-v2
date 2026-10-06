"use server";

import { redirect } from "next/navigation";
import { findUserByEmail } from "@/db/users";
import { AUTH_UNEXPECTED_ERROR, logAuthFailure } from "@/lib/auth/errors";
import { verifyAgainstDummy, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { normalizeEmail } from "@/lib/auth/validation";
import type { AuthFormState } from "@/lib/auth/form-state";
import { readText } from "@/lib/form-data";

export async function loginAction(_prev: AuthFormState, data: FormData): Promise<AuthFormState> {
  const email = readText(data, "email");
  const password = readText(data, "password");
  const values = { email };

  const errors: NonNullable<AuthFormState>["errors"] = {};
  if (!email.trim()) errors.email = "Email is required.";
  if (!password) errors.password = "Password is required.";
  if (Object.keys(errors).length > 0) return { errors, values };

  try {
    const user = await findUserByEmail(normalizeEmail(email));
    let valid = false;
    if (user) valid = await verifyPassword(password, user.passwordHash);
    else await verifyAgainstDummy(password);

    if (!user || !valid) return { errors: { form: "Invalid email or password." }, values };

    await createSession(user.id);
  } catch (error) {
    logAuthFailure("loginAction", error);
    return { errors: { form: AUTH_UNEXPECTED_ERROR }, values };
  }
  // Outside the try: redirect() works by throwing.
  redirect("/dashboard");
}
