"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, null);
  const errors = state?.errors;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {errors?.form ? (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {errors.form}
        </p>
      ) : null}
      <Field label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" defaultValue={state?.values?.email} error={errors?.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" error={errors?.password} />
      <SubmitButton>Sign in</SubmitButton>
      <Link href="/register" className="text-center text-sm font-medium text-accent hover:underline">
        Create account
      </Link>
    </form>
  );
}
