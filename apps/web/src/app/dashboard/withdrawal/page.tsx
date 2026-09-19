import { ArrowUpFromLine, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import {
  getActiveAssets,
  getUserAssetBalances,
  getUserWithdrawalRequests,
  getUserFinanceRequestEvents
} from "@apex-matrix/database";
import { requireWebUser } from "@/lib/auth";
import { cancelWithdrawal, submitWithdrawalRequest } from "./actions";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const statusLabel: Record<string, string> = {
  pending: "접수 대기",
  reviewing: "확인 중",
  processing: "송금 처리 중",
  completed: "출금 완료",
  rejected: "반려",
  cancelled: "취소됨",
  failed: "처리 실패"
};

export default async function WithdrawalPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const { supabase, user } = await requireWebUser();
  const params = await searchParams;
  const success = first(params.success) === "1";
  const cancelled = first(params.cancelled) === "1";
  const error = first(params.error);

  const [assetsResult, balancesResult, requestsResult, eventsResult] = await Promise.all([
    getActiveAssets(supabase),
    getUserAssetBalances(supabase, user.id),
    getUserWithdrawalRequests(supabase, user.id),
    getUserFinanceRequestEvents(supabase, 200)
  ]);

  if (
    assetsResult.error ||
    balancesResult.error ||
    requestsResult.error ||
    eventsResult.error
  ) {
    return (
      <section className="rounded-3xl border border-rose-300/10 bg-rose-300/[0.04] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">
          WITHDRAWAL
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">출금</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          출금 업무 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      </section>
    );
  }

  const balanceByAsset = new Map(
    (balancesResult.data ?? []).map((balance) => [balance.asset_id, balance.balance])
  );
  const requestKey = crypto.randomUUID();

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Withdrawal"
        title="출금 요청"
        description="출금 요청을 접수하면 운영자가 확인합니다. 승인 전에는 원장 자금이 이동하지 않습니다."
        icon={ArrowUpFromLine}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="app-panel rounded-[24px] p-6 sm:p-8">
        {success ? (
          <p className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] p-3 text-xs text-emerald-200">
            출금 요청이 접수되었습니다. 운영자 확인 후 처리됩니다.
          </p>
        ) : null}
        {cancelled ? (
          <p className="mt-4 rounded-xl border border-sky-300/15 bg-sky-300/[0.05] p-3 text-xs text-sky-200">
            출금 요청을 취소했습니다.
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-xl border border-rose-300/10 bg-rose-300/[0.04] p-3 text-xs text-rose-200">
            출금 요청을 처리하지 못했습니다. 잔액, 자산 정밀도, 수취 정보를 확인해 주세요.
          </p>
        ) : null}

        <form action={submitWithdrawalRequest} className="mt-6 grid gap-4">
          <input type="hidden" name="request_key" value={requestKey} />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-xs text-slate-400">
              자산
              <select
                name="asset_id"
                required
                className="rounded-xl app-input px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
              >
                {assetsResult.data?.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.code} · 잔액 {String(balanceByAsset.get(asset.id) ?? 0)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-xs text-slate-400">
              출금 금액
              <input
                name="amount"
                type="text"
                inputMode="decimal"
                placeholder="예: 100000 또는 10.5"
                required
                autoComplete="off"
                className="rounded-xl app-input px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
              />
            </label>
          </div>

          <label className="grid gap-2 text-xs text-slate-400">
            출금 방식
            <select
              name="destination_type"
              defaultValue="bank"
              required
              className="rounded-xl app-input px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
            >
              <option value="bank">은행 계좌</option>
              <option value="wallet">USDT 지갑</option>
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2 text-xs text-slate-400">
              예금주 / 수취인
              <input
                name="destination_name"
                type="text"
                maxLength={120}
                placeholder="은행 계좌 출금 시 입력"
                className="rounded-xl app-input px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
              />
            </label>

            <label className="grid gap-2 text-xs text-slate-400 sm:col-span-2">
              계좌번호 / 지갑 주소
              <input
                name="destination_value"
                type="text"
                maxLength={320}
                required
                placeholder="출금 받을 계좌번호 또는 지갑 주소"
                className="rounded-xl app-input px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
              />
            </label>
          </div>

          <label className="grid gap-2 text-xs text-slate-400">
            네트워크
            <input
              name="destination_network"
              type="text"
              maxLength={64}
              placeholder="USDT 출금 시 예: TRC20 / ERC20"
              className="rounded-xl app-input px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
            />
          </label>

          <label className="grid gap-2 text-xs text-slate-400">
            메모
            <textarea
              name="user_note"
              rows={3}
              maxLength={500}
              placeholder="운영자가 확인해야 할 추가 내용을 남겨주세요."
              className="rounded-xl app-input px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
            />
          </label>

          <div className="rounded-xl border border-amber-300/10 bg-amber-300/[0.04] p-4 text-[11px] leading-5 text-amber-100/70">
            출금 승인 후 사용자 잔액에서 금액이 예약됩니다. 실제 외부 송금은 운영자가 수동으로 진행하며, 완료 또는 실패 결과가 별도로 기록됩니다.
          </div>

          <button
            type="submit"
            className="app-button-primary rounded-xl px-4 py-3 text-xs font-bold hover:bg-slate-100"
            disabled={!assetsResult.data?.length}
          >
            출금 요청 접수
          </button>
        </form>
        </section>

        <aside className="app-card-soft h-fit rounded-[24px] p-5">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <ShieldCheck className="h-4 w-4" style={{ color: "var(--accent)" }} />
            출금 안전 안내
          </div>
          <p className="app-muted mt-2 text-[10px] leading-5">
            운영자 승인 후 출금 금액이 안전하게 예약되며, 실제 외부 송금 결과는 별도 기록으로 남습니다.
          </p>
        </aside>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="text-xs font-semibold">내 출금 요청</div>
        <div className="mt-4 space-y-3">      <div className="mb-4 rounded-xl border border-white/[0.06] bg-black/10 p-4">
        <div className="text-[10px] font-semibold text-slate-400">최근 출금 상태 이력</div>
        <div className="mt-2 space-y-2">
          {(eventsResult.data ?? []).filter((event) => event.request_type === "withdrawal").slice(0, 20).map((event) => (
            <div key={event.event_id} className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
              <span>
                {event.old_status ? (statusLabel[event.old_status] ?? event.old_status) + " → " : "요청 생성 → "}
                {statusLabel[event.new_status ?? ""] ?? event.new_status}
                {event.reason ? " · " + event.reason : ""}
              </span>
              <span>{event.created_at ? new Date(event.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-"}</span>
            </div>
          ))}
          {!(eventsResult.data ?? []).some((event) => event.request_type === "withdrawal") ? <div className="text-[10px] text-slate-600">아직 상태 이력이 없습니다.</div> : null}
        </div>
      </div>
          {requestsResult.data?.map((request) => (
            <div
              key={request.id ?? request.request_key ?? crypto.randomUUID()}
              className="rounded-xl border border-white/[0.06] bg-black/10 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">
                    {request.asset_code ?? "자산"} · {String(request.amount)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {request.created_at
                      ? new Date(request.created_at).toLocaleString("ko-KR", {
                          timeZone: "Asia/Seoul"
                        })
                      : "접수일시 확인 중"}
                  </div>
                </div>
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-slate-300">
                  {statusLabel[request.status ?? ""] ?? request.status ?? "알 수 없음"}
                </span>
              </div>

              <div className="mt-3 text-[11px] text-slate-500">
                {request.destination_type === "bank" ? "은행 계좌" : "USDT 지갑"} · {request.destination_value ?? "수취 정보 없음"}
                {request.destination_network ? ` · ${request.destination_network}` : ""}
              </div>

              {request.external_reference ? (
                <div className="mt-2 text-[11px] text-slate-500">
                  처리 참조: {request.external_reference}
                </div>
              ) : null}

              {request.rejection_reason ? (
                <div className="mt-3 rounded-lg border border-rose-300/10 bg-rose-300/[0.04] p-3 text-[11px] text-rose-200">
                  반려 사유: {request.rejection_reason}
                </div>
              ) : null}

              {request.failure_reason ? (
                <div className="mt-3 rounded-lg border border-amber-300/10 bg-amber-300/[0.04] p-3 text-[11px] text-amber-100">
                  실패 사유: {request.failure_reason}
                </div>
              ) : null}

              {request.status === "pending" ? (
                <form action={cancelWithdrawal} className="mt-3">
                  <input type="hidden" name="request_id" value={request.id ?? ""} />
                  <button
                    type="submit"
                    className="rounded-lg border border-white/10 px-3 py-2 text-[10px] text-slate-300 hover:bg-white/[0.04]"
                  >
                    요청 취소
                  </button>
                </form>
              ) : null}
            </div>
          ))}

          {!requestsResult.data?.length ? (
            <div className="py-6 text-center text-xs text-slate-600">
              아직 출금 요청이 없습니다.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
