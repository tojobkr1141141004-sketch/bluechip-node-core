"use server";

import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth";
import { createAdminServerSupabaseClient } from "@/lib/supabase/server";

export async function changeMemberStatus(formData: FormData) {
  await requireAdminUser();

  const userId = String(formData.get("user_id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (
    !/^[0-9a-f-]{36}$/i.test(userId) ||
    !["active", "suspended", "deleted"].includes(status)
  ) {
    redirect("/dashboard/members?error=invalid");
  }

  const supabase = await createAdminServerSupabaseClient();
  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", userId);

  if (error) {
    redirect(
      "/dashboard/members?error=" +
        (error.code === "42501" ? "forbidden" : "save_failed")
    );
  }

  redirect("/dashboard/members?updated=1" as never);
}
