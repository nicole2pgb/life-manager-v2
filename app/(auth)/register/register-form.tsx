"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { registerAction } from "./actions";

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, null);
  const errors = state?.errors;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Name" name="name" placeholder="Your name" autoComplete="name" defaultValue={state?.values?.name} error={errors?.name} />
      <Field label="Email" name="email" type="email" placeholder="you@example.com" autoComplete="email" defaultValue={state?.values?.email} error={errors?.email} />
      <Field label="Password" name="password" type="password" autoComplete="new-password" error={errors?.password} />
      <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" error={errors?.confirmPassword} />
      <SubmitButton>Create account</SubmitButton>
      <Link href="/login" className="text-center text-sm font-medium text-accent hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}
