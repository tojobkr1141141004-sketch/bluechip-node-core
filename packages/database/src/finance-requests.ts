import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type DatabaseClient = SupabaseClient<Database>;

type DepositAmountArgs =
  Database["public"]["Functions"]["create_deposit_request"]["Args"];

type WithdrawalAmountArgs =
  Database["public"]["Functions"]["create_withdrawal_request"]["Args"];

function numericRpcValue(value: string) {
  return value as unknown as number;
}

export async function getUserDepositRequests(
  client: DatabaseClient,
  userId: string
) {
  return client
    .from("user_deposit_requests")
    .select(
      "id, user_id, asset_id, asset_code, asset_name, decimals, amount, status, request_key, external_reference, user_note, rejection_reason, ledger_transaction_id, created_at, updated_at, completed_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
}

export async function getUserWithdrawalRequests(
  client: DatabaseClient,
  userId: string
) {
  return client
    .from("user_withdrawal_requests")
    .select(
      "id, user_id, asset_id, asset_code, asset_name, decimals, amount, destination_type, destination_name, destination_value, destination_network, status, request_key, external_reference, user_note, rejection_reason, failure_reason, reserve_transaction_id, completion_transaction_id, created_at, updated_at, completed_at, failed_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
}

export async function getAdminDepositRequests(client: DatabaseClient) {
  return client
    .from("admin_deposit_requests")
    .select(
      "id, user_id, asset_id, asset_code, asset_name, decimals, amount, status, request_key, external_reference, user_note, rejection_reason, ledger_transaction_id, created_at, updated_at, completed_at"
    )
    .order("created_at", { ascending: true })
    .limit(100);
}

export async function getAdminWithdrawalRequests(client: DatabaseClient) {
  return client
    .from("admin_withdrawal_requests")
    .select(
      "id, user_id, asset_id, asset_code, asset_name, decimals, amount, destination_type, destination_name, destination_value, destination_network, status, request_key, external_reference, user_note, rejection_reason, failure_reason, reserve_transaction_id, completion_transaction_id, created_at, updated_at, completed_at, failed_at"
    )
    .order("created_at", { ascending: true })
    .limit(100);
}

export async function getUserFinanceRequestEvents(client: DatabaseClient, limit = 100) {
  return client.rpc("get_user_finance_request_events", { p_limit: limit });
}

export async function getAdminFinanceRequestEvents(client: DatabaseClient, limit = 200) {
  return client.rpc("get_admin_finance_request_events", { p_limit: limit });
}

export async function createDepositRequest(
  client: DatabaseClient,
  input: {
    assetId: string;
    amount: string;
    requestKey: string;
    userNote?: string;
  }
) {
  const args = {
    p_asset_id: input.assetId,
    p_amount: numericRpcValue(input.amount),
    p_request_key: input.requestKey,
    p_user_note: input.userNote ?? ""
  } satisfies Omit<DepositAmountArgs, "p_amount"> & {
    p_amount: DepositAmountArgs["p_amount"];
  };

  return client.rpc("create_deposit_request", args);
}

export async function cancelDepositRequest(
  client: DatabaseClient,
  requestId: string
) {
  return client.rpc("cancel_deposit_request", {
    p_request_id: requestId
  });
}

export async function createWithdrawalRequest(
  client: DatabaseClient,
  input: {
    assetId: string;
    amount: string;
    destinationType: string;
    destinationName?: string;
    destinationValue: string;
    destinationNetwork?: string;
    requestKey: string;
    userNote?: string;
  }
) {
  const args = {
    p_asset_id: input.assetId,
    p_amount: numericRpcValue(input.amount),
    p_destination_type: input.destinationType,
    p_destination_name: input.destinationName ?? "",
    p_destination_value: input.destinationValue,
    p_destination_network: input.destinationNetwork ?? "",
    p_request_key: input.requestKey,
    p_user_note: input.userNote ?? ""
  } satisfies Omit<WithdrawalAmountArgs, "p_amount"> & {
    p_amount: WithdrawalAmountArgs["p_amount"];
  };

  return client.rpc("create_withdrawal_request", args);
}

export async function cancelWithdrawalRequest(
  client: DatabaseClient,
  requestId: string
) {
  return client.rpc("cancel_withdrawal_request", {
    p_request_id: requestId
  });
}

export async function startDepositReview(
  client: DatabaseClient,
  requestId: string
) {
  return client.rpc("start_deposit_review", { p_request_id: requestId });
}

export async function approveDepositRequest(
  client: DatabaseClient,
  requestId: string,
  externalReference: string
) {
  return client.rpc("approve_deposit_request", {
    p_request_id: requestId,
    p_external_reference: externalReference
  });
}

export async function rejectDepositRequest(
  client: DatabaseClient,
  requestId: string,
  reason: string
) {
  return client.rpc("reject_deposit_request", {
    p_request_id: requestId,
    p_reason: reason
  });
}

export async function startWithdrawalReview(
  client: DatabaseClient,
  requestId: string
) {
  return client.rpc("start_withdrawal_review", { p_request_id: requestId });
}

export async function approveWithdrawalRequest(
  client: DatabaseClient,
  requestId: string
) {
  return client.rpc("approve_withdrawal_request", { p_request_id: requestId });
}

export async function rejectWithdrawalRequest(
  client: DatabaseClient,
  requestId: string,
  reason: string
) {
  return client.rpc("reject_withdrawal_request", {
    p_request_id: requestId,
    p_reason: reason
  });
}

export async function completeWithdrawalRequest(
  client: DatabaseClient,
  requestId: string,
  externalReference: string
) {
  return client.rpc("complete_withdrawal_request", {
    p_request_id: requestId,
    p_external_reference: externalReference
  });
}

export async function failWithdrawalRequest(
  client: DatabaseClient,
  requestId: string,
  reason: string
) {
  return client.rpc("fail_withdrawal_request", {
    p_request_id: requestId,
    p_reason: reason
  });
}
