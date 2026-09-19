"use server";

import { redirect } from "next/navigation";
import { startMyMiningContract } from "@apex-matrix/database";
import { requireWebUser } from "@/lib/auth";

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

  const productVersionId = readText(formData, "product_version_id");
  const capacity = readText(formData, "capacity");
  const idempotencyKey = readText(formData, "idempotency_key");

  if (
    !isUuid(productVersionId) ||
    !isPositiveDecimal(capacity) ||
    !/^mining-user-start:[0-9a-f-]{36}$/i.test(idempotencyKey)
  ) {
    redirect("/dashboard/mining?error=invalid");
  }

  const { error } = await startMyMiningContract(supabase, {
    productVersionId,
    capacity,
    idempotencyKey
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("capacity is outside product limits")) {
      redirect("/dashboard/mining?error=capacity");
    }

    if (message.includes("public mining product version not found")) {
      redirect("/dashboard/mining?error=unavailable");
    }

    redirect("/dashboard/mining?error=failed");
  }

  redirect("/dashboard/mining?success=started");
}