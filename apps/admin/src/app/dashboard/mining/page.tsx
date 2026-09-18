import { randomUUID } from "crypto";
import {
  getActiveAssets,
  getAdminMiningCalculationErrors,
  getAdminMiningCalculationRuns,
  getAdminMiningDailySummary,
  getAdminMiningReconciliationSummary,
  getAdminMiningRewardEvents,
  getAdminMiningContracts,
  getAdminMiningProductVersions,
  getAdminMiningProducts,
  getMiningMemberCandidates,
  getMiningSettings
} from "@apex-matrix/database";
import { requireAdminUser } from "@/lib/auth";
import {
  publishVersion,
  runMiningNow,
  saveMiningSettings,
  submitMiningContract,
  submitMiningProduct,
  submitMiningVersion,
  updateProduct
} from "./actions";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatAmount(value: number | null | undefined) {
  return value == null ? "-" : String(value);
}

function formatDate(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
    : "-";
}

const statusLabel: Record<string, string> = {
  draft: "초안",
  active: "운영 중",
  paused: "일시 중지",
  archived: "보관",
  published: "발행",
  retired: "종료",
  completed: "완료",
  cancelled: "취소"
};

function Notice({ success, error }: { success?: string; error?: string }) {
  if (success) {
    const messages: Record<string, string> = {
      product_created: "채굴 상품 초안을 생성했습니다.",
      product_updated: "채굴 상품 정보를 저장했습니다.",
      version_created: "새 상품 버전을 생성했습니다.",
      version_published: "상품 버전을 발행했습니다.",
      contract_created: "회원 채굴 계약을 활성화했습니다.",
      calculation_run: "채굴 계산 엔진을 즉시 실행했습니다.",
      settings_saved: "채굴 설정을 저장했습니다."
    };

    return (
      <p className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] p-3 text-xs text-emerald-200">
        {messages[success] ?? "채굴 운영 변경이 완료되었습니다."}
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-xl border border-rose-300/10 bg-rose-300/[0.04] p-3 text-xs text-rose-200">
        채굴 운영 작업을 처리하지 못했습니다. 권한, 입력값, 상품 발행 상태를 확인해 주세요.
      </p>
    );
  }

  return null;
}

