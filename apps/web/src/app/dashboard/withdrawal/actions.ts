"use server";

import { redirect } from "next/navigation";
import {
  cancelWithdrawalRequest,
  createWithdrawalRequest
} from "@apex-matrix/database";
import { requireWebUser } from "@/lib/auth";
import { localizeHref, normalizeLocale } from "@apex-matrix/i18n";

function readText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function validAmount(value: string) {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return false;
  return /[1-9]/.test(value);
}

function localizedPath(formData: FormData, path: string) {
  return localizeHref(path, normalizeLocale(readText(formData, "locale")));
}

function financeErrorRedirect(formData: FormData, path: string) {
  redirect(`${localizedPath(formData, path)}?error=failed` as never);
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
    redirect(`${localizedPath(formData, "/dashboard/withdrawal")}?error=invalid` as never);
  }

  if (!/^[0-9a-f-]{36}$/i.test(requestKey)) {
    redirect(`${localizedPath(formData, "/dashboard/withdrawal")}?error=request` as never);
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

  if (error) financeErrorRedirect(formData, "/dashboard/withdrawal");
  redirect(`${localizedPath(formData, "/dashboard/withdrawal")}?success=1` as never);
}

export async function cancelWithdrawal(formData: FormData) {
  const { supabase } = await requireWebUser();
  const requestId = readText(formData, "request_id");

  if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
    redirect(`${localizedPath(formData, "/dashboard/withdrawal")}?error=invalid` as never);
  }

  const { error } = await cancelWithdrawalRequest(supabase, requestId);

  if (error) financeErrorRedirect(formData, "/dashboard/withdrawal");
  redirect(`${localizedPath(formData, "/dashboard/withdrawal")}?cancelled=1` as never);
}
