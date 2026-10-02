"use server";

import { redirect } from "next/navigation";
import { createUser } from "@/db/users";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { normalizeEmail, validateRegistration } from "@/lib/auth/validation";
import type { AuthFormState } from "@/lib/auth/form-state";

const text = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};

export async function registerAction(_prev: AuthFormState, data: FormData): Promise<AuthFormState> {
  const input = {
    name: text(data, "name"),
    email: text(data, "email"),
    password: text(data, "password"),
    confirmPassword: text(data, "confirmPassword"),
  };
  const values = { name: input.name, email: input.email };

  const errors = validateRegistration(input);
  if (Object.keys(errors).length > 0) return { errors, values };

  const result = await createUser({
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    passwordHash: await hashPassword(input.password),
  });
  if (!result.ok) return { errors: { email: "This email is already in use." }, values };

  await createSession(result.id);
  redirect("/dashboard");
}
