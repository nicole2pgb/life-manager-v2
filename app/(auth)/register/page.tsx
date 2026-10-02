import { redirect } from "next/navigation";
import { AuthCard } from "@/components/ui/auth-card";
import { getCurrentUser } from "@/lib/auth/session";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthCard title="Create account" subtitle="A few details and your personal operating system is ready.">
      <RegisterForm />
    </AuthCard>
  );
}
