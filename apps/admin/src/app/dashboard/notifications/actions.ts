"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  acknowledgeAdminNotification,
  resolveAdminNotification
} from "@apex-matrix/database";
import { requireAdminUser } from "@/lib/auth";

function readNotificationId(formData: FormData) {
  const value = formData.get("notificationId");
  if (typeof value !== "string" || value.length < 1) {
    throw new Error("notification id is required");
  }
  return value;
}

export async function acknowledgeNotification(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const id = readNotificationId(formData);
  const { error } = await acknowledgeAdminNotification(supabase, id);
  if (error) redirect("/dashboard/notifications?error=acknowledge");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/notifications");
}

export async function resolveNotification(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const id = readNotificationId(formData);
  const { error } = await resolveAdminNotification(supabase, id);
  if (error) redirect("/dashboard/notifications?error=resolve");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/notifications");
}
