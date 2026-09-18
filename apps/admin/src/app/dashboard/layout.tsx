import { getAdminNotificationSummary } from "@apex-matrix/database";
import { requireAdminUser } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";

export const instant = false;

export default async function AdminDashboardLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const { supabase, user } = await requireAdminUser();

  const notificationResult = await getAdminNotificationSummary(supabase);
  const notificationSummary = notificationResult.data as unknown as {
    active_count?: number;
  } | null;

  return (
    <AdminShell
      email={user.email}
      notificationCount={notificationSummary?.active_count ?? 0}
    >
      {children}
    </AdminShell>
  );
}
