"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { startMyMiningContract } from "@apex-matrix/database";
import { localizeHref } from "@apex-matrix/i18n";
import { requireWebUser } from "@/lib/auth";
import { getRequestLocale } from "@/lib/locale";

function readText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function isUuid(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

function isPositiveDecimal(value: string) {
  return /^(?:\d+)(?:\.\d{1,18})?$/.test(value) && Number(value) > 0;
}

export async function startMining(formData: FormData) {
  const { supabase } = await requireWebUser();
  const locale = await getRequestLocale();
  const target = (query: string) =>
    localizeHref(`/dashboard/mining?${query}`, locale) as Route;

  const productVersionId = readText(formData, "product_version_id");
  const capacity = readText(formData, "capacity");
  const idempotencyKey = readText(formData, "idempotency_key");

  if (
    !isUuid(productVersionId) ||
    !isPositiveDecimal(capacity) ||
    !/^mining-user-start:[0-9a-f-]{36}$/i.test(idempotencyKey)
  ) {
    redirect(target("error=invalid"));
  }

  const { error } = await startMyMiningContract(supabase, {
    productVersionId,
    capacity,
    idempotencyKey
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("capacity is outside product limits")) {
      redirect(target("error=capacity"));
    }

    if (message.includes("public mining product version not found")) {
      redirect(target("error=unavailable"));
    }

    redirect(target("error=failed"));
  }

  redirect(target("success=started"));
}
