import { ArrowDownToLine, ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import {
  getActiveAssets,
  getUserDepositRequests,
  getUserFinanceRequestEvents
} from "@apex-matrix/database";
import { requireWebUser } from "@/lib/auth";
import { cancelDeposit, submitDepositRequest } from "./actions";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const statusLabel: Record<string, string> = {
  pending: "접수 대기",
  reviewing: "확인 중",
  completed: "입금 완료",
  rejected: "반려",
  cancelled: "취소됨"
};

export default async function DepositPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const { supabase, user } = await requireWebUser();
  const params = await searchParams;
  const success = first(params.success) === "1";
  const cancelled = first(params.cancelled) === "1";
  const error = first(params.error);

  const [assetsResult, requestsResult, eventsResult] = await Promise.all([
    getActiveAssets(supabase),
    getUserDepositRequests(supabase, user.id),
    getUserFinanceRequestEvents(supabase, 200)
  ]);

  if (assetsResult.error || requestsResult.error || eventsResult.error) {
    return (
      <section className="rounded-3xl border border-rose-300/10 bg-rose-300/[0.04] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">
          DEPOSIT
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">입금</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          입금 업무 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      </section>
    );
  }

  const requestKey = crypto.randomUUID();

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Deposit"
        title="입금 요청"
        description="입금 사실을 운영자에게 전달하면 운영자가 실제 입금을 확인한 뒤 Ledger에 반영합니다."
        icon={ArrowDownToLine}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="app-panel rounded-[24px] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">입금 요청 작성</div>
              <div className="app-muted mt-1 text-[10px]">요청 접수만으로 잔액이 증가하지 않습니다.</div>
            </div>
          </div>
        {success ? (
          <p className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] p-3 text-xs text-emerald-200">
            입금 요청이 접수되었습니다. 운영자 확인 후 잔액에 반영됩니다.
          </p>
        ) : null}
        {cancelled ? (
          <p className="mt-4 rounded-xl border border-sky-300/15 bg-sky-300/[0.05] p-3 text-xs text-sky-200">
            입금 요청을 취소했습니다.
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-xl border border-rose-300/10 bg-rose-300/[0.04] p-3 text-xs text-rose-200">
            입금 요청을 처리하지 못했습니다. 입력값과 현재 요청 상태를 확인해 주세요.
          </p>
        ) : null}

        <form action={submitDepositRequest} className="mt-6 grid gap-4 sm:max-w-xl">
          <input type="hidden" name="request_key" value={requestKey} />

          <label className="grid gap-2 text-xs text-slate-400">
            자산
            <select
              name="asset_id"
              required
              className="rounded-xl app-input px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
            >
              {assetsResult.data?.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.code} · {asset.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-xs text-slate-400">
            입금 금액
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

          <label className="grid gap-2 text-xs text-slate-400">
            메모
            <textarea
              name="user_note"
              rows={3}
              maxLength={500}
              placeholder="입금자명, 송금 시각 등 운영자가 확인하기 쉬운 내용을 남겨주세요."
              className="rounded-xl app-input px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
            />
          </label>

          <div className="rounded-xl app-card-soft p-4 text-[11px] leading-5 text-slate-500">
            실제 입금 방법은 운영자가 안내한 계좌 또는 지갑 정보를 사용하세요. 외부 금융기관이나 블록체인 네트워크 전송은 이 화면에서 자동 처리하지 않습니다.
          </div>

          <button
            type="submit"
            className="app-button-primary rounded-xl px-4 py-3 text-xs font-bold hover:bg-slate-100"
            disabled={!assetsResult.data?.length}
          >
            입금 요청 접수
          </button>
        </form>
      </div>

        </section>
        <aside className="app-card-soft h-fit rounded-[24px] p-5">
          <div className="text-xs font-semibold">입금 처리 안내</div>
          <p className="app-muted mt-2 text-[10px] leading-5">
            실제 송금은 운영자가 안내한 계좌 또는 지갑 정보를 사용하세요. 외부 금융기관·블록체인 전송은 자동 처리되지 않습니다.
          </p>
        </aside>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="text-xs font-semibold">내 입금 요청</div>
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/10 p-4">
        <div className="text-[10px] font-semibold text-slate-400">최근 입금 상태 이력</div>
        <div className="mt-2 space-y-2">
          {(eventsResult.data ?? []).filter((event) => event.request_type === "deposit").slice(0, 20).map((event) => (
            <div key={event.event_id} className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
              <span>
                {event.old_status ? (statusLabel[event.old_status] ?? event.old_status) + " → " : "요청 생성 → "}
                {statusLabel[event.new_status ?? ""] ?? event.new_status}
                {event.reason ? " · " + event.reason : ""}
              </span>
              <span>{event.created_at ? new Date(event.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-"}</span>
            </div>
          ))}
          {!(eventsResult.data ?? []).some((event) => event.request_type === "deposit") ? <div className="text-[10px] text-slate-600">아직 상태 이력이 없습니다.</div> : null}
        </div>
      </div>      <div className="mt-4 space-y-3">
          {requestsResult.data?.map((request) => (
            <div
              key={request.id}
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

              {request.external_reference ? (
                <div className="mt-3 text-[11px] text-slate-500">
                  확인 참조: {request.external_reference}
                </div>
              ) : null}

              {request.rejection_reason ? (
                <div className="mt-3 rounded-lg border border-rose-300/10 bg-rose-300/[0.04] p-3 text-[11px] text-rose-200">
                  반려 사유: {request.rejection_reason}
                </div>
              ) : null}

              {request.status === "pending" ? (
                <form action={cancelDeposit} className="mt-3">
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
              아직 입금 요청이 없습니다.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
