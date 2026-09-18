import { requireAdminUser } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";

export const instant = false;

export default async function AdminDashboardLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = await requireAdminUser();

  return <AdminShell email={user.email}>{children}</AdminShell>;
}
