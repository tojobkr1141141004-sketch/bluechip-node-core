import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type DatabaseClient = SupabaseClient<Database>;

function safeLimit(limit: number, fallback: number, max: number) {
  return Math.min(Math.max(Number.isFinite(limit) ? Math.trunc(limit) : fallback, 1), max);
}

export async function getUserMiningProducts(client: DatabaseClient) {
  return client
    .from("user_mining_products")
    .select(
      "product_id, product_code, product_name, description, sort_order, version_id, version, reward_asset_id, reward_asset_code, reward_asset_name, reward_asset_decimals, capacity_unit, reward_per_unit_per_day, min_capacity, max_capacity, term_days, published_at"
    )
    .order("sort_order", { ascending: true })
    .order("product_code", { ascending: true });
}

export async function getAdminMiningProducts(client: DatabaseClient) {
  return client
    .from("admin_mining_products")
    .select(
      "product_id, product_code, product_name, description, status, is_public, sort_order, created_at, updated_at, published_version_id, published_version, reward_asset_id, reward_asset_code, reward_asset_name, capacity_unit, reward_per_unit_per_day, min_capacity, max_capacity, term_days, published_at"
    )
    .order("sort_order", { ascending: true })
    .order("product_code", { ascending: true });
}

export async function getAdminMiningProductVersions(
  client: DatabaseClient,
  productId?: string
) {
  let query = client
    .from("admin_mining_product_versions")
    .select(
      "id, product_id, product_code, product_name, version, reward_asset_id, reward_asset_code, reward_asset_name, capacity_unit, reward_per_unit_per_day, min_capacity, max_capacity, term_days, status, published_at, created_at, created_by"
    )
    .order("product_code", { ascending: true })
    .order("version", { ascending: false });

  if (productId) {
    query = query.eq("product_id", productId);
  }

  return query.limit(200);
}

export async function getMiningSettings(client: DatabaseClient) {
  return client
    .from("mining_settings")
    .select(
      "id, calculation_enabled, calculation_interval_seconds, calculation_timezone, reward_precision, max_accounts_per_run, updated_at, updated_by"
    )
    .eq("id", 1)
    .maybeSingle();
}

export async function getUserMiningContracts(client: DatabaseClient) {
  return client
    .from("user_mining_contracts")
    .select(
      "contract_id, product_id, product_code, product_name, product_version_id, version, capacity, capacity_unit, reward_per_unit_per_day, status, started_at, scheduled_end_at, last_calculated_at, total_reward_earned, total_reward_paid, pending_reward, reward_asset_id, reward_asset_code, reward_asset_name, reward_asset_decimals, created_at, completed_at, cancelled_at"
    )
    .order("status", { ascending: true })
    .order("started_at", { ascending: false });
}

export async function getUserMiningRewardHistory(
  client: DatabaseClient,
  limit = 100
) {
  return client
    .from("user_mining_reward_history")
    .select(
      "accrual_id, contract_id, product_version_id, product_code, product_name, asset_id, reward_asset_code, reward_asset_name, period_start, period_end, elapsed_seconds, reward_amount, created_at"
    )
    .order("period_end", { ascending: false })
    .limit(safeLimit(limit, 100, 100));
}