export default async function MiningAdminPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const { supabase } = await requireAdminUser();
  const params = await searchParams;
  const success = first(params.success);
  const error = first(params.error);

  const [
    productsResult,
    versionsResult,
    assetsResult,
    settingsResult,
    membersResult,
    contractsResult,
    runsResult,
    reconciliationResult,
    errorsResult,
    dailySummaryResult,
    rewardEventsResult
  ] = await Promise.all([
    getAdminMiningProducts(supabase),
    getAdminMiningProductVersions(supabase),
    getActiveAssets(supabase),
    getMiningSettings(supabase),
    getMiningMemberCandidates(supabase),
    getAdminMiningContracts(supabase),
    getAdminMiningCalculationRuns(supabase),
    getAdminMiningReconciliationSummary(supabase),
    getAdminMiningCalculationErrors(supabase),
    getAdminMiningDailySummary(supabase),
    getAdminMiningRewardEvents(supabase)
  ]);

  if (
    productsResult.error ||
    versionsResult.error ||
    assetsResult.error ||
    settingsResult.error ||
    membersResult.error ||
    contractsResult.error ||
    runsResult.error ||
    reconciliationResult.error ||
    errorsResult.error ||
    dailySummaryResult.error ||
    rewardEventsResult.error
  ) {
    return (
      <section className="rounded-3xl border border-rose-300/10 bg-rose-300/[0.04] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">
          MINING / SETTLEMENT
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
          채굴 상품 · 자동 계산
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          채굴 운영 데이터를 불러오지 못했습니다. mining.read 권한과 DB 정책을 확인해 주세요.
        </p>
      </section>
    );
  }

  const products = productsResult.data ?? [];
  const versions = versionsResult.data ?? [];
  const assets = assetsResult.data ?? [];
  const settings = settingsResult.data;
  const members = membersResult.data ?? [];
  const contracts = contractsResult.data ?? [];
  const runs = runsResult.data ?? [];
  const reconciliation = reconciliationResult.data;
  const errors = errorsResult.data ?? [];
  const dailySummary = dailySummaryResult.data ?? [];
  const rewardEvents = rewardEventsResult.data ?? [];

  const publishedVersions = versions.filter(
    (version) => version.status === "published"
  );
  const activeMembers = members.filter((member) => member.status === "active");

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
          MINING / SETTLEMENT
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
          채굴 상품 · 자동 계산
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
          상품 버전을 고정한 회원 채굴 계약을 운영하고, 자동 계산 엔진의 실행 상태와 보상 지급 기록을 확인합니다. 계산은 설정이 활성화된 경우에만 실행되며, 계산 주기는 DB 설정으로 통제됩니다.
        </p>
        <div className="mt-4">
          <Notice success={success} error={error} />
        </div>
      </div>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">자동 계산 엔진</h2>
            <p className="mt-1 text-[11px] text-zinc-600">
              Cron은 1분마다 호출되지만 실제 계산 간격은 아래 설정값으로 제어됩니다.
            </p>
          </div>
          <form action={runMiningNow}>
            <button
              type="submit"
              className="rounded-xl bg-white px-4 py-3 text-xs font-bold text-zinc-950 hover:bg-zinc-100"
            >
              지금 1회 계산 실행
            </button>
          </form>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            [
              "상태",
              settings?.calculation_enabled ? "자동 계산 활성화" : "자동 계산 비활성화"
            ],
            [
              "계산 주기",
              settings
                ? `${Math.round(settings.calculation_interval_seconds / 60)}분`
                : "-"
            ],
            ["시간대", settings?.calculation_timezone ?? "-"],
            ["보상 정밀도", settings ? `${settings.reward_precision}자리` : "-"],
            [
              "1회 최대 계약",
              settings ? settings.max_accounts_per_run.toLocaleString("ko-KR") : "-"
            ]
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/[0.06] bg-black/10 p-3"
            >
              <div className="text-[10px] text-zinc-600">{label}</div>
              <div className="mt-1 text-sm font-semibold text-zinc-200">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-xs">
            <thead className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.16em] text-zinc-600">
              <tr>
                <th className="px-3 py-2">실행 시각</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">처리 계약</th>
                <th className="px-3 py-2">지급 발생</th>
                <th className="px-3 py-2">오류</th>
                <th className="px-3 py-2">종료</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {runs.map((run) => (
                <tr key={run.id ?? randomUUID()}>
                  <td className="px-3 py-3 text-zinc-400">{formatDate(run.started_at)}</td>
                  <td className="px-3 py-3">
                    {statusLabel[run.status ?? ""] ?? run.status ?? "-"}
                  </td>
                  <td className="px-3 py-3">{String(run.processed_contracts ?? 0)}</td>
                  <td className="px-3 py-3">{String(run.rewarded_contracts ?? 0)}</td>
                  <td className="px-3 py-3">
                    {run.error_count ? (
                      <span className="text-rose-300">{String(run.error_count)}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="px-3 py-3 text-zinc-500">{formatDate(run.finished_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!runs.length ? (
            <div className="py-8 text-center text-xs text-zinc-600">
              아직 계산 실행 기록이 없습니다.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">정산 대사 상태</h2>
            <p className="mt-1 text-[11px] text-zinc-600">
              계산량, 실제 지급량, 미지급 잔여량과 Ledger 균형 상태를 한 화면에서 확인합니다.
            </p>
          </div>
          <span className={reconciliation?.reconciliation_status === "healthy"
            ? "rounded-full border border-emerald-300/15 bg-emerald-300/[0.04] px-3 py-1.5 text-[10px] font-semibold text-emerald-200"
            : "rounded-full border border-amber-300/15 bg-amber-300/[0.04] px-3 py-1.5 text-[10px] font-semibold text-amber-200"}>
            {reconciliation?.reconciliation_status === "healthy" ? "정상 대사" : "점검 필요"}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["활성 계약", String(reconciliation?.active_contracts ?? 0)],
            ["완료 계약", String(reconciliation?.completed_contracts ?? 0)],
            ["계산 오류", String(reconciliation?.error_count ?? 0)],
            ["지연 계약", String(reconciliation?.overdue_contracts ?? 0)]
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
              <div className="text-[10px] text-zinc-600">{label}</div>
              <div className="mt-1 text-lg font-semibold text-zinc-100">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
            <div className="text-[10px] text-zinc-600">누적 계산 보상</div>
            <div className="mt-1 text-sm font-semibold">{formatAmount(reconciliation?.accrued_amount)}</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
            <div className="text-[10px] text-zinc-600">누적 지급 보상</div>
            <div className="mt-1 text-sm font-semibold">{formatAmount(reconciliation?.paid_amount)}</div>
          </div>
          <div className="rounded-xl border border-amber-300/10 bg-amber-300/[0.03] p-3">
            <div className="text-[10px] text-amber-200/60">미지급 잔여량</div>
            <div className="mt-1 text-sm font-semibold text-amber-100">{formatAmount(reconciliation?.unpaid_amount)}</div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
            <div className="text-[10px] text-zinc-600">계약 데이터 이상</div>
            <div className={reconciliation?.invalid_contracts ? "mt-1 text-sm font-semibold text-rose-300" : "mt-1 text-sm font-semibold text-emerald-300"}>
              {String(reconciliation?.invalid_contracts ?? 0)}건
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
            <div className="text-[10px] text-zinc-600">Ledger 불균형</div>
            <div className={reconciliation?.unbalanced_ledger_count ? "mt-1 text-sm font-semibold text-rose-300" : "mt-1 text-sm font-semibold text-emerald-300"}>
              {String(reconciliation?.unbalanced_ledger_count ?? 0)}건
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold">최근 계산 오류</h2>
        <p className="mt-1 text-[11px] text-zinc-600">
          계산 중 개별 계약에서 발생한 오류는 해당 계약과 함께 기록됩니다. 다음 실행에서 아직 미계산 구간을 다시 처리할 수 있습니다.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-xs">
            <thead className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.16em] text-zinc-600">
              <tr>
                <th className="px-3 py-2">시각</th>
                <th className="px-3 py-2">회원</th>
                <th className="px-3 py-2">상품</th>
                <th className="px-3 py-2">SQLSTATE</th>
                <th className="px-3 py-2">오류 내용</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {errors.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3 text-[10px] text-zinc-500">{formatDate(item.created_at)}</td>
                  <td className="px-3 py-3">
                    {item.display_name || item.username || item.email || item.user_id || "-"}
                  </td>
                  <td className="px-3 py-3">{item.product_code ?? "-"}</td>
                  <td className="px-3 py-3 font-mono text-[10px] text-rose-300">{item.sqlstate}</td>
                  <td className="max-w-[560px] truncate px-3 py-3 text-[10px] text-zinc-500" title={item.error_message ?? ""}>
                    {item.error_message ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!errors.length ? (
            <div className="py-8 text-center text-xs text-zinc-600">최근 계산 오류가 없습니다.</div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold">일자별 정산 요약</h2>
        <p className="mt-1 text-[11px] text-zinc-600">
          한국시간 기준 계산 완료 구간을 자산별로 합산합니다.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[920px] w-full text-left text-xs">
            <thead className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.16em] text-zinc-600">
              <tr>
                <th className="px-3 py-2">날짜</th>
                <th className="px-3 py-2">자산</th>
                <th className="px-3 py-2">계산 건수</th>
                <th className="px-3 py-2">계약</th>
                <th className="px-3 py-2">회원</th>
                <th className="px-3 py-2">계산량</th>
                <th className="px-3 py-2">지급량</th>
                <th className="px-3 py-2">미지급</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {dailySummary.map((item) => (
                <tr key={`${item.summary_date}-${item.asset_code}`}>
                  <td className="px-3 py-3">{item.summary_date ?? "-"}</td>
                  <td className="px-3 py-3">{item.asset_code ?? "-"}</td>
                  <td className="px-3 py-3">{String(item.accrual_count ?? 0)}</td>
                  <td className="px-3 py-3">{String(item.contract_count ?? 0)}</td>
                  <td className="px-3 py-3">{String(item.user_count ?? 0)}</td>
                  <td className="px-3 py-3 font-semibold">{formatAmount(item.accrued_amount)}</td>
                  <td className="px-3 py-3 font-semibold">{formatAmount(item.paid_amount)}</td>
                  <td className="px-3 py-3 text-amber-200">{formatAmount(item.unpaid_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!dailySummary.length ? (
            <div className="py-8 text-center text-xs text-zinc-600">아직 정산 데이터가 없습니다.</div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold">최근 보상 이벤트</h2>
        <p className="mt-1 text-[11px] text-zinc-600">
          계산된 보상과 실제 지급 Ledger 거래의 연결 상태를 확인합니다.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[1120px] w-full text-left text-xs">
            <thead className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.16em] text-zinc-600">
              <tr>
                <th className="px-3 py-2">계산 종료</th>
                <th className="px-3 py-2">회원 ID</th>
                <th className="px-3 py-2">상품</th>
                <th className="px-3 py-2">계산 보상</th>
                <th className="px-3 py-2">실제 지급</th>
                <th className="px-3 py-2">Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {rewardEvents.map((item) => (
                <tr key={item.accrual_id}>
                  <td className="px-3 py-3 text-[10px] text-zinc-500">{formatDate(item.period_end)}</td>
                  <td className="px-3 py-3 font-mono text-[10px] text-zinc-600">{item.user_id ?? "-"}</td>
                  <td className="px-3 py-3">{item.product_code ?? "-"}</td>
                  <td className="px-3 py-3 font-semibold">{formatAmount(item.accrued_amount)} {item.asset_code ?? ""}</td>
                  <td className="px-3 py-3 font-semibold">
                    {item.paid_amount == null ? (
                      <span className="text-amber-200">미지급</span>
                    ) : (
                      `${formatAmount(item.paid_amount)} ${item.asset_code ?? ""}`
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {item.ledger_transaction_id ? (
                      <span className="text-emerald-300">연결됨</span>
                    ) : (
                      <span className="text-zinc-600">없음</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rewardEvents.length ? (
            <div className="py-8 text-center text-xs text-zinc-600">아직 보상 이벤트가 없습니다.</div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div>
          <h2 className="text-sm font-semibold">회원 채굴 계약 활성화</h2>
          <p className="mt-1 text-[11px] leading-5 text-zinc-600">
            상품의 발행된 버전을 선택하면 해당 버전의 보상 기준이 계약에 고정됩니다. 활성화 시 현재 시각부터 계산이 시작되며, 상품 버전을 나중에 변경해도 기존 계약의 기준값은 바뀌지 않습니다.
          </p>
        </div>

        <form action={submitMiningContract} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <select
            name="user_id"
            required
            defaultValue=""
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-white outline-none"
          >
            <option value="" disabled>
              활성 회원 선택
            </option>
            {activeMembers.map((member) => (
              <option key={member.user_id} value={member.user_id ?? ""}>
                {(member.display_name || member.username || member.email || "회원")}{" "}
                {member.username ? `(@${member.username})` : ""}
              </option>
            ))}
          </select>

          <select
            name="product_version_id"
            required
            defaultValue=""
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-white outline-none"
          >
            <option value="" disabled>
              발행 상품 버전 선택
            </option>
            {publishedVersions.map((version) => (
              <option key={version.id} value={version.id ?? ""}>
                {version.product_code} · v{version.version} ·{" "}
                {version.reward_asset_code} ·{" "}
                {version.capacity_unit}
              </option>
            ))}
          </select>

          <input
            name="capacity"
            required
            inputMode="decimal"
            pattern="^(?:\d+)(?:\.\d{1,18})?$"
            placeholder="용량 예: 10"
            className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-white outline-none"
          />

          <input
            type="hidden"
            name="idempotency_key"
            value={`mining-contract:${randomUUID()}`}
          />

          <button
            type="submit"
            disabled={!activeMembers.length || !publishedVersions.length}
            className="rounded-xl bg-emerald-300 px-4 py-3 text-xs font-bold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            채굴 계약 활성화
          </button>

          <div className="text-[11px] leading-5 text-zinc-600 md:col-span-2 xl:col-span-5">
            회원 선택 목록에는 mining 권한 범위에서 활성 회원의 기본 식별 정보만 표시됩니다.
            상품이 일시 중지되어도 이미 시작된 계약은 별도 취소 정책이 만들어지기 전까지 계약 기간에 따라 계속 계산됩니다.
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">채굴 계약 현황</h2>
            <p className="mt-1 text-[11px] text-zinc-600">
              현재 계약의 누적 채굴량, 지급량, 미지급 잔여량을 확인합니다.
            </p>
          </div>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-500">
            {contracts.length}개 계약
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[1320px] w-full text-left text-xs">
            <thead className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.16em] text-zinc-600">
              <tr>
                <th className="px-3 py-2">회원</th>
                <th className="px-3 py-2">상품</th>
                <th className="px-3 py-2">용량</th>
                <th className="px-3 py-2">누적 채굴</th>
                <th className="px-3 py-2">누적 지급</th>
                <th className="px-3 py-2">미지급</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">시작</th>
                <th className="px-3 py-2">종료</th>
                <th className="px-3 py-2">최근 계산</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {contracts.map((contract) => (
                <tr key={contract.contract_id ?? randomUUID()} className="text-zinc-300">
                  <td className="px-3 py-4">
                    <div className="font-medium">
                      {contract.display_name || contract.username || contract.email || "회원"}
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-600">
                      {contract.email ?? contract.user_id ?? "-"}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="font-medium">{contract.product_code ?? "-"}</div>
                    <div className="mt-1 text-[10px] text-zinc-600">
                      {contract.product_name ?? "-"} · v{String(contract.version ?? "-")}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    {formatAmount(contract.capacity)} {contract.capacity_unit ?? ""}
                  </td>
                  <td className="px-3 py-4">
                    {formatAmount(contract.total_reward_earned)} {contract.reward_asset_code ?? ""}
                  </td>
                  <td className="px-3 py-4">
                    {formatAmount(contract.total_reward_paid)} {contract.reward_asset_code ?? ""}
                  </td>
                  <td className="px-3 py-4">
                    {formatAmount(contract.pending_reward)} {contract.reward_asset_code ?? ""}
                  </td>
                  <td className="px-3 py-4">
                    {statusLabel[contract.status ?? ""] ?? contract.status ?? "-"}
                  </td>
                  <td className="px-3 py-4 text-zinc-500">{formatDate(contract.started_at)}</td>
                  <td className="px-3 py-4 text-zinc-500">{formatDate(contract.scheduled_end_at)}</td>
                  <td className="px-3 py-4 text-zinc-500">{formatDate(contract.last_calculated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!contracts.length ? (
            <div className="py-8 text-center text-xs text-zinc-600">
              활성화된 채굴 계약이 없습니다.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div>
          <h2 className="text-sm font-semibold">채굴 상품 · 버전 관리</h2>
          <p className="mt-1 text-[11px] text-zinc-600">
            상품 정의를 관리하고, 실제 계산에 사용될 값은 발행된 버전 스냅샷으로 고정합니다.
          </p>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-xl border border-white/[0.06] bg-black/10 p-4">
            <h3 className="text-xs font-semibold">새 채굴 상품</h3>
            <form action={submitMiningProduct} className="mt-4 grid gap-3">
              <input name="code" required maxLength={64} placeholder="상품 코드 예: BASIC_01" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs outline-none" />
              <input name="name" required maxLength={120} placeholder="상품명" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs outline-none" />
              <textarea name="description" rows={4} maxLength={2000} placeholder="상품 설명" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs outline-none" />
              <input name="sort_order" type="number" min={0} max={100000} defaultValue={0} placeholder="정렬 순서" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs outline-none" />
              <button type="submit" className="rounded-xl bg-white px-4 py-3 text-xs font-bold text-zinc-950">상품 초안 생성</button>
            </form>
          </div>

          <div className="space-y-4">
            {products.map((product) => {
              const productId = product.product_id ?? "";
              const status = product.status ?? "draft";
              const isPublic = Boolean(product.is_public);
              return (
                <article key={productId} className="rounded-xl border border-white/[0.06] bg-black/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">{product.product_code ?? "PRODUCT"}</div>
                      <div className="mt-1 text-base font-semibold">{product.product_name ?? "이름 없음"}</div>
                      <div className="mt-1 text-[11px] text-zinc-600">
                        {statusLabel[status] ?? status}
                        {isPublic ? " · 사용자 공개" : " · 비공개"}
                        {product.published_version ? ` · v${product.published_version} 발행` : " · 발행 버전 없음"}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-zinc-600">생성 {formatDate(product.created_at)}</div>
                  </div>

                  <div className="mt-3 text-xs leading-5 text-zinc-500">{product.description || "상품 설명 없음"}</div>

                  <form action={updateProduct} className="mt-4 grid gap-2 lg:grid-cols-[1fr_1fr_110px_140px_120px]">
                    <input type="hidden" name="product_id" value={productId} />
                    <input name="name" required defaultValue={product.product_name ?? ""} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none" />
                    <input name="description" defaultValue={product.description ?? ""} maxLength={2000} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none" />
                    <input name="sort_order" type="number" min={0} max={100000} defaultValue={product.sort_order ?? 0} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none" />
                    <select name="status" defaultValue={status} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none">
                      <option value="draft">초안</option>
                      <option value="active">운영 중</option>
                      <option value="paused">일시 중지</option>
                      <option value="archived">보관</option>
                    </select>
                    <select name="is_public" defaultValue={isPublic ? "true" : "false"} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none">
                      <option value="false">비공개</option>
                      <option value="true">공개</option>
                    </select>
                    <button type="submit" className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-semibold text-zinc-200 lg:col-span-full lg:justify-self-end">상품 정보 저장</button>
                  </form>

                  <div className="mt-4 rounded-xl border border-white/[0.05] bg-white/[0.015] p-4">
                    <div className="text-[10px] font-semibold text-zinc-300">새 버전 작성</div>
                    <form action={submitMiningVersion} className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                      <input type="hidden" name="product_id" value={productId} />
                      <select name="reward_asset_id" required className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none">
                        {assets.map((asset) => (
                          <option key={asset.id} value={asset.id}>{asset.code} · {asset.name}</option>
                        ))}
                      </select>
                      <input name="capacity_unit" required maxLength={32} placeholder="기준 단위 예: TH/s" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none" />
                      <input name="reward_per_unit_per_day" required inputMode="decimal" placeholder="단위당 하루 보상" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none" />
                      <input name="min_capacity" required inputMode="decimal" placeholder="최소 용량" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none" />
                      <input name="max_capacity" inputMode="decimal" placeholder="최대 용량 (선택)" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none" />
                      <input name="term_days" type="number" min={1} max={3650} defaultValue={1} placeholder="기간(일)" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs outline-none" />
                      <button type="submit" className="rounded-lg border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-2 text-[10px] font-semibold text-emerald-200 md:col-span-2 xl:col-span-2">새 버전 저장</button>
                    </form>
                  </div>
                </article>
              );
            })}
            {!products.length ? <div className="py-8 text-center text-xs text-zinc-600">등록된 채굴 상품이 없습니다.</div> : null}
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
              <tr>
                <th className="px-3 py-2">상품</th>
                <th className="px-3 py-2">버전</th>
                <th className="px-3 py-2">보상</th>
                <th className="px-3 py-2">용량</th>
                <th className="px-3 py-2">기간</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {versions.map((version) => (
                <tr key={version.id}>
                  <td className="px-3 py-3">
                    <div className="font-semibold">{version.product_code ?? "-"}</div>
                    <div className="mt-0.5 text-[10px] text-zinc-600">{version.product_name ?? "-"}</div>
                  </td>
                  <td className="px-3 py-3 font-semibold">v{String(version.version ?? "-")}</td>
                  <td className="px-3 py-3">
                    <div>{version.reward_asset_code ?? "-"}</div>
                    <div className="mt-0.5 text-[10px] text-zinc-600">{String(version.reward_per_unit_per_day ?? 0)} / {version.capacity_unit ?? "-"} / 일</div>
                  </td>
                  <td className="px-3 py-3">{String(version.min_capacity ?? 0)} ~ {formatAmount(version.max_capacity)} {version.capacity_unit ?? ""}</td>
                  <td className="px-3 py-3">{String(version.term_days ?? "-")}일</td>
                  <td className="px-3 py-3">{statusLabel[version.status ?? ""] ?? version.status ?? "-"}</td>
                  <td className="px-3 py-3 text-right">
                    {version.status === "draft" ? (
                      <form action={publishVersion}>
                        <input type="hidden" name="version_id" value={version.id ?? ""} />
                        <button type="submit" className="rounded-lg border border-emerald-300/15 px-3 py-2 text-[10px] font-semibold text-emerald-200">버전 발행</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!versions.length ? <div className="py-8 text-center text-xs text-zinc-600">생성된 상품 버전이 없습니다.</div> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold">채굴 계산 설정</h2>
        <p className="mt-1 text-[11px] text-zinc-600">
          자동 계산 활성화는 실제 지급 실행을 켜는 운영 제어값입니다. 기본값은 비활성화입니다.
        </p>
        <form action={saveMiningSettings} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="grid gap-2 text-xs text-zinc-400">
            계산 활성화
            <select name="calculation_enabled" defaultValue={settings?.calculation_enabled ? "true" : "false"} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none">
              <option value="false">비활성화</option>
              <option value="true">활성화</option>
            </select>
          </label>
          <label className="grid gap-2 text-xs text-zinc-400">
            계산 주기
            <select name="calculation_interval_seconds" defaultValue={String(settings?.calculation_interval_seconds ?? 3600)} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none">
              <option value="60">1분</option>
              <option value="300">5분</option>
              <option value="900">15분</option>
              <option value="1800">30분</option>
              <option value="3600">1시간</option>
              <option value="7200">2시간</option>
              <option value="14400">4시간</option>
              <option value="86400">24시간</option>
            </select>
          </label>
          <label className="grid gap-2 text-xs text-zinc-400">
            시간대
            <input value="Asia/Seoul" readOnly className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-zinc-500" />
          </label>
          <label className="grid gap-2 text-xs text-zinc-400">
            보상 정밀도
            <input name="reward_precision" type="number" min={0} max={18} defaultValue={settings?.reward_precision ?? 18} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none" />
          </label>
          <label className="grid gap-2 text-xs text-zinc-400">
            1회 처리 최대 계약 수
            <input name="max_accounts_per_run" type="number" min={1} max={100000} defaultValue={settings?.max_accounts_per_run ?? 1000} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none" />
          </label>
          <div className="sm:col-span-2 lg:col-span-5">
            <button type="submit" className="rounded-xl bg-white px-4 py-3 text-xs font-bold text-zinc-950">계산 설정 저장</button>
          </div>
        </form>
      </section>
    </section>
  );
}
