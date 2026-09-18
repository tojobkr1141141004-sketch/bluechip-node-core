import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type DatabaseClient = SupabaseClient<Database>;

export type AdminNotificationSummary = {
  open_count: number;
  acknowledged_count: number;
  active_count: number;
  critical_count: number;
  can_manage: boolean;
  last_event_at: string | null;
};

export async function getAdminNotifications(
  client: DatabaseClient,
  status?: "open" | "acknowledged" | "resolved" | null,
  limit = 100
) {
  return client.rpc(
    "get_admin_notifications",
    status === undefined || status === null
      ? { p_limit: limit }
      : { p_status: status, p_limit: limit }
  );
}

export async function getAdminNotificationSummary(client: DatabaseClient) {
  return client.rpc("get_admin_notification_summary");
}

export async function getAdminNotificationEvents(client: DatabaseClient, limit = 100) {
  return client.rpc("get_admin_notification_events", { p_limit: limit });
}

export async function acknowledgeAdminNotification(
  client: DatabaseClient,
  notificationId: string
) {
  return client.rpc("acknowledge_admin_notification", {
    p_notification_id: notificationId
  });
}

export async function resolveAdminNotification(
  client: DatabaseClient,
  notificationId: string
) {
  return client.rpc("resolve_admin_notification", {
    p_notification_id: notificationId
  });
}
