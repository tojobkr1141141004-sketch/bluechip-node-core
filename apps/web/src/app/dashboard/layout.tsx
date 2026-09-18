import { requireWebUser } from "@/lib/auth";
import { UserShell } from "@/components/app/user-shell";

export const instant = false;

export default async function DashboardLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = await requireWebUser();

  return <UserShell email={user.email}>{children}</UserShell>;
}
