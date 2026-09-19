"use server";

import { redirect } from "next/navigation";
import {
  cancelDepositRequest,
  createDepositRequest
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

export async function submitDepositRequest(formData: FormData) {
  const { supabase } = await requireWebUser();
  const assetId = readText(formData, "asset_id");
  const amount = readText(formData, "amount");
  const requestKey = readText(formData, "request_key");
  const userNote = readText(formData, "user_note");

  if (!/^[0-9a-f-]{36}$/i.test(assetId) || !validAmount(amount)) {
    redirect(`${localizedPath(formData, "/dashboard/deposit")}?error=invalid` as never);
  }

  if (!/^[0-9a-f-]{36}$/i.test(requestKey)) {
    redirect(`${localizedPath(formData, "/dashboard/deposit")}?error=request` as never);
  }

  const { error } = await createDepositRequest(supabase, {
    assetId,
    amount,
    requestKey,
    userNote
  });

  if (error) financeErrorRedirect(formData, "/dashboard/deposit");
  redirect(`${localizedPath(formData, "/dashboard/deposit")}?success=1` as never);
}

export async function cancelDeposit(formData: FormData) {
  const { supabase } = await requireWebUser();
  const requestId = readText(formData, "request_id");

  if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
    redirect(`${localizedPath(formData, "/dashboard/deposit")}?error=invalid` as never);
  }

  const { error } = await cancelDepositRequest(supabase, requestId);

  if (error) financeErrorRedirect(formData, "/dashboard/deposit");
  redirect(`${localizedPath(formData, "/dashboard/deposit")}?cancelled=1` as never);
}
