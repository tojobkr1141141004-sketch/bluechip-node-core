"use server";

import { redirect } from "next/navigation";
import { createWebServerSupabaseClient } from "@/lib/supabase/server";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function saveProfile(formData: FormData) {
  const supabase = await createWebServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard/profile");

  const displayName = getText(formData, "display_name");
  const username = getText(formData, "username").toLowerCase();
  const locale = getText(formData, "locale") || "ko-KR";

  const validUsername =
    username === "" || /^[a-z0-9_]{3,32}$/.test(username);

  if (
    displayName.length < 1 ||
    displayName.length > 80 ||
    !validUsername ||
    !["ko-KR", "en-US"].includes(locale)
  ) {
    redirect("/dashboard/profile?error=invalid");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      username: username || null
    })
    .eq("id", user.id);

  if (profileError) {
    redirect(
      "/dashboard/profile?error=" +
        (profileError.code === "23505" ? "username_taken" : "save_failed")
    );
  }

  const { error: settingsError } = await supabase
    .from("user_settings")
    .upsert({
      user_id: user.id,
      locale,
      timezone: "Asia/Seoul"
    });

  if (settingsError) redirect("/dashboard/profile?error=save_failed");

  redirect("/dashboard/profile?updated=1");
}
