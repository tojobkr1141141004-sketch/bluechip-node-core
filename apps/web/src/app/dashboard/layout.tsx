import { getUserUnreadNotificationCount } from "@apex-matrix/database";
import { requireWebUser } from "@/lib/auth";
import { UserShell } from "@/components/app/user-shell";

export const instant = false;

export default async function DashboardLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const { supabase, user } = await requireWebUser();
  const { count } = await getUserUnreadNotificationCount(supabase);

  return (
    <UserShell
      email={user.email}
      unreadNotificationCount={count ?? 0}
    >
      {children}
    </UserShell>
  );
}
