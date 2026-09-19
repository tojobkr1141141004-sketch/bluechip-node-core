"use server";

import { redirect } from "next/navigation";

import {
  applyMiningRewardCorrection,
  cancelMiningContract,
  createMiningContract,
  createMiningProduct,
  createMiningProductVersion,
  publishMiningProductVersion,
  recalculateMiningContract,
  recoverStaleMiningCalculationRuns,
  retryMiningCalculationError,
  runMiningCalculationNow,
  updateMiningIssuancePolicy,
  updateMiningProduct,
  upsertMiningProductLocalization,
  updateMiningSettings
} from "@apex-matrix/database";
import { requireAdminUser } from "@/lib/auth";

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function uuid(valueToCheck: string) {
  return /^[0-9a-f-]{36}$/i.test(valueToCheck);
}

function positiveInteger(valueToCheck: string) {
  return /^\d+$/.test(valueToCheck) && Number(valueToCheck) > 0;
}

function decimal(valueToCheck: string) {
  return /^(?:\d+)(?:\.\d{1,18})?$/.test(valueToCheck) && Number(valueToCheck) > 0;
}

function redirectFailed() {
  redirect("/dashboard/mining?error=failed" as never);
}

function productReturnPath(formData: FormData) {
  return value(formData, "return_to") === "/dashboard/products"
    ? "/dashboard/products"
    : "/dashboard/mining";
}

function redirectProductResult(
  formData: FormData,
  result: `error=${string}` | `success=${string}`
) {
  redirect(`${productReturnPath(formData)}?${result}` as never);
}

function operationReturnPath(formData: FormData) {
  return value(formData, "return_to") === "/dashboard/contracts"
    ? "/dashboard/contracts"
    : "/dashboard/mining";
}

function redirectOperationResult(
  formData: FormData,
  result: `error=${string}` | `success=${string}`
) {
  redirect(`${operationReturnPath(formData)}?${result}` as never);
}

export async function submitMiningProduct(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const code = value(formData, "code").toUpperCase();
  const name = value(formData, "name");
  const description = value(formData, "description");
  const sortOrder = value(formData, "sort_order");

  if (!/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(code) || !name) {
    redirectProductResult(formData, "error=invalid");
  }

  const result = await createMiningProduct(supabase, {
    code,
    name,
    description,
    sortOrder: /^\d+$/.test(sortOrder) ? Number(sortOrder) : 0
  });

  if (result.error) redirectProductResult(formData, "error=failed");
  redirectProductResult(formData, "success=product_created");
}

export async function updateProduct(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const productId = value(formData, "product_id");
  const name = value(formData, "name");
  const description = value(formData, "description");
  const sortOrder = value(formData, "sort_order");
  const status = value(formData, "status");
  const isPublic = value(formData, "is_public") === "true";
  const publicConfirmed = value(formData, "public_confirmation") === "confirmed";

  if (!uuid(productId) || !name || (isPublic && !publicConfirmed)) {
    redirectProductResult(formData, "error=invalid");
  }

  const result = await updateMiningProduct(supabase, {
    productId,
    name,
    description,
    sortOrder: /^\d+$/.test(sortOrder) ? Number(sortOrder) : 0,
    status,
    isPublic
  });

  if (result.error) redirectProductResult(formData, "error=failed");
  redirectProductResult(formData, "success=product_updated");
}

export async function saveProductLocalization(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const productId = value(formData, "product_id");
  const category = value(formData, "category");
  const locale = value(formData, "locale");
  const name = value(formData, "localized_name");
  const description = value(formData, "localized_description");
  const riskNotice = value(formData, "risk_notice");

  if (
    !uuid(productId) ||
    !["stock", "crypto", "gold", "silver"].includes(category) ||
    !["ko", "ja", "en"].includes(locale) ||
    !name ||
    name.length > 120 ||
    description.length > 2000 ||
    riskNotice.length > 1000
  ) {
    redirectProductResult(formData, "error=invalid");
  }

  const result = await upsertMiningProductLocalization(supabase, {
    productId,
    category: category as "stock" | "crypto" | "gold" | "silver",
    locale: locale as "ko" | "ja" | "en",
    name,
    description,
    riskNotice
  });

  if (result.error) redirectProductResult(formData, "error=failed");
  redirectProductResult(formData, "success=localization_saved");
}

