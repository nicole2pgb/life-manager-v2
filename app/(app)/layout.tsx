import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

// Authoritative session check for every protected page in this group.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await getCurrentUser())) redirect("/login");
  return <div className="flex flex-1 flex-col">{children}</div>;
}
