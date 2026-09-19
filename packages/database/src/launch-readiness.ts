import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getActiveAssets } from "./finance";
import { getAdminDepositRequests, getAdminWithdrawalRequests } from "./finance-requests";
import { getAdminMiningIssuanceControls, getAdminMiningProducts, getAdminMiningProductVersions, getMiningSettings } from "./mining";
import { getAdminNotificationSummary } from "./notifications";
import { getAdminOperationsCenter, type OperationsCenterSnapshot } from "./operations-center";
import { getAdminSessionSecurityStatus } from "./auth-security";

type DatabaseClient = SupabaseClient<Database>;

export type LaunchReadinessItem = {
  key: string;
  title: string;
  category: "required" | "safety" | "manual";
  status: "ready" | "needs_setup" | "blocked" | "info";
  detail: string;
};

export type LaunchReadinessSnapshot = {
  generated_at: string;
  launch_ready: boolean;
  items: LaunchReadinessItem[];
};

function item(
  key: string,
  title: string,
  category: LaunchReadinessItem["category"],
  status: LaunchReadinessItem["status"],
  detail: string
): LaunchReadinessItem {
  return { key, title, category, status, detail };
}

export async function getAdminLaunchReadiness(client: DatabaseClient) {
  const [
    sessionResult,
    operationsResult,
    assetsResult,
    productsResult,
    versionsResult,
    settingsResult,
    issuanceResult,
    notificationsResult,
    depositsResult,
    withdrawalsResult
  ] = await Promise.all([
    getAdminSessionSecurityStatus(client),
    getAdminOperationsCenter(client),
    client.from("assets").select("id, code, is_active").eq("is_active", true),
    getAdminMiningProducts(client),
    getAdminMiningProductVersions(client),
    getMiningSettings(client),
    getAdminMiningIssuanceControls(client),
    getAdminNotificationSummary(client),
    getAdminDepositRequests(client),
    getAdminWithdrawalRequests(client)
  ]);

  const errors = [
    sessionResult.error,
    operationsResult.error,
    assetsResult.error,
    productsResult.error,
    versionsResult.error,
    settingsResult.error,
    issuanceResult.error,
    notificationsResult.error,
    depositsResult.error,
    withdrawalsResult.error
  ].filter(Boolean);

  if (errors.length) {
    return {
      error: errors[0] ?? new Error("출시 준비 상태를 불러오지 못했습니다."),
      data: null
    };
  }

  const session = sessionResult.data;
  const operations = operationsResult.data as OperationsCenterSnapshot | null;
  const activeAssets = assetsResult.data ?? [];
  const products = productsResult.data ?? [];
  const versions = versionsResult.data ?? [];
  const settings = settingsResult.data;
  const issuance = (issuanceResult.data ?? []) as Array<{
    asset_code?: string | null;
    issuance_enabled?: boolean | null;
  }>;
  const notifications = (notificationsResult.data ?? null) as {
    active_count?: number | null;
    critical_count?: number | null;
  } | null;
  const deposits = depositsResult.data ?? [];
  const withdrawals = withdrawalsResult.data ?? [];

  const activePublicProductIds = new Set(
    products
      .filter((product) => product.status === "active" && product.is_public)
      .map((product) => product.product_id)
  );
  const publishedLaunchProducts = versions.filter(
    (version) =>
      version.status === "published" &&
      activePublicProductIds.has(version.product_id)
  );

  const pendingDeposits = deposits.filter(
    (request) => request.status === "pending" || request.status === "reviewing"
  ).length;
  const pendingWithdrawals = withdrawals.filter(
    (request) =>
      request.status === "pending" ||
      request.status === "reviewing" ||
      request.status === "processing"
  ).length;

  const reconciliationHealthy =
    (operations?.mining?.reconciliation_status ?? "unknown") === "healthy" &&
    (operations?.mining?.unbalanced_ledger_count ?? 0) === 0 &&
    (operations?.mining?.open_errors ?? 0) === 0 &&
    (operations?.mining?.stale_runs ?? 0) === 0;

  const items: LaunchReadinessItem[] = [
    item(
      "admin-session",
      "운영자 보안 세션",
      "required",
      session?.authenticated && session.active_admin && session.recent_auth
        ? "ready"
        : "blocked",
      session?.authenticated && session.active_admin && session.recent_auth
        ? "인증·관리자 권한·최근 재인증이 모두 확인되었습니다."
        : "관리자 인증 또는 최근 재인증 조건을 확인해야 합니다."
    ),
    item(
      "core-assets",
      "핵심 자산",
      "required",
      activeAssets.some((asset) => asset.code === "KRW") &&
        activeAssets.some((asset) => asset.code === "USDT")
        ? "ready"
        : "needs_setup",
      activeAssets.length
        ? `활성 자산 ${activeAssets.map((asset) => asset.code).join(", ")}` 
        : "활성 자산이 없습니다."
    ),
    item(
      "mining-product",
      "공개 채굴 상품",
      "required",
      publishedLaunchProducts.length > 0 ? "ready" : "needs_setup",
      publishedLaunchProducts.length > 0
        ? `운영 가능한 공개 발행 버전 ${publishedLaunchProducts.length}개`
        : "활성·공개 상품과 published 버전이 아직 없습니다."
    ),
    item(
      "ledger-health",
      "Ledger 정합성",
      "required",
      reconciliationHealthy ? "ready" : "blocked",
      reconciliationHealthy
        ? "Ledger 불균형·채굴 오류·stale 계산이 없습니다."
        : "Ledger 또는 채굴 정산 상태를 점검해야 합니다."
    ),
    item(
      "finance-queue",
      "금융 대기 업무",
      "safety",
      pendingDeposits + pendingWithdrawals === 0 ? "ready" : "needs_setup",
      pendingDeposits + pendingWithdrawals === 0
        ? "대기 중인 입금·출금 요청이 없습니다."
        : `입금 ${pendingDeposits}건 · 출금 ${pendingWithdrawals}건이 처리 대기 중입니다.`
    ),
    item(
      "admin-alerts",
      "운영 알림",
      "safety",
      (notifications?.active_count ?? 0) === 0 ? "ready" : "needs_setup",
      (notifications?.active_count ?? 0) === 0
        ? "미해결 운영 알림이 없습니다."
        : `활성 운영 알림 ${notifications?.active_count ?? 0}건`
    ),
    item(
      "mining-lock",
      "자동 채굴 안전 잠금",
      "safety",
      settings?.calculation_enabled === false ? "ready" : "blocked",
      settings?.calculation_enabled === false
        ? "자동 계산이 현재 OFF 상태입니다. 실제 운영 전 최종 확인이 필요합니다."
        : "자동 계산이 이미 활성화되어 있습니다. 출시 전 운영 의도와 일치하는지 확인해야 합니다."
    ),
    item(
      "issuance-lock",
      "보상 발행 안전 잠금",
      "safety",
      issuance.filter((control) => control.issuance_enabled).length === 0
        ? "ready"
        : "blocked",
      issuance.filter((control) => control.issuance_enabled).length === 0
        ? "모든 자산의 보상 발행이 현재 중지되어 있습니다."
        : `보상 발행 허용 자산 ${issuance.filter((control) => control.issuance_enabled).length}개`
    ),
    item(
      "vercel-gate",
      "Vercel main 배포",
      "manual",
      "info",
      "현재 연결된 Vercel 배포 상태는 별도 배포 게이트에서 최종 확인합니다."
    ),
    item(
      "free-plan-auth",
      "Free 플랜 Auth 보안",
      "manual",
      "info",
      "Leaked Password Protection은 현재 플랜에서 제공되지 않으므로 필수 출시 조건에서 제외합니다."
    )
  ];

  const launchReady =
    items
      .filter((entry) => entry.category === "required")
      .every((entry) => entry.status === "ready") &&
    items
      .filter((entry) => entry.category === "safety")
      .every((entry) => entry.status === "ready");

  return {
    data: {
      generated_at: new Date().toISOString(),
      launch_ready: launchReady,
      items
    } satisfies LaunchReadinessSnapshot,
    error: null
  };
}
