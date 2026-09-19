"use server";

import { redirect } from "next/navigation";
import {
  markAllMyNotificationsRead,
  markMyNotificationRead
} from "@apex-matrix/database";
import { requireWebUser } from "@/lib/auth";

function readText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function isUuid(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

function safeDashboardPath(value: string) {
  return /^\/dashboard(?:\/|$)/.test(value) ? value : "/dashboard/notifications";
}

export async function markNotificationRead(formData: FormData) {
  const { supabase } = await requireWebUser();
  const notificationId = readText(formData, "notification_id");
  const redirectTo = safeDashboardPath(readText(formData, "redirect_to"));

  if (!isUuid(notificationId)) {
    redirect("/dashboard/notifications");
  }

  await markMyNotificationRead(supabase, notificationId);
  redirect(redirectTo);
}

export async function markAllNotificationsRead() {
  const { supabase } = await requireWebUser();
  await markAllMyNotificationsRead(supabase);
  redirect("/dashboard/notifications");
}
