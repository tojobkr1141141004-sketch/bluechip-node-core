import type { Route } from "next";
import { redirect } from "next/navigation";
import { getRequestLocale } from "@/lib/locale";
import { createWebServerSupabaseClient } from "@/lib/supabase/server";

export async function requireWebUser() {
  const locale = await getRequestLocale();

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    redirect(`/${locale}/login?error=configuration` as Route);
  }

  const supabase = await createWebServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=/${locale}/dashboard` as Route);
  }

  return { supabase, user };
}
