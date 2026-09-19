import { Pickaxe, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import {
  getUserMiningContractCancellations,
  getUserMiningProducts,
  getUserMiningRewardHistory,
  getUserMiningRewardPayments,
  getUserMiningRewardCorrections,
  getUserMiningContracts
} from "@apex-matrix/database";
import { requireWebUser } from "@/lib/auth";

export const instant = false;

function formatAmount(value: number | null | undefined) {
  return value == null ? "-" : String(value);
}

function formatDate(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
    : "-";
}

const statusLabel: Record<string, string> = {
  active: "채굴 중",
  completed: "기간 완료",
  cancelled: "취소"
};

export default async function MiningPage() {
  const { supabase } = await requireWebUser();

  const [
    productsResult,
    contractsResult,
    historyResult,
    paymentsResult,
    cancellationsResult,
    correctionsResult
  ] = await Promise.all([
    getUserMiningProducts(supabase),
    getUserMiningContracts(supabase),
    getUserMiningRewardHistory(supabase),
    getUserMiningRewardPayments(supabase),
    getUserMiningContractCancellations(supabase),
    getUserMiningRewardCorrections(supabase)
  ]);

  if (
    productsResult.error ||
    contractsResult.error ||
    historyResult.error ||
    paymentsResult.error ||
    cancellationsResult.error ||
    correctionsResult.error
  ) {
    return (
      <section className="rounded-3xl border border-rose-300/10 bg-rose-300/[0.04] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">
          MINING
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
          채굴 현황
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          채굴 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      </section>
    );
  }

  const products = productsResult.data ?? [];
  const contracts = contractsResult.data ?? [];
  const rewardHistory = historyResult.data ?? [];
  const payments = paymentsResult.data ?? [];
  const cancellations = cancellationsResult.data ?? [];
  const corrections = correctionsResult.data ?? [];

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Mining"
        title="채굴 현황"
        description="활성 채굴 계약, 자동 계산 기록, 지급 내역과 정정 기록을 한 곳에서 확인합니다."
        icon={Pickaxe}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="app-card-soft rounded-2xl p-5">
          <div className="flex items-center gap-2 text-xs font-semibold"><Pickaxe className="h-4 w-4" style={{ color: "var(--accent)" }} /> 채굴 계약</div>
          <div className="mt-3 text-2xl font-semibold">{contracts.length}</div>
          <div className="app-muted mt-1 text-[10px]">전체 계약 기록</div>
        </div>
        <div className="app-card-soft rounded-2xl p-5">
          <div className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck className="h-4 w-4" style={{ color: "var(--accent)" }} /> 기록 보존</div>
          <div className="mt-3 text-sm font-semibold">영구 기록</div>
          <div className="app-muted mt-1 text-[10px]">계산·지급·정정 이력을 보존</div>
        </div>
      </div>

      <section className="app-panel rounded-[24px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">내 채굴 계약</h2>
            <p className="mt-1 text-[11px] text-slate-600">
              계약 생성 당시의 상품 버전이 계산 기준으로 고정됩니다.
            </p>
          </div>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-slate-500">
            {contracts.length}개
          </span>
        </div>

        {!contracts.length ? (
          <div className="mt-4 app-card-soft rounded-2xl p-8 text-center text-xs text-slate-600">
            아직 활성화된 채굴 계약이 없습니다.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {contracts.map((contract) => (
              <article
                key={contract.contract_id}
                className="app-card-soft rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">
                      {contract.product_code ?? "PRODUCT"}
                    </div>
                    <h3 className="mt-1 text-base font-semibold">
                      {contract.product_name ?? "채굴 상품"}
                    </h3>
                  </div>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px]">
                    {statusLabel[contract.status ?? ""] ?? contract.status ?? "-"}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border  p-3">
                    <div className="text-[10px] text-slate-600">채굴 용량</div>
                    <div className="mt-1 text-sm font-semibold">
                      {formatAmount(contract.capacity)} {contract.capacity_unit ?? ""}
                    </div>
                  </div>
                  <div className="rounded-lg border  p-3">
                    <div className="text-[10px] text-slate-600">단위당 일 보상</div>
                    <div className="mt-1 text-sm font-semibold">
                      {formatAmount(contract.reward_per_unit_per_day)}{" "}
                      {contract.reward_asset_code ?? ""}
                    </div>
                  </div>
                  <div className="rounded-lg border  p-3">
                    <div className="text-[10px] text-slate-600">누적 채굴량</div>
                    <div className="mt-1 text-sm font-semibold">
                      {formatAmount(contract.total_reward_earned)}{" "}
                      {contract.reward_asset_code ?? ""}
                    </div>
                  </div>
                  <div className="rounded-lg border  p-3">
                    <div className="text-[10px] text-slate-600">누적 지급량</div>
                    <div className="mt-1 text-sm font-semibold">
                      {formatAmount(contract.total_reward_paid)}{" "}
                      {contract.reward_asset_code ?? ""}
                    </div>
                  </div>
                  <div className="rounded-lg border border-amber-300/10 bg-amber-300/[0.03] p-3 sm:col-span-2">
                    <div className="text-[10px] text-amber-200/60">현재 미지급 잔여량</div>
                    <div className="mt-1 text-sm font-semibold text-amber-100">
                      {formatAmount(contract.pending_reward)}{" "}
                      {contract.reward_asset_code ?? ""}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-[10px] text-slate-600 sm:grid-cols-2">
                  <div>버전 v{String(contract.version ?? "-")}</div>
                  <div>기간 {formatDate(contract.started_at)} ~ {formatDate(contract.scheduled_end_at)}</div>
                  <div>최근 계산 {formatDate(contract.last_calculated_at)}</div>
                  <div>계약 생성 {formatDate(contract.created_at)}</div>
                  {contract.completed_at ? (
                    <div>완료 시각 {formatDate(contract.completed_at)}</div>
                  ) : null}
                  {contract.cancelled_at ? (
                    <div>취소 시각 {formatDate(contract.cancelled_at)}</div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="app-panel rounded-[24px] p-6">
        <h2 className="text-sm font-semibold">계약 종료 기록</h2>
        <p className="mt-1 text-[11px] text-slate-600">
          운영자가 계약을 취소한 경우 취소 시각까지 계산된 지급량과 미지급 잔여량, 취소 사유가 기록됩니다.
        </p>
        <div className="mt-4 space-y-3">
          {cancellations.map((item) => (
            <article key={item.cancellation_id} className="app-card-soft rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-semibold">채굴 계약 취소</div>
                <div className="text-[10px] text-slate-600">{formatDate(item.created_at)}</div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="text-[10px] text-slate-600">취소 시각까지 지급</div>
                  <div className="mt-1 text-sm font-semibold">{formatAmount(item.reward_paid_on_cancel)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-600">남은 미지급</div>
                  <div className="mt-1 text-sm font-semibold text-amber-100">{formatAmount(item.pending_reward_after_cancel)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-600">계산 종료 시각</div>
                  <div className="mt-1 text-sm font-semibold">{formatDate(item.calculated_until)}</div>
                </div>
              </div>
              <div className="mt-3 rounded-lg border  p-3">
                <div className="text-[10px] text-slate-600">취소 사유</div>
                <div className="mt-1 text-xs leading-5 text-slate-300">{item.reason}</div>
              </div>
            </article>
          ))}
          {!cancellations.length ? (
            <div className="app-card-soft rounded-2xl p-8 text-center text-xs text-slate-600">
              계약 취소 이력이 없습니다.
            </div>
          ) : null}
        </div>
      </section>

      <section className="app-panel rounded-[24px] p-6">
        <h2 className="text-sm font-semibold">채굴 계산 기록</h2>
        <p className="mt-1 text-[11px] text-slate-600">
          자동 계산 엔진이 처리한 시간 구간과 계산된 보상량을 영구적으로 조회할 수 있습니다.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-xs">
            <thead className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.16em] text-slate-600">
              <tr>
                <th className="px-3 py-2">상품</th>
                <th className="px-3 py-2">계산 구간</th>
                <th className="px-3 py-2">경과</th>
                <th className="px-3 py-2">계산 보상</th>
                <th className="px-3 py-2">기록 시각</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {rewardHistory.map((item) => (
                <tr key={item.accrual_id ?? `${item.contract_id}-${item.period_end}`}>
                  <td className="px-3 py-3">
                    <div className="font-semibold">{item.product_code ?? "-"}</div>
                    <div className="mt-1 text-[10px] text-slate-600">
                      {item.product_name ?? "-"}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[10px] text-slate-500">
                    {formatDate(item.period_start)} → {formatDate(item.period_end)}
                  </td>
                  <td className="px-3 py-3 text-[10px] text-slate-500">
                    {item.elapsed_seconds == null ? "-" : `${String(item.elapsed_seconds)}초`}
                  </td>
                  <td className="px-3 py-3 font-semibold">
                    {formatAmount(item.reward_amount)} {item.reward_asset_code ?? ""}
                  </td>
                  <td className="px-3 py-3 text-[10px] text-slate-600">
                    {formatDate(item.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rewardHistory.length ? (
            <div className="py-8 text-center text-xs text-slate-600">
              아직 채굴 계산 기록이 없습니다.
            </div>
          ) : null}
        </div>
      </section>

      <section className="app-panel rounded-[24px] p-6">
        <h2 className="text-sm font-semibold">보상 정정 내역</h2>
        <p className="mt-1 text-[11px] text-slate-600">
          계산 기록 자체를 지우거나 바꾸지 않고 별도 정정 기록으로 반영된 내역입니다.
        </p>
        <div className="mt-4 space-y-3">
          {corrections.map((item) => (
            <article key={item.correction_id} className="app-card-soft rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-semibold">{item.correction_type ?? "보상 정정"}</div>
                <div className="text-[10px] text-slate-600">{formatDate(item.applied_at)}</div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="text-[10px] text-slate-600">정정 수량</div>
                  <div className="mt-1 text-sm font-semibold">{formatAmount(item.amount)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-600">Ledger</div>
                  <div className="mt-1 text-sm font-semibold">
                    {item.ledger_transaction_id ? "지급 반영" : "잔여량 조정"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-600">원 계산 기록</div>
                  <div className="mt-1 font-mono text-[10px] text-slate-500">
                    {item.original_accrual_id ?? "별도 계산 정정"}
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-lg border  p-3">
                <div className="text-[10px] text-slate-600">정정 사유</div>
                <div className="mt-1 text-xs leading-5 text-slate-300">{item.reason ?? "-"}</div>
              </div>
            </article>
          ))}
          {!corrections.length ? (
            <div className="app-card-soft rounded-2xl p-8 text-center text-xs text-slate-600">
              보상 정정 내역이 없습니다.
            </div>
          ) : null}
        </div>
      </section>

      <section className="app-panel rounded-[24px] p-6">
        <h2 className="text-sm font-semibold">보상 지급 기록</h2>
        <p className="mt-1 text-[11px] text-slate-600">
          지급된 보상은 Ledger 거래와 연결되어 회원 자산 잔액에 반영됩니다.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-xs">
            <thead className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.16em] text-slate-600">
              <tr>
                <th className="px-3 py-2">지급 시각</th>
                <th className="px-3 py-2">상품 계약</th>
                <th className="px-3 py-2">지급량</th>
                <th className="px-3 py-2">Ledger 거래</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {payments.map((payment) => (
                <tr key={payment.payment_id ?? payment.ledger_transaction_id}>
                  <td className="px-3 py-3 text-[10px] text-slate-500">
                    {formatDate(payment.created_at)}
                  </td>
                  <td className="px-3 py-3">
                    {payment.contract_id ? payment.contract_id.slice(0, 8) : "-"}
                  </td>
                  <td className="px-3 py-3 font-semibold">
                    {formatAmount(payment.amount)} {payment.reward_asset_code ?? ""}
                  </td>
                  <td className="px-3 py-3 font-mono text-[10px] text-slate-600">
                    {payment.ledger_transaction_id ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!payments.length ? (
            <div className="py-8 text-center text-xs text-slate-600">
              아직 지급된 채굴 보상이 없습니다.
            </div>
          ) : null}
        </div>
      </section>

      <section className="app-panel rounded-[24px] p-6">
        <h2 className="text-sm font-semibold">현재 공개된 채굴 상품</h2>
        <p className="mt-1 text-[11px] text-slate-600">
          아래 상품은 현재 공개된 기준이며, 실제 채굴 계약은 운영자가 발행 버전을 선택해 활성화합니다.
        </p>

        {!products.length ? (
          <div className="mt-4 app-card-soft rounded-2xl p-8 text-center text-xs text-slate-600">
            현재 공개된 채굴 상품이 없습니다.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {products.map((product) => (
              <article
                key={product.product_id ?? product.version_id}
                className="app-card-soft rounded-2xl p-4"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">
                  {product.product_code ?? "PRODUCT"}
                </div>
                <h3 className="mt-1 text-base font-semibold">
                  {product.product_name ?? "채굴 상품"}
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {product.description || "상품 설명이 등록되지 않았습니다."}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border  p-3">
                    <div className="text-[10px] text-slate-600">보상</div>
                    <div className="mt-1 text-sm font-semibold">
                      {formatAmount(product.reward_per_unit_per_day)} {product.reward_asset_code ?? ""}
                    </div>
                  </div>
                  <div className="rounded-lg border  p-3">
                    <div className="text-[10px] text-slate-600">용량</div>
                    <div className="mt-1 text-sm font-semibold">
                      {formatAmount(product.min_capacity)} ~ {formatAmount(product.max_capacity)} {product.capacity_unit ?? ""}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-slate-600">
                  버전 v{String(product.version ?? "-")} · 기간 {String(product.term_days ?? "-")}일
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
