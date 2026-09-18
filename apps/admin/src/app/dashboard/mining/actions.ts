"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import {
  cancelMiningContract,
  createMiningContract,
  createMiningProduct,
  createMiningProductVersion,
  publishMiningProductVersion,
  runMiningCalculationNow,
  updateMiningProduct,
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

export async function submitMiningProduct(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const code = value(formData, "code").toUpperCase();
  const name = value(formData, "name");
  const description = value(formData, "description");
  const sortOrder = value(formData, "sort_order");

  if (!/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(code) || !name) {
    redirect("/dashboard/mining?error=invalid" as never);
  }

  const result = await createMiningProduct(supabase, {
    code,
    name,
    description,
    sortOrder: /^\d+$/.test(sortOrder) ? Number(sortOrder) : 0
  });

  if (result.error) redirectFailed();
  redirect("/dashboard/mining?success=product_created" as never);
}

export async function updateProduct(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const productId = value(formData, "product_id");
  const name = value(formData, "name");
  const description = value(formData, "description");
  const sortOrder = value(formData, "sort_order");
  const status = value(formData, "status");
  const isPublic = value(formData, "is_public") === "true";

  if (!uuid(productId) || !name) {
    redirect("/dashboard/mining?error=invalid" as never);
  }

  const result = await updateMiningProduct(supabase, {
    productId,
    name,
    description,
    sortOrder: /^\d+$/.test(sortOrder) ? Number(sortOrder) : 0,
    status,
    isPublic
  });

  if (result.error) redirectFailed();
  redirect("/dashboard/mining?success=product_updated" as never);
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
    redirect("/dashboard/mining?error=invalid" as never);
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

  if (result.error) redirectFailed();
  redirect("/dashboard/mining?success=version_created" as never);
}

export async function publishVersion(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const versionId = value(formData, "version_id");

  if (!uuid(versionId)) redirect("/dashboard/mining?error=invalid" as never);

  const result = await publishMiningProductVersion(supabase, versionId);
  if (result.error) redirectFailed();
  redirect("/dashboard/mining?success=version_published" as never);
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
    redirect("/dashboard/mining?error=invalid" as never);
  }

  const result = await createMiningContract(supabase, {
    userId,
    productVersionId,
    capacity,
    startedAt: new Date().toISOString(),
    idempotencyKey
  });

  if (result.error) redirectFailed();
  redirect("/dashboard/mining?success=contract_created" as never);
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
    redirect("/dashboard/mining?error=invalid" as never);
  }

  const result = await cancelMiningContract(supabase, {
    contractId,
    reason,
    idempotencyKey
  });

  if (result.error) redirectFailed();
  redirect("/dashboard/mining?success=contract_cancelled" as never);
}

export async function runMiningNow() {
  const { supabase } = await requireAdminUser();
  const result = await runMiningCalculationNow(supabase);

  if (result.error) redirectFailed();
  redirect("/dashboard/mining?success=calculation_run" as never);
}

export async function saveMiningSettings(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const enabled = value(formData, "calculation_enabled") === "true";
  const interval = Number(value(formData, "calculation_interval_seconds"));
  const precision = Number(value(formData, "reward_precision"));
  const batch = Number(value(formData, "max_accounts_per_run"));

  if (
    ![60, 300, 900, 1800, 3600, 7200, 14400, 86400].includes(interval) ||
    !Number.isInteger(precision) ||
    precision < 0 ||
    precision > 18 ||
    !Number.isInteger(batch) ||
    batch < 1 ||
    batch > 100000
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
