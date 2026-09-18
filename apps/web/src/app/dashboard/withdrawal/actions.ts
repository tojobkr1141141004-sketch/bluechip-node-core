"use server";

import { redirect } from "next/navigation";
import {
  cancelWithdrawalRequest,
  createWithdrawalRequest
} from "@apex-matrix/database";
import { requireWebUser } from "@/lib/auth";

function readText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function validAmount(value: string) {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return false;
  return /[1-9]/.test(value);
}

function financeErrorRedirect(path: string) {
  redirect(`${path}?error=failed`);
}

export async function submitWithdrawalRequest(formData: FormData) {
  const { supabase } = await requireWebUser();
  const assetId = readText(formData, "asset_id");
  const amount = readText(formData, "amount");
  const destinationType = readText(formData, "destination_type");
  const destinationName = readText(formData, "destination_name");
  const destinationValue = readText(formData, "destination_value");
  const destinationNetwork = readText(formData, "destination_network");
  const requestKey = readText(formData, "request_key");
  const userNote = readText(formData, "user_note");

  if (!/^[0-9a-f-]{36}$/i.test(assetId) || !validAmount(amount)) {
    redirect("/dashboard/withdrawal?error=invalid");
  }

  if (!/^[0-9a-f-]{36}$/i.test(requestKey)) {
    redirect("/dashboard/withdrawal?error=request");
  }

  const { error } = await createWithdrawalRequest(supabase, {
    assetId,
    amount,
    destinationType,
    destinationName,
    destinationValue,
    destinationNetwork,
    requestKey,
    userNote
  });

  if (error) financeErrorRedirect("/dashboard/withdrawal");
  redirect("/dashboard/withdrawal?success=1");
}

export async function cancelWithdrawal(formData: FormData) {
  const { supabase } = await requireWebUser();
  const requestId = readText(formData, "request_id");

  if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
    redirect("/dashboard/withdrawal?error=invalid");
  }

  const { error } = await cancelWithdrawalRequest(supabase, requestId);

  if (error) financeErrorRedirect("/dashboard/withdrawal");
  redirect("/dashboard/withdrawal?cancelled=1");
}