export async function submitMiningVersion(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const productId = value(formData, "product_id");
  const rewardAssetId = value(formData, "reward_asset_id");
  const capacityUnit = value(formData, "capacity_unit");
  const rewardPerUnitPerDay = value(formData, "reward_per_unit_per_day");
  const minCapacity = value(formData, "min_capacity");
  const maxCapacity = value(formData, "max_capacity");
  const termDays = value(formData, "term_days");

  if (
    !uuid(productId) ||
    !uuid(rewardAssetId) ||
    !capacityUnit ||
    !decimal(rewardPerUnitPerDay) ||
    !decimal(minCapacity) ||
    (maxCapacity && !decimal(maxCapacity)) ||
    !positiveInteger(termDays)
  ) {
    redirectProductResult(formData, "error=invalid");
  }

  const result = await createMiningProductVersion(supabase, {
    productId,
    rewardAssetId,
    capacityUnit,
    rewardPerUnitPerDay,
    minCapacity,
    maxCapacity: maxCapacity || undefined,
    termDays: Number(termDays)
  });

  if (result.error) redirectProductResult(formData, "error=failed");
  redirectProductResult(formData, "success=version_created");
}

export async function publishVersion(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const versionId = value(formData, "version_id");
  const confirmed = value(formData, "publish_confirmation") === "confirmed";

  if (!uuid(versionId) || !confirmed) redirectProductResult(formData, "error=invalid");

  const result = await publishMiningProductVersion(supabase, versionId);
  if (result.error) redirectProductResult(formData, "error=failed");
  redirectProductResult(formData, "success=version_published");
}

export async function submitMiningContract(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const userId = value(formData, "user_id");
  const productVersionId = value(formData, "product_version_id");
  const capacity = value(formData, "capacity");
  const idempotencyKey = value(formData, "idempotency_key");

  if (
    !uuid(userId) ||
    !uuid(productVersionId) ||
    !decimal(capacity) ||
    !/^mining-contract:[0-9a-f-]{36}$/i.test(idempotencyKey)
  ) {
    redirectOperationResult(formData, "error=invalid");
  }

  const result = await createMiningContract(supabase, {
    userId,
    productVersionId,
    capacity,
    startedAt: new Date().toISOString(),
    idempotencyKey
  });

  if (result.error) redirectOperationResult(formData, "error=failed");
  redirectOperationResult(formData, "success=contract_created");
}


export async function cancelContract(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const contractId = value(formData, "contract_id");
  const reason = value(formData, "reason");
  const idempotencyKey = value(formData, "idempotency_key");

  if (
    !uuid(contractId) ||
    reason.length < 3 ||
    reason.length > 1000 ||
    !/^mining-cancel:[0-9a-f-]{36}$/i.test(idempotencyKey)
  ) {
    redirectOperationResult(formData, "error=invalid");
  }

  const result = await cancelMiningContract(supabase, {
    contractId,
    reason,
    idempotencyKey
  });

  if (result.error) redirectOperationResult(formData, "error=failed");
  redirectOperationResult(formData, "success=contract_cancelled");
}

export async function runMiningNow() {
  const { supabase } = await requireAdminUser();
  const result = await runMiningCalculationNow(supabase);

  if (result.error) redirectFailed();
  redirect("/dashboard/mining?success=calculation_run" as never);
}

export async function recalculateContract(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const contractId = value(formData, "contract_id");
  const idempotencyKey = value(formData, "idempotency_key");

  if (
    !uuid(contractId) ||
    !/^mining-recalc:[0-9a-f-]{36}$/i.test(idempotencyKey)
  ) {
    redirectOperationResult(formData, "error=invalid");
  }

  const result = await recalculateMiningContract(supabase, {
    contractId,
    idempotencyKey
  });

  if (result.error) redirectOperationResult(formData, "error=failed");
  redirectOperationResult(formData, "success=contract_recalculated");
}

export async function retryCalculationError(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const errorId = value(formData, "error_id");
  const idempotencyKey = value(formData, "idempotency_key");

  if (
    !uuid(errorId) ||
    !/^mining-retry:[0-9a-f-]{36}$/i.test(idempotencyKey)
  ) {
    redirect("/dashboard/mining?error=invalid" as never);
  }

  const result = await retryMiningCalculationError(supabase, {
    errorId,
    idempotencyKey
  });

  if (result.error) redirectFailed();
  redirect("/dashboard/mining?success=calculation_retried" as never);
}

export async function recoverStaleRuns() {
  const { supabase } = await requireAdminUser();
  const result = await recoverStaleMiningCalculationRuns(supabase);

  if (result.error) redirectFailed();
  redirect("/dashboard/mining?success=stale_recovered" as never);
}

