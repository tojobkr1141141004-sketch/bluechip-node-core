import { getAdminDepositRequests, getAdminWithdrawalRequests } from "@apex-matrix/database";
import { requireAdminUser } from "@/lib/auth";
import {
  approveDeposit,
  approveWithdrawal,
  beginDepositReview,
  beginWithdrawalReview,
  completeWithdrawal,
  failWithdrawal,
  rejectDeposit,
  rejectWithdrawal
} from "./actions";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const depositStatusLabel: Record<string, string> = {
  pending: "접수 대기",
  reviewing: "확인 중",
  completed: "입금 완료",
  rejected: "반려",
  cancelled: "취소됨"
};

const withdrawalStatusLabel: Record<string, string> = {
  pending: "접수 대기",
  reviewing: "확인 중",
  processing: "송금 처리 중",
  completed: "출금 완료",
  rejected: "반려",
  cancelled: "취소됨",
  failed: "처리 실패"
};

function formatDate(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
    : "시간 정보 없음";
}

function Notice({ success, error }: { success: boolean; error?: string }) {
  if (success) {
    return (
      <p className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] p-3 text-xs text-emerald-200">
        금융 요청 처리가 완료되었습니다.
      </p>
    );
  }

  if (!error) return null;

  const messages: Record<string, string> = {
    forbidden: "금융 처리 권한이 없습니다.",
    not_found: "요청을 찾을 수 없습니다.",
    state: "현재 요청 상태에서는 해당 작업을 할 수 없습니다.",
    reference: "외부 처리 참조값을 입력하세요.",
    reason: "사유를 입력하세요.",
    balance: "사용자 잔액이 부족하여 출금 예약을 진행할 수 없습니다.",
    invalid: "요청값을 확인하세요."
  };

  return (
    <p className="rounded-xl border border-rose-300/10 bg-rose-300/[0.04] p-3 text-xs text-rose-200">
      {messages[error] ?? "금융 요청을 처리하지 못했습니다."}
    </p>
  );
}

function UserId({ id }: { id: string }) {
  return (
    <div className="mt-1 max-w-full truncate font-mono text-[10px] text-zinc-600" title={id}>
      회원 ID · {id}
    </div>
  );
}

