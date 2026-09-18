import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type DatabaseClient = SupabaseClient<Database>;

export type AdminSessionSecurityStatus = {
  authenticated: boolean;
  active_admin: boolean;
  recent_auth: boolean;
  max_age_seconds: number;
  auth_time: string | null;
  session_age_seconds: number | null;
};

export async function getAdminSessionSecurityStatus(client: DatabaseClient) {
  const result = await client.rpc("get_admin_session_security_status");
  return {
    ...result,
    data: (result.data ?? null) as AdminSessionSecurityStatus | null
  };
}