export async function submitRewardCorrection(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const contractId = value(formData, "contract_id");
  const originalAccrualId = value(formData, "original_accrual_id");
  const correctionType = value(formData, "correction_type");
  const amount = value(formData, "amount");
  const reason = value(formData, "reason");
  const idempotencyKey = value(formData, "idempotency_key");

  if (
    !uuid(contractId) ||
    (originalAccrualId && !uuid(originalAccrualId)) ||
    !["additional_paid", "additional_pending", "reduce_pending"].includes(correctionType) ||
    !decimal(amount) ||
    reason.length < 3 ||
    reason.length > 1000 ||
    !/^mining-correction:[0-9a-f-]{36}$/i.test(idempotencyKey)
  ) {
    redirect("/dashboard/mining?error=invalid" as never);
  }

  const result = await applyMiningRewardCorrection(supabase, {
    contractId,
    originalAccrualId: originalAccrualId || null,
    correctionType: correctionType as
      | "additional_paid"
      | "additional_pending"
      | "reduce_pending",
    amount,
    reason,
    idempotencyKey
  });

  if (result.error) redirectFailed();
  redirect("/dashboard/mining?success=reward_correction_applied" as never);
}

export async function saveMiningSettings(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const enabled = value(formData, "calculation_enabled") === "true";
  const interval = Number(value(formData, "calculation_interval_seconds"));
  const precision = Number(value(formData, "reward_precision"));
  const batch = Number(value(formData, "max_accounts_per_run"));
  const enableConfirmed = value(formData, "enable_confirmation") === "confirmed";

  if (
    ![60, 300, 900, 1800, 3600, 7200, 14400, 86400].includes(interval) ||
    !Number.isInteger(precision) ||
    precision < 0 ||
    precision > 18 ||
    !Number.isInteger(batch) ||
    batch < 1 ||
    batch > 100000 ||
    (enabled && !enableConfirmed)
  ) {
    redirect("/dashboard/mining?error=invalid" as never);
  }

  const result = await updateMiningSettings(supabase, {
    calculationEnabled: enabled,
    calculationIntervalSeconds: interval,
    calculationTimezone: "Asia/Seoul",
    rewardPrecision: precision,
    maxAccountsPerRun: batch
  });

  if (result.error) redirectFailed();
  redirect("/dashboard/mining?success=settings_saved" as never);
}

function optionalPositiveDecimal(valueToCheck: string) {
  return (
    valueToCheck === "" ||
    (/^(?:\d+)(?:\.\d{1,18})?$/.test(valueToCheck) && Number(valueToCheck) > 0)
  );
}

function optionalNonNegativeDecimal(valueToCheck: string) {
  return valueToCheck === "" || /^(?:\d+)(?:\.\d{1,18})?$/.test(valueToCheck);
}

export async function saveMiningIssuancePolicy(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const assetId = value(formData, "asset_id");
  const issuanceEnabled = value(formData, "issuance_enabled") === "true";
  const dailyLimit = value(formData, "daily_limit");
  const totalLimit = value(formData, "total_limit");
  const maxSourceNegativeBalance = value(formData, "max_source_negative_balance");
  const minimumReserveBalance = value(formData, "minimum_reserve_balance");
  const idempotencyKey = value(formData, "idempotency_key");
  const enableConfirmed = value(formData, "enable_confirmation") === "confirmed";

  if (
    !uuid(assetId) ||
    !optionalPositiveDecimal(dailyLimit) ||
    !optionalPositiveDecimal(totalLimit) ||
    !optionalNonNegativeDecimal(maxSourceNegativeBalance) ||
    !optionalNonNegativeDecimal(minimumReserveBalance) ||
    !/^mining-issuance-policy:[0-9a-f-]{36}$/i.test(idempotencyKey) ||
    (issuanceEnabled && !enableConfirmed)
  ) {
    redirect("/dashboard/mining?error=invalid" as never);
  }

  const result = await updateMiningIssuancePolicy(supabase, {
    assetId,
    issuanceEnabled,
    dailyLimit: dailyLimit || null,
    totalLimit: totalLimit || null,
    maxSourceNegativeBalance: maxSourceNegativeBalance || null,
    minimumReserveBalance: minimumReserveBalance || null,
    idempotencyKey
  });

  if (result.error) redirectFailed();
  redirect("/dashboard/mining?success=issuance_policy_saved" as never);
}
