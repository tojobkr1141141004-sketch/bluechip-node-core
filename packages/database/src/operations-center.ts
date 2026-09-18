import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type DatabaseClient = SupabaseClient<Database>;

export type OperationsCenterSnapshot = {
  generated_at: string;
  permissions: {
    members_read: boolean;
    finance_read: boolean;
    mining_read: boolean;
    audit_read: boolean;
  };
  members: { total: number; active: number; inactive: number } | null;
  finance: { pending_deposits: number; pending_withdrawals: number; processing_withdrawals: number } | null;
  mining: {
    active_contracts: number;
    completed_contracts: number;
    cancelled_contracts: number;
    open_errors: number;
    stale_runs: number;
    reconciliation_status: string;
    unbalanced_ledger_count: number;
    last_successful_run_at: string | null;
  } | null;
  system: { calculation_enabled: boolean; issuance_enabled_policies: number } | null;
  alerts: Array<{ code: string; severity: string; title: string; count: number; owner: string; href: string }>;
};

export async function getAdminOperationsCenter(client: DatabaseClient) {
  return client.rpc("get_admin_operations_center").then((result) => {
    if (result.error || !result.data) return result;
    return {
      ...result,
      data: result.data as unknown as OperationsCenterSnapshot
    };
  });
}