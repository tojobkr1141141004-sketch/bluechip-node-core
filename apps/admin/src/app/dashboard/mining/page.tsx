import { randomUUID } from "crypto";
import {
  getAdminMiningCalculationErrors,
  getAdminMiningCalculationRuns,
  getAdminMiningIssuanceControls,
  getAdminMiningDailySummary,
  getAdminMiningReconciliationSummary,
  getAdminMiningRewardEvents,
  getAdminMiningRewardCorrections,
  getMiningSettings
} from "@apex-matrix/database";
import { requireAdminUser } from "@/lib/auth";
import {
  recoverStaleRuns,
  retryCalculationError,
  runMiningNow,
  submitRewardCorrection,
  saveMiningSettings,
  saveMiningIssuancePolicy
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
  running: "실행 중",
  failed: "실패",
  stale: "복구 대기",
  recovered: "복구 완료",
  retired: "종료",
  completed: "완료",
  cancelled: "취소"
};

function Notice({ success, error }: { success?: string; error?: string }) {
  if (success) {
    const messages: Record<string, string> = {
      contract_created: "회원 채굴 계약을 활성화했습니다.",
      calculation_run: "채굴 계산 엔진을 즉시 실행했습니다.",
      contract_cancelled: "채굴 계약을 취소하고 취소 시각까지 계산·정산했습니다.",
      settings_saved: "채굴 설정을 저장했습니다.",
      contract_recalculated: "선택한 채굴 계약을 즉시 재계산했습니다.",
      calculation_retried: "계산 오류 재처리를 실행했습니다.",
      stale_recovered: "중단된 계산 실행을 복구 점검했습니다.",
      reward_correction_applied: "채굴 보상 정정 기록을 적용했습니다.",
      issuance_policy_saved: "채굴 보상 발행 안전설정을 저장했습니다."
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
    settingsResult,
    runsResult,
    reconciliationResult,
    errorsResult,
    dailySummaryResult,
    rewardEventsResult,
    correctionsResult,
    issuanceControlsResult
  ] = await Promise.all([
    getMiningSettings(supabase),
    getAdminMiningCalculationRuns(supabase),
    getAdminMiningReconciliationSummary(supabase),
    getAdminMiningCalculationErrors(supabase),
    getAdminMiningDailySummary(supabase),
    getAdminMiningRewardEvents(supabase),
    getAdminMiningRewardCorrections(supabase),
    getAdminMiningIssuanceControls(supabase)
  ]);

  if (
    settingsResult.error ||
    runsResult.error ||
    reconciliationResult.error ||
    errorsResult.error ||
    dailySummaryResult.error ||
    rewardEventsResult.error ||
    correctionsResult.error ||
    issuanceControlsResult.error
  ) {
    return (
      <section className="rounded-3xl border border-rose-300/10 bg-rose-300/[0.04] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">
          MINING / SETTLEMENT
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
          채굴 엔진 · 정산
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          채굴 운영 데이터를 불러오지 못했습니다. mining.read 권한과 DB 정책을 확인해 주세요.
        </p>
      </section>
    );
  }

  const settings = settingsResult.data;
  const runs = runsResult.data ?? [];
  const reconciliation = reconciliationResult.data;
  const errors = errorsResult.data ?? [];
  const dailySummary = dailySummaryResult.data ?? [];
  const rewardEvents = rewardEventsResult.data ?? [];
  const corrections = correctionsResult.data ?? [];

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
          MINING / SETTLEMENT
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
          채굴 엔진 · 정산
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
          자동 계산 엔진의 실행 상태, 정산 대사, 보상 지급·정정 기록과 발행 안전 제어를 관리합니다. 계산과 실제 지급은 각각 별도 잠금으로 통제됩니다.
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
          <div className="flex flex-wrap gap-2">
            <form action={recoverStaleRuns}>
              <button
                type="submit"
                className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] px-4 py-3 text-xs font-semibold text-amber-200"
              >
                중단된 실행 복구 점검
              </button>
            </form>
            <form action={runMiningNow}>
              <button
                type="submit"
                className="rounded-xl bg-white px-4 py-3 text-xs font-bold text-zinc-950 hover:bg-zinc-100"
              >
                지금 1회 계산 실행
              </button>
            </form>
          </div>
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
                <th className="px-3 py-2">유형</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">처리 계약</th>
                <th className="px-3 py-2">지급 발생</th>
                <th className="px-3 py-2">오류</th>
                <th className="px-3 py-2">종료</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {runs.map((run, index) => (
                <tr key={run.id ?? run.run_key ?? `${run.started_at ?? "run"}-${index}`}>
                  <td className="px-3 py-3 text-zinc-400">{formatDate(run.started_at)}</td>
                  <td className="px-3 py-3 text-[10px] text-zinc-500">{run.run_type ?? "scheduled"}</td>
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
          <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
            <div className="text-[10px] text-zinc-600">미해결 계산 오류</div>
            <div className={reconciliation?.open_error_count ? "mt-1 text-sm font-semibold text-rose-300" : "mt-1 text-sm font-semibold text-emerald-300"}>
              {String(reconciliation?.open_error_count ?? 0)}건
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/10 p-3">
            <div className="text-[10px] text-zinc-600">Stale 실행</div>
            <div className={reconciliation?.stale_run_count ? "mt-1 text-sm font-semibold text-amber-200" : "mt-1 text-sm font-semibold text-emerald-300"}>
              {String(reconciliation?.stale_run_count ?? 0)}건
            </div>
          </div>
        </div>
        <div className="mt-3 text-[10px] text-zinc-600">
          마지막 정상 계산: {formatDate(reconciliation?.last_successful_run_at)}
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
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">재처리</th>
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
                  <td className="px-3 py-3 text-[10px]">
                    {item.status === "resolved" ? (
                      <span className="text-emerald-300">해결됨</span>
                    ) : (
                      <span className="text-amber-200">미해결 · {String(item.retry_count ?? 0)}회</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {item.status === "resolved" || !item.contract_id ? (
                      <span className="text-[10px] text-zinc-600">재처리 불가</span>
                    ) : (
                      <form action={retryCalculationError}>
                        <input type="hidden" name="error_id" value={item.id ?? ""} />
                        <input type="hidden" name="idempotency_key" value={"mining-retry:" + randomUUID()} />
                        <button
                          type="submit"
                          className="rounded-lg border border-amber-300/15 bg-amber-300/[0.04] px-3 py-2 text-[10px] font-semibold text-amber-200"
                        >
                          다시 계산
                        </button>
                      </form>
                    )}
                  </td>
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
          <label className="flex items-start gap-3 rounded-xl border border-amber-300/10 bg-amber-300/[0.03] p-4 text-[11px] leading-5 text-amber-100/80 sm:col-span-2 lg:col-span-5">
            <input type="checkbox" name="enable_confirmation" value="confirmed" className="mt-0.5 h-4 w-4" />
            자동 계산을 활성화하는 경우 실제 계약 계산과 지급 경로가 동작할 수 있음을 확인했습니다. 비활성화 저장에는 체크가 필요하지 않습니다.
          </label>
          <div className="sm:col-span-2 lg:col-span-5">
            <button type="submit" className="rounded-xl bg-white px-4 py-3 text-xs font-bold text-zinc-950">계산 설정 저장</button>
          </div>
        </form>

      
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">채굴 보상 발행 안전 제어</h2>
            <p className="mt-1 text-[11px] leading-5 text-zinc-600">
              보상 계산 기록은 유지하면서 실제 Ledger 지급만 자산별 안전조건으로 통제합니다. 기본값은 발행 중지이며, 운영자가 직접 한도를 설정해야 발행을 허용할 수 있습니다.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {(issuanceControlsResult.data ?? []).map((control) => {
            const stateLabel =
              control.issuance_state === "ready"
                ? "발행 허용"
                : control.issuance_state === "blocked"
                  ? "안전장치로 중지"
                  : "발행 중지";
            const stateClass =
              control.issuance_state === "ready"
                ? "border-emerald-300/15 bg-emerald-300/[0.04] text-emerald-200"
                : control.issuance_state === "blocked"
                  ? "border-amber-300/15 bg-amber-300/[0.04] text-amber-200"
                  : "border-white/[0.06] bg-black/10 text-zinc-400";
            return (
              <div key={control.asset_id} className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">
                      {control.asset_code} · {control.asset_name}
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-600">자산 소수점 {control.asset_decimals}자리</div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold ${stateClass}`}>
                    {stateLabel}
                  </span>
                </div>
                {control.block_reason ? (
                  <div className="mt-3 rounded-xl border border-amber-300/10 bg-amber-300/[0.03] p-3 text-[11px] text-amber-200">
                    현재 차단 사유: {control.block_reason}
                  </div>
                ) : null}
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.05] p-3">
                    <div className="text-[10px] text-zinc-600">오늘 지급량 / 잔여</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-200">{formatAmount(control.daily_issued)} / {formatAmount(control.daily_remaining)}</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] p-3">
                    <div className="text-[10px] text-zinc-600">누적 지급량 / 잔여</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-200">{formatAmount(control.total_issued)} / {formatAmount(control.total_remaining)}</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] p-3">
                    <div className="text-[10px] text-zinc-600">보상 발행 계정 잔액</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-200">{formatAmount(control.source_balance)}</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] p-3">
                    <div className="text-[10px] text-zinc-600">발행 계정 허용 여유</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-200">{formatAmount(control.source_headroom)}</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] p-3">
                    <div className="text-[10px] text-zinc-600">준비금 잔액 / 최소 기준</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-200">{formatAmount(control.reserve_balance)} / {formatAmount(control.minimum_reserve_balance)}</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.05] p-3">
                    <div className="text-[10px] text-zinc-600">누적 발행 차단 횟수</div>
                    <div className="mt-1 text-sm font-semibold text-zinc-200">{control.blocked_payment_count.toLocaleString("ko-KR")}</div>
                  </div>
                </div>
                <form action={saveMiningIssuancePolicy} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="asset_id" value={control.asset_id} />
                  <input type="hidden" name="idempotency_key" value={`mining-issuance-policy:${randomUUID()}`} />
                  <label className="grid gap-2 text-xs text-zinc-400 sm:col-span-2">
                    발행 상태
                    <select name="issuance_enabled" defaultValue={control.issuance_enabled ? "true" : "false"} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none">
                      <option value="false">발행 중지</option>
                      <option value="true">안전조건 충족 시 발행 허용</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-xs text-zinc-400">
                    일일 발행 한도
                    <input name="daily_limit" inputMode="decimal" defaultValue={control.daily_limit == null ? "" : String(control.daily_limit)} placeholder="설정하지 않으려면 비워두세요" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none" />
                  </label>
                  <label className="grid gap-2 text-xs text-zinc-400">
                    누적 발행 한도
                    <input name="total_limit" inputMode="decimal" defaultValue={control.total_limit == null ? "" : String(control.total_limit)} placeholder="설정하지 않으려면 비워두세요" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none" />
                  </label>
                  <label className="grid gap-2 text-xs text-zinc-400">
                    발행 계정 최대 음수 허용량
                    <input name="max_source_negative_balance" inputMode="decimal" defaultValue={control.max_source_negative_balance == null ? "" : String(control.max_source_negative_balance)} placeholder="설정하지 않으려면 비워두세요" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none" />
                  </label>
                  <label className="grid gap-2 text-xs text-zinc-400">
                    최소 준비금 기준
                    <input name="minimum_reserve_balance" inputMode="decimal" defaultValue={control.minimum_reserve_balance == null ? "" : String(control.minimum_reserve_balance)} placeholder="설정하지 않으려면 비워두세요" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none" />
                  </label>
                  <label className="flex items-start gap-3 rounded-xl border border-amber-300/10 bg-amber-300/[0.03] p-4 text-[11px] leading-5 text-amber-100/80 sm:col-span-2">
                    <input type="checkbox" name="enable_confirmation" value="confirmed" className="mt-0.5 h-4 w-4" />
                    보상 발행을 허용하는 경우 자산 원장 지급이 실행될 수 있음을 확인했습니다. 발행 중지 저장에는 체크가 필요하지 않습니다.
                  </label>
                  <div className="sm:col-span-2">
                    <button type="submit" className="rounded-xl bg-white px-4 py-3 text-xs font-bold text-zinc-950">안전설정 저장</button>
                  </div>
                </form>
                <p className="mt-3 text-[10px] leading-5 text-zinc-600">
                  준비금 기준을 설정하면 자산별 준비금 계정이 참조되며, 시스템이 해당 계정에 임의로 자금을 충전하지는 않습니다.
                </p>
              </div>
            );
          })}
        </div>
      </section>
      </section>
    </section>
  );
}
