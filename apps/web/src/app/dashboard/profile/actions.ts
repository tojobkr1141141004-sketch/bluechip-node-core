"use server";

import { redirect } from "next/navigation";
import { createWebServerSupabaseClient } from "@/lib/supabase/server";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function saveProfile(formData: FormData) {
  const supabase = await createWebServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard/profile" as never);

  const displayName = getText(formData, "display_name");
  const username = getText(formData, "username").toLowerCase();
  const locale = getText(formData, "locale") || "ko-KR";
  const validUsername =
    username === "" || /^[a-z0-9_]{3,32}$/.test(username);

  if (
    displayName.length < 1 ||
    displayName.length > 80 ||
    !validUsername ||
    !["ko-KR", "ja-JP", "en-US"].includes(locale)
  ) {
    redirect("/dashboard/profile?error=invalid" as never);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      username: username || null
    })
    .eq("id", user.id);

  if (profileError) {
    if (profileError.code === "23505") {
      redirect("/dashboard/profile?error=username_taken" as never);
    }

    redirect("/dashboard/profile?error=save_failed" as never);
  }

  const { error: settingsError } = await supabase
    .from("user_settings")
    .upsert({
      user_id: user.id,
      locale,
      timezone: locale === "ja-JP" ? "Asia/Tokyo" : locale === "en-US" ? "UTC" : "Asia/Seoul"
    });

  if (settingsError) redirect("/dashboard/profile?error=save_failed" as never);

  redirect("/dashboard/profile?updated=1" as never);
}
