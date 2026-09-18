import { redirect } from "next/navigation";
import { getAdminSessionSecurityStatus } from "@apex-matrix/database";
import { createAdminServerSupabaseClient } from "./supabase/server";

export async function requireAdminUser() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    redirect("/login?error=configuration");
  }

  const supabase = await createAdminServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("user_id, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!adminUser) {
    redirect("/login?error=forbidden");
  }

  const { data: securityStatus, error: securityError } =
    await getAdminSessionSecurityStatus(supabase);

  if (
    securityError ||
    !securityStatus ||
    securityStatus.recent_auth !== true ||
    securityStatus.active_admin !== true
  ) {
    redirect("/login?error=reauth");
  }

  return { supabase, user, adminUser };
}
