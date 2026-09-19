import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type DatabaseClient = SupabaseClient<Database>;

function safeLimit(limit: number, fallback: number, max: number) {
  return Math.min(Math.max(Number.isFinite(limit) ? Math.trunc(limit) : fallback, 1), max);
}

export async function getUserNotifications(client: DatabaseClient, limit = 100) {
  return client
    .from("user_notifications")
    .select(
      "id, notification_key, notification_type, title, message, href, metadata, read_at, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(safeLimit(limit, 100, 200));
}

export async function getUserUnreadNotificationCount(client: DatabaseClient) {
  return client
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
}

export async function markMyNotificationRead(
  client: DatabaseClient,
  notificationId: string
) {
  return client.rpc("mark_my_notification_read", {
    p_notification_id: notificationId
  });
}

export async function markAllMyNotificationsRead(client: DatabaseClient) {
  return client.rpc("mark_all_my_notifications_read");
}
