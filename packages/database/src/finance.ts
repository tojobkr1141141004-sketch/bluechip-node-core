import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type DatabaseClient = SupabaseClient<Database>;

export async function getActiveAssets(client: DatabaseClient) {
  return client
    .from("assets")
    .select("id, code, name, asset_type, decimals")
    .eq("is_active", true)
    .order("code", { ascending: true });
}

export async function getUserAssetBalances(
  client: DatabaseClient,
  userId: string
) {
  return client
    .from("user_asset_balances")
    .select(
      "account_id, user_id, asset_id, asset_code, asset_name, asset_type, decimals, balance, is_active, created_at, updated_at"
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("asset_code", { ascending: true });
}

export async function getUserLedgerHistory(
  client: DatabaseClient,
  userId: string,
  limit = 100
) {
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  return client
    .from("user_ledger_history")
    .select(
      "transaction_id, asset_id, asset_code, asset_name, transaction_type, transaction_status, description, reference_type, reference_id, reversal_of_transaction_id, created_by, created_at, entry_id, account_id, account_type, owner_user_id, direction, amount, entry_created_at"
    )
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false })
    .order("entry_id", { ascending: false })
    .limit(safeLimit);
}

export async function getAdminLedgerTransactions(
  client: DatabaseClient,
  limit = 100
) {
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  return client
    .from("ledger_transactions")
    .select(
      "id, asset_id, transaction_type, idempotency_key, reference_type, reference_id, reversal_of_transaction_id, description, created_by, created_at"
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(safeLimit);
}
