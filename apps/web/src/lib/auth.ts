import { redirect } from "next/navigation";
import { createWebServerSupabaseClient } from "@/lib/supabase/server";

export async function requireWebUser() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    redirect("/login?error=configuration");
  }

  const supabase = await createWebServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  return { supabase, user };
}