export default async function FinancePage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const { supabase } = await requireAdminUser();
  const params = await searchParams;
  const success = first(params.success) === "1";
  const error = first(params.error);

  const [depositsResult, withdrawalsResult] = await Promise.all([
    getAdminDepositRequests(supabase),
    getAdminWithdrawalRequests(supabase)
  ]);

  if (depositsResult.error || withdrawalsResult.error) {
    return (
      <section className="rounded-3xl border border-rose-300/10 bg-rose-300/[0.04] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">
          FINANCE
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">금융 운영</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          금융 요청을 조회할 수 없습니다. finance.read 권한과 DB 정책을 확인해 주세요.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
          FINANCE
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">금융 운영</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
          입금과 출금 요청을 운영자가 직접 확인합니다. 승인·정정·실패 처리는 모두 DB 금융 함수와 Ledger를 통해 기록되며 잔액 숫자를 직접 수정하지 않습니다.
        </p>
        <div className="mt-4">
          <Notice success={success} error={error} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">입금 요청</h2>
              <p className="mt-1 text-[11px] text-zinc-600">
                실제 입금 확인 후 승인하면 사용자 계정에 Ledger가 생성됩니다.
              </p>
            </div>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-500">
              {depositsResult.data?.filter(
                (item) => item.status !== "completed" && item.status !== "rejected" && item.status !== "cancelled"
              ).length ?? 0}건 대기
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {depositsResult.data?.map((request, index) => {
              const id = request.id ?? "";
              const status = request.status ?? "";
              const key = id || `deposit-${request.request_key ?? index}`;

              return (
                <article
                  key={key}
                  className="rounded-xl border border-white/[0.06] bg-black/10 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        {request.asset_code ?? "자산"} · {String(request.amount)}
                      </div>
                      <UserId id={request.user_id ?? "알 수 없는 회원"} />
                      <div className="mt-2 text-[10px] text-zinc-600">
                        접수 {formatDate(request.created_at)}
                      </div>
                    </div>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-300">
                      {depositStatusLabel[status] ?? status || "상태 확인 중"}
                    </span>
                  </div>

                  {request.user_note ? (
                    <div className="mt-3 rounded-lg border border-white/[0.05] bg-white/[0.015] p-3 text-[11px] leading-5 text-zinc-400">
                      사용자 메모: {request.user_note}
                    </div>
                  ) : null}

                  {request.external_reference ? (
                    <div className="mt-2 text-[11px] text-zinc-500">
                      참조: {request.external_reference}
                    </div>
                  ) : null}

                  {id && (status === "pending" || status === "reviewing") ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {status === "pending" ? (
                        <form action={beginDepositReview}>
                          <input type="hidden" name="request_id" value={id} />
                          <button
                            type="submit"
                            className="rounded-lg bg-white px-3 py-2 text-[10px] font-bold text-zinc-950"
                          >
                            확인 시작
                          </button>
                        </form>
                      ) : null}

                      <form action={approveDeposit} className="flex flex-wrap gap-2">
                        <input type="hidden" name="request_id" value={id} />
                        <input
                          name="external_reference"
                          required
                          maxLength={160}
                          placeholder="입금 확인 참조값"
                          className="w-52 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] outline-none focus:border-emerald-300/40"
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-2 text-[10px] font-semibold text-emerald-200"
                        >
                          입금 승인
                        </button>
                      </form>

                      <form action={rejectDeposit} className="flex flex-wrap gap-2">
                        <input type="hidden" name="request_id" value={id} />
                        <input
                          name="reason"
                          required
                          maxLength={500}
                          placeholder="반려 사유"
                          className="w-52 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] outline-none focus:border-rose-300/40"
                        />
                        <button
                          type="submit"
                          className="rounded-lg border border-rose-300/15 px-3 py-2 text-[10px] text-rose-200"
                        >
                          반려
                        </button>
                      </form>
                    </div>
                  ) : null}
                </article>
              );
            })}

            {!depositsResult.data?.length ? (
              <div className="py-8 text-center text-xs text-zinc-600">
                현재 입금 요청이 없습니다.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">출금 요청</h2>
              <p className="mt-1 text-[11px] text-zinc-600">
                승인 시 금액을 출금 대기 계정으로 예약합니다. 실제 송금은 운영자가 수동 처리합니다.
              </p>
            </div>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-500">
              {withdrawalsResult.data?.filter(
                (item) =>
                  item.status === "pending" ||
                  item.status === "reviewing" ||
                  item.status === "processing"
              ).length ?? 0}건 처리 중
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {withdrawalsResult.data?.map((request, index) => {
              const id = request.id ?? "";
              const status = request.status ?? "";
              const key = id || `withdrawal-${request.request_key ?? index}`;

              return (
                <article
                  key={key}
                  className="rounded-xl border border-white/[0.06] bg-black/10 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">
                        {request.asset_code ?? "자산"} · {String(request.amount)}
                      </div>
                      <UserId id={request.user_id ?? "알 수 없는 회원"} />
                      <div className="mt-2 text-[10px] text-zinc-600">
                        접수 {formatDate(request.created_at)}
                      </div>
                    </div>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-300">
                      {withdrawalStatusLabel[status] ?? status || "상태 확인 중"}
                    </span>
                  </div>

                  <div className="mt-3 rounded-lg border border-white/[0.05] bg-white/[0.015] p-3 text-[11px] leading-5 text-zinc-400">
                    <div>
                      수취 방식: {request.destination_type === "bank" ? "은행 계좌" : "USDT 지갑"}
                    </div>
                    {request.destination_name ? <div>수취인: {request.destination_name}</div> : null}
                    <div className="break-all">
                      수취 정보: {request.destination_value ?? "수취 정보 없음"}
                    </div>
                    {request.destination_network ? (
                      <div>네트워크: {request.destination_network}</div>
                    ) : null}
                    {request.user_note ? (
                      <div className="mt-2">사용자 메모: {request.user_note}</div>
                    ) : null}
                  </div>

                  {request.external_reference ? (
                    <div className="mt-2 text-[11px] text-zinc-500">
                      외부 처리 참조: {request.external_reference}
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-2">
                    {id && status === "pending" ? (
                      <form action={beginWithdrawalReview}>
                        <input type="hidden" name="request_id" value={id} />
                        <button
                          type="submit"
                          className="rounded-lg bg-white px-3 py-2 text-[10px] font-bold text-zinc-950"
                        >
                          확인 시작
                        </button>
                      </form>
                    ) : null}

                    {id && (status === "pending" || status === "reviewing") ? (
                      <div className="flex flex-wrap gap-2">
                        <form action={approveWithdrawal}>
                          <input type="hidden" name="request_id" value={id} />
                          <button
                            type="submit"
                            className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-2 text-[10px] font-semibold text-emerald-200"
                          >
                            승인 및 금액 예약
                          </button>
                        </form>
                        <form action={rejectWithdrawal} className="flex flex-wrap gap-2">
                          <input type="hidden" name="request_id" value={id} />
                          <input
                            name="reason"
                            required
                            maxLength={500}
                            placeholder="반려 사유"
                            className="w-52 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] outline-none focus:border-rose-300/40"
                          />
                          <button
                            type="submit"
                            className="rounded-lg border border-rose-300/15 px-3 py-2 text-[10px] text-rose-200"
                          >
                            반려
                          </button>
                        </form>
                      </div>
                    ) : null}

                    {id && status === "processing" ? (
                      <div className="space-y-2 rounded-xl border border-amber-300/10 bg-amber-300/[0.03] p-3">
                        <div className="text-[10px] font-semibold text-amber-100">
                          실제 외부 송금을 운영자 수동으로 처리한 뒤 결과를 기록하세요.
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <form action={completeWithdrawal} className="flex flex-wrap gap-2">
                            <input type="hidden" name="request_id" value={id} />
                            <input
                              name="external_reference"
                              required
                              maxLength={160}
                              placeholder="송금 참조값"
                              className="w-52 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] outline-none focus:border-emerald-300/40"
                            />
                            <button
                              type="submit"
                              className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-2 text-[10px] font-semibold text-emerald-200"
                            >
                              송금 완료 기록
                            </button>
                          </form>
                          <form action={failWithdrawal} className="flex flex-wrap gap-2">
                            <input type="hidden" name="request_id" value={id} />
                            <input
                              name="reason"
                              required
                              maxLength={500}
                              placeholder="실패 사유"
                              className="w-52 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px] outline-none focus:border-amber-300/40"
                            />
                            <button
                              type="submit"
                              className="rounded-lg border border-amber-300/15 px-3 py-2 text-[10px] text-amber-100"
                            >
                              실패 처리 및 금액 반환
                            </button>
                          </form>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}

            {!withdrawalsResult.data?.length ? (
              <div className="py-8 text-center text-xs text-zinc-600">
                현재 출금 요청이 없습니다.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
