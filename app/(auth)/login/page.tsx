import { redirect } from "next/navigation";
import { AuthCard } from "@/components/ui/auth-card";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthCard title="Sign in" subtitle="Welcome back. Pick up where your week left off.">
      <LoginForm />
    </AuthCard>
  );
}
