import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type DatabaseClient = SupabaseClient<Database>;

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
