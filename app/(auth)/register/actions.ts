"use server";

import { redirect } from "next/navigation";
import { createUser } from "@/db/users";
import { AUTH_UNEXPECTED_ERROR, logAuthFailure } from "@/lib/auth/errors";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { normalizeEmail, validateRegistration } from "@/lib/auth/validation";
import type { AuthFormState } from "@/lib/auth/form-state";
import { readText } from "@/lib/form-data";

const ACCOUNT_CREATED_NOT_SIGNED_IN = "Your account was created, but we could not sign you in. Please sign in.";

export async function registerAction(_prev: AuthFormState, data: FormData): Promise<AuthFormState> {
  const input = {
    name: readText(data, "name"),
    email: readText(data, "email"),
    password: readText(data, "password"),
    confirmPassword: readText(data, "confirmPassword"),
  };
  const values = { name: input.name, email: input.email };

  const errors = validateRegistration(input);
  if (Object.keys(errors).length > 0) return { errors, values };

  let userId: number;
  try {
    const result = await createUser({
      name: input.name.trim(),
      email: normalizeEmail(input.email),
      passwordHash: await hashPassword(input.password),
    });
    if (!result.ok) return { errors: { email: "This email is already in use." }, values };
    userId = result.id;
  } catch (error) {
    logAuthFailure("registerAction", error);
    return { errors: { form: AUTH_UNEXPECTED_ERROR }, values };
  }

  try {
    await createSession(userId);
  } catch (error) {
    // The account exists now, so a retry would report "email already in use".
    logAuthFailure("registerAction (session)", error);
    return { errors: { form: ACCOUNT_CREATED_NOT_SIGNED_IN }, values };
  }
  // Outside the try: redirect() works by throwing.
  redirect("/dashboard");
}