export async function getUserMiningRewardPayments(
  client: DatabaseClient,
  limit = 100
) {
  return client
    .from("user_mining_reward_payments")
    .select(
      "payment_id, contract_id, accrual_id, asset_id, reward_asset_code, reward_asset_name, amount, ledger_transaction_id, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(safeLimit(limit, 100, 100));
}

export async function getAdminMiningContracts(
  client: DatabaseClient,
  limit = 100
) {
  return client
    .from("admin_mining_contracts")
    .select(
      "contract_id, user_id, email, display_name, username, product_id, product_code, product_name, product_version_id, version, capacity, capacity_unit, reward_per_unit_per_day, status, started_at, scheduled_end_at, last_calculated_at, total_reward_earned, total_reward_paid, pending_reward, reward_asset_code, reward_asset_name, created_at, completed_at, cancelled_at, cancelled_by"
    )
    .order("created_at", { ascending: false })
    .limit(safeLimit(limit, 100, 200));
}

export async function getMiningMemberCandidates(client: DatabaseClient) {
  return client
    .rpc("get_mining_member_candidates")
    .order("display_name", { ascending: true });
}

export async function getAdminMiningReconciliationSummary(client: DatabaseClient) {
  return client
    .from("admin_mining_reconciliation_summary")
    .select(
      "active_contracts, completed_contracts, cancelled_contracts, overdue_contracts, invalid_contracts, accrual_count, accrued_amount, payment_count, paid_amount, unpaid_amount, error_count, unbalanced_ledger_count, reconciliation_status"
    )
    .maybeSingle();
}

export async function getAdminMiningCalculationErrors(
  client: DatabaseClient,
  limit = 100
) {
  return client
    .from("admin_mining_calculation_errors")
    .select(
      "id, calculation_run_id, contract_id, user_id, email, display_name, username, product_code, product_name, sqlstate, error_message, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(safeLimit(limit, 100, 200));
}

export async function getAdminMiningDailySummary(
  client: DatabaseClient,
  limit = 30
) {
  return client
    .from("admin_mining_daily_summary")
    .select(
      "summary_date, asset_id, asset_code, asset_name, accrual_count, contract_count, user_count, accrued_amount, paid_amount, unpaid_amount"
    )
    .order("summary_date", { ascending: false })
    .order("asset_code", { ascending: true })
    .limit(safeLimit(limit, 30, 200));
}

export async function getAdminMiningRewardEvents(
  client: DatabaseClient,
  limit = 100
) {
  return client
    .from("admin_mining_reward_events")
    .select(
      "accrual_id, contract_id, calculation_run_id, user_id, product_version_id, product_code, product_name, asset_id, asset_code, asset_name, period_start, period_end, elapsed_seconds, accrued_amount, payment_id, paid_amount, ledger_transaction_id, paid_at, accrued_at"
    )
    .order("period_end", { ascending: false })
    .limit(safeLimit(limit, 100, 200));
}

export async function getAdminMiningCalculationRuns(
  client: DatabaseClient,
  limit = 50
) {
  return client
    .from("admin_mining_calculation_runs")
    .select(
      "id, started_at, finished_at, status, processed_contracts, rewarded_contracts, error_count, created_at"
    )
    .order("started_at", { ascending: false })
    .limit(safeLimit(limit, 50, 100));
}

export async function createMiningProduct(
  client: DatabaseClient,
  input: {
    code: string;
    name: string;
    description?: string;
    sortOrder?: number;
  }
) {
  return client.rpc("create_mining_product", {
    p_code: input.code,
    p_name: input.name,
    p_description: input.description ?? "",
    p_sort_order: input.sortOrder ?? 0
  });
}

export async function updateMiningProduct(
  client: DatabaseClient,
  input: {
    productId: string;
    name: string;
    description: string;
    sortOrder: number;
    status: string;
    isPublic: boolean;
  }
) {
  return client.rpc("update_mining_product", {
    p_product_id: input.productId,
    p_name: input.name,
    p_description: input.description,
    p_sort_order: input.sortOrder,
    p_status: input.status,
    p_is_public: input.isPublic
  });
}

export async function createMiningProductVersion(
  client: DatabaseClient,
  input: {
    productId: string;
    rewardAssetId: string;
    capacityUnit: string;
    rewardPerUnitPerDay: string;
    minCapacity: string;
    maxCapacity?: string;
    termDays: number;
  }
) {
  return client.rpc("create_mining_product_version", {
    p_product_id: input.productId,
    p_reward_asset_id: input.rewardAssetId,
    p_capacity_unit: input.capacityUnit,
    p_reward_per_unit_per_day: input.rewardPerUnitPerDay as unknown as number,
    p_min_capacity: input.minCapacity as unknown as number,
    p_max_capacity: input.maxCapacity
      ? (input.maxCapacity as unknown as number)
      : undefined,
    p_term_days: input.termDays
  });
}

export async function publishMiningProductVersion(
  client: DatabaseClient,
  versionId: string
) {
  return client.rpc("publish_mining_product_version", {
    p_version_id: versionId
  });
}

export async function updateMiningSettings(
  client: DatabaseClient,
  input: {
    calculationEnabled: boolean;
    calculationIntervalSeconds: number;
    calculationTimezone: string;
    rewardPrecision: number;
    maxAccountsPerRun: number;
  }
) {
  return client.rpc("update_mining_settings", {
    p_calculation_enabled: input.calculationEnabled,
    p_calculation_interval_seconds: input.calculationIntervalSeconds,
    p_calculation_timezone: input.calculationTimezone,
    p_reward_precision: input.rewardPrecision,
    p_max_accounts_per_run: input.maxAccountsPerRun
  });
}

export async function createMiningContract(
  client: DatabaseClient,
  input: {
    userId: string;
    productVersionId: string;
    capacity: string;
    startedAt?: string;
    idempotencyKey: string;
  }
) {
  return client.rpc("create_mining_contract", {
    p_user_id: input.userId,
    p_product_version_id: input.productVersionId,
    p_capacity: input.capacity as unknown as number,
    p_started_at: input.startedAt,
    p_idempotency_key: input.idempotencyKey
  });
}

export async function cancelMiningContract(
  client: DatabaseClient,
  input: {
    contractId: string;
    reason: string;
    idempotencyKey: string;
  }
) {
  return client.rpc("cancel_mining_contract", {
    p_contract_id: input.contractId,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey
  });
}

export async function getUserMiningContractCancellations(client: DatabaseClient) {
  return client
    .from("user_mining_contract_cancellations")
    .select(
      "cancellation_id, contract_id, calculation_run_id, calculated_until, reward_paid_on_cancel, pending_reward_after_cancel, reason, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);
}

export async function getAdminMiningContractCancellations(client: DatabaseClient) {
  return client
    .from("admin_mining_contract_cancellations")
    .select(
      "cancellation_id, contract_id, user_id, email, display_name, username, actor_user_id, calculation_run_id, product_code, product_name, calculated_until, reward_paid_on_cancel, pending_reward_after_cancel, reason, idempotency_key, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);
}

export async function runMiningCalculationNow(client: DatabaseClient) {
  return client.rpc("run_mining_calculation_now");
}
