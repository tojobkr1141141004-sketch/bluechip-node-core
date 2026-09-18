"use server";

import { redirect } from "next/navigation";
import {
  cancelDepositRequest,
  createDepositRequest
} from "@apex-matrix/database";
import { requireWebUser } from "@/lib/auth";

function readText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function validAmount(value: string) {
  return /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value) && Number(value) > 0;
}

export async function submitDepositRequest(formData: FormData) {
  const { supabase } = await requireWebUser();
  const assetId = readText(formData, "asset_id");
  const amount = readText(formData, "amount");
  const requestKey = readText(formData, "request_key");
  const userNote = readText(formData, "user_note");

  if (!/^[0-9a-f-]{36}$/i.test(assetId) || !validAmount(amount)) {
    redirect("/dashboard/deposit?error=invalid");
  }

  if (!/^[0-9a-f-]{36}$/i.test(requestKey)) {
    redirect("/dashboard/deposit?error=request");
  }

  const { error } = await createDepositRequest(supabase, {
    assetId,
    amount,
    requestKey,
    userNote
  });

  redirect(
    error
      ? `/dashboard/deposit?error=${encodeURIComponent(error.message)}`
      : "/dashboard/deposit?success=1"
  );
}

export async function cancelDeposit(formData: FormData) {
  const { supabase } = await requireWebUser();
  const requestId = readText(formData, "request_id");

  if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
    redirect("/dashboard/deposit?error=invalid");
  }

  const { error } = await cancelDepositRequest(supabase, requestId);

  redirect(
    error
      ? `/dashboard/deposit?error=${encodeURIComponent(error.message)}`
      : "/dashboard/deposit?cancelled=1"
  );
}
