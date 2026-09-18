"use server";

import { redirect } from "next/navigation";
import {
  approveDepositRequest,
  approveWithdrawalRequest,
  completeWithdrawalRequest,
  failWithdrawalRequest,
  rejectDepositRequest,
  rejectWithdrawalRequest,
  startDepositReview,
  startWithdrawalReview
} from "@apex-matrix/database";
import { requireAdminUser } from "@/lib/auth";

function textValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function requestId(formData: FormData) {
  const value = textValue(formData, "request_id");
  return /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

function errorCode(message: string) {
  if (message.includes("permission")) return "forbidden";
  if (message.includes("not found")) return "not_found";
  if (message.includes("state")) return "state";
  if (message.includes("external reference")) return "reference";
  if (message.includes("insufficient balance")) return "balance";
  return "failed";
}

function adminRedirect(target: string, result: { error: { message: string } | null }) {
  if (!result.error) {
    redirect(`${target}?success=1`);
  }

  redirect(`${target}?error=${errorCode(result.error.message)}`);
}

export async function beginDepositReview(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const id = requestId(formData);
  if (!id) redirect("/dashboard/finance?error=invalid");

  adminRedirect(
    "/dashboard/finance",
    await startDepositReview(supabase, id)
  );
}

export async function approveDeposit(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const id = requestId(formData);
  const reference = textValue(formData, "external_reference");

  if (!id || !reference) redirect("/dashboard/finance?error=reference");

  adminRedirect(
    "/dashboard/finance",
    await approveDepositRequest(supabase, id, reference)
  );
}

export async function rejectDeposit(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const id = requestId(formData);
  const reason = textValue(formData, "reason");

  if (!id || !reason) redirect("/dashboard/finance?error=reason");

  adminRedirect(
    "/dashboard/finance",
    await rejectDepositRequest(supabase, id, reason)
  );
}

export async function beginWithdrawalReview(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const id = requestId(formData);
  if (!id) redirect("/dashboard/finance?error=invalid");

  adminRedirect(
    "/dashboard/finance",
    await startWithdrawalReview(supabase, id)
  );
}

export async function approveWithdrawal(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const id = requestId(formData);
  if (!id) redirect("/dashboard/finance?error=invalid");

  adminRedirect(
    "/dashboard/finance",
    await approveWithdrawalRequest(supabase, id)
  );
}

export async function rejectWithdrawal(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const id = requestId(formData);
  const reason = textValue(formData, "reason");

  if (!id || !reason) redirect("/dashboard/finance?error=reason");

  adminRedirect(
    "/dashboard/finance",
    await rejectWithdrawalRequest(supabase, id, reason)
  );
}

export async function completeWithdrawal(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const id = requestId(formData);
  const reference = textValue(formData, "external_reference");

  if (!id || !reference) redirect("/dashboard/finance?error=reference");

  adminRedirect(
    "/dashboard/finance",
    await completeWithdrawalRequest(supabase, id, reference)
  );
}

export async function failWithdrawal(formData: FormData) {
  const { supabase } = await requireAdminUser();
  const id = requestId(formData);
  const reason = textValue(formData, "reason");

  if (!id || !reason) redirect("/dashboard/finance?error=reason");

  adminRedirect(
    "/dashboard/finance",
    await failWithdrawalRequest(supabase, id, reason)
  );
}
