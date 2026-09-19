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
import { commonMessages, localeFormats } from "@apex-matrix/i18n";
import { getRequestLocale } from "@/lib/locale";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const pageMessages = {
  ko: { title: "출금 요청", description: "출금 요청을 접수하면 운영자가 확인합니다. 승인 전에는 원장 자금이 이동하지 않습니다.", loadError: "출금 업무 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", success: "출금 요청이 접수되었습니다. 운영자 확인 후 처리됩니다.", cancelled: "출금 요청을 취소했습니다.", error: "출금 요청을 처리하지 못했습니다. 잔액, 자산 정밀도, 수취 정보를 확인해 주세요.", asset: "자산", balance: "잔액", amount: "출금 금액", amountPlaceholder: "예: 100000 또는 10.5", method: "출금 방식", bank: "은행 계좌", wallet: "USDT 지갑", recipient: "예금주 / 수취인", recipientPlaceholder: "은행 계좌 출금 시 입력", destination: "계좌번호 / 지갑 주소", destinationPlaceholder: "출금 받을 계좌번호 또는 지갑 주소", network: "네트워크", networkPlaceholder: "USDT 출금 시 예: TRC20 / ERC20", memo: "메모", memoPlaceholder: "운영자가 확인해야 할 추가 내용을 남겨주세요.", notice: "출금 승인 후 사용자 잔액에서 금액이 예약됩니다. 실제 외부 송금은 운영자가 수동으로 진행하며, 완료 또는 실패 결과가 별도로 기록됩니다.", submit: "출금 요청 접수", safety: "출금 안전 안내", mine: "내 출금 요청", recent: "최근 출금 상태 이력", created: "요청 생성", noEvents: "아직 상태 이력이 없습니다.", pendingDate: "접수일시 확인 중", unknown: "알 수 없음", noDestination: "수취 정보 없음", reference: "처리 참조", rejection: "반려 사유", failure: "실패 사유", cancel: "요청 취소", empty: "아직 출금 요청이 없습니다.", statuses: { pending: "접수 대기", reviewing: "확인 중", processing: "송금 처리 중", completed: "출금 완료", rejected: "반려", cancelled: "취소됨", failed: "처리 실패" } },
  ja: { title: "出金申請", description: "出金申請は運営が確認します。承認前に台帳上の資金が移動することはありません。", loadError: "出金情報を読み込めませんでした。しばらくしてからお試しください。", success: "出金申請を受け付けました。運営の確認後に処理されます。", cancelled: "出金申請を取り消しました。", error: "出金申請を処理できませんでした。残高、資産の桁数、受取情報をご確認ください。", asset: "資産", balance: "残高", amount: "出金額", amountPlaceholder: "例：100000 または 10.5", method: "出金方法", bank: "銀行口座", wallet: "USDTウォレット", recipient: "口座名義 / 受取人", recipientPlaceholder: "銀行口座への出金時に入力", destination: "口座番号 / ウォレットアドレス", destinationPlaceholder: "受取口座番号またはウォレットアドレス", network: "ネットワーク", networkPlaceholder: "USDTの場合：TRC20 / ERC20", memo: "メモ", memoPlaceholder: "運営が確認すべき追加情報をご入力ください。", notice: "承認後、出金額は残高から予約されます。外部送金は運営が手動で行い、完了または失敗の結果を別途記録します。", submit: "出金を申請", safety: "出金の安全案内", mine: "出金申請一覧", recent: "最近の状態履歴", created: "申請作成", noEvents: "状態履歴はまだありません。", pendingDate: "受付日時を確認中", unknown: "不明", noDestination: "受取情報なし", reference: "処理番号", rejection: "却下理由", failure: "失敗理由", cancel: "申請を取消", empty: "出金申請はまだありません。", statuses: { pending: "受付待ち", reviewing: "確認中", processing: "送金処理中", completed: "出金完了", rejected: "却下", cancelled: "取消済み", failed: "処理失敗" } },
  en: { title: "Withdrawal request", description: "Operations reviews each withdrawal request. Funds do not move in the ledger before approval.", loadError: "We could not load withdrawal information. Please try again shortly.", success: "Your withdrawal request was received and will be processed after review.", cancelled: "Your withdrawal request was cancelled.", error: "We could not process the withdrawal request. Check your balance, asset precision, and recipient details.", asset: "Asset", balance: "Balance", amount: "Withdrawal amount", amountPlaceholder: "Example: 100000 or 10.5", method: "Withdrawal method", bank: "Bank account", wallet: "USDT wallet", recipient: "Account holder / recipient", recipientPlaceholder: "Required for bank withdrawals", destination: "Account number / wallet address", destinationPlaceholder: "Receiving account number or wallet address", network: "Network", networkPlaceholder: "For USDT: TRC20 / ERC20", memo: "Note", memoPlaceholder: "Add any information operations should review.", notice: "After approval, the amount is reserved from your balance. Operations performs the external transfer manually and records completion or failure separately.", submit: "Submit withdrawal request", safety: "Withdrawal safety", mine: "Your withdrawal requests", recent: "Recent status history", created: "Request created", noEvents: "No status history yet.", pendingDate: "Submission time pending", unknown: "Unknown", noDestination: "No recipient details", reference: "Processing reference", rejection: "Rejection reason", failure: "Failure reason", cancel: "Cancel request", empty: "No withdrawal requests yet.", statuses: { pending: "Pending", reviewing: "Under review", processing: "Transfer in progress", completed: "Completed", rejected: "Rejected", cancelled: "Cancelled", failed: "Failed" } }
};

export default async function WithdrawalPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const { supabase, user } = await requireWebUser();
  const locale = await getRequestLocale();
  const messages = pageMessages[locale];
  const common = commonMessages[locale];
  const dateFormat = localeFormats[locale];
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
          {common.nav.withdrawal}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{messages.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {messages.loadError}
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
        eyebrow={common.nav.withdrawal}
        title={messages.title}
        description={messages.description}
        icon={ArrowUpFromLine}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="app-panel rounded-[24px] p-6 sm:p-8">
        {success ? (
          <p className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] p-3 text-xs text-emerald-200">
            {messages.success}
          </p>
        ) : null}
        {cancelled ? (
          <p className="mt-4 rounded-xl border border-sky-300/15 bg-sky-300/[0.05] p-3 text-xs text-sky-200">
            {messages.cancelled}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-xl border border-rose-300/10 bg-rose-300/[0.04] p-3 text-xs text-rose-200">
            {messages.error}
          </p>
        ) : null}

        <form action={submitWithdrawalRequest} className="mt-6 grid gap-4">
          <input type="hidden" name="request_key" value={requestKey} />
          <input type="hidden" name="locale" value={locale} />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-xs text-slate-400">
              {messages.asset}
              <select
                name="asset_id"
                required
                className="rounded-xl app-input px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
              >
                {assetsResult.data?.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.code} · {messages.balance} {String(balanceByAsset.get(asset.id) ?? 0)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-xs text-slate-400">
              {messages.amount}
              <input
                name="amount"
                type="text"
                inputMode="decimal"
                placeholder={messages.amountPlaceholder}
                required
                autoComplete="off"
                className="rounded-xl app-input px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
              />
            </label>
          </div>

          <label className="grid gap-2 text-xs text-slate-400">
            {messages.method}
            <select
              name="destination_type"
              defaultValue="bank"
              required
              className="rounded-xl app-input px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
            >
              <option value="bank">{messages.bank}</option>
              <option value="wallet">{messages.wallet}</option>
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2 text-xs text-slate-400">
              {messages.recipient}
              <input
                name="destination_name"
                type="text"
                maxLength={120}
                placeholder={messages.recipientPlaceholder}
                className="rounded-xl app-input px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
              />
            </label>

            <label className="grid gap-2 text-xs text-slate-400 sm:col-span-2">
              {messages.destination}
              <input
                name="destination_value"
                type="text"
                maxLength={320}
                required
                placeholder={messages.destinationPlaceholder}
                className="rounded-xl app-input px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
              />
            </label>
          </div>

          <label className="grid gap-2 text-xs text-slate-400">
            {messages.network}
            <input
              name="destination_network"
              type="text"
              maxLength={64}
              placeholder={messages.networkPlaceholder}
              className="rounded-xl app-input px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
            />
          </label>

          <label className="grid gap-2 text-xs text-slate-400">
            {messages.memo}
            <textarea
              name="user_note"
              rows={3}
              maxLength={500}
              placeholder={messages.memoPlaceholder}
              className="rounded-xl app-input px-4 py-3 text-sm text-white outline-none focus:border-emerald-300/40"
            />
          </label>

          <div className="rounded-xl border border-amber-300/10 bg-amber-300/[0.04] p-4 text-[11px] leading-5 text-amber-100/70">
            {messages.notice}
          </div>

          <button
            type="submit"
            className="app-button-primary rounded-xl px-4 py-3 text-xs font-bold hover:bg-slate-100"
            disabled={!assetsResult.data?.length}
          >
            {messages.submit}
          </button>
        </form>
        </section>

        <aside className="app-card-soft h-fit rounded-[24px] p-5">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <ShieldCheck className="h-4 w-4" style={{ color: "var(--accent)" }} />
            {messages.safety}
          </div>
          <p className="app-muted mt-2 text-[10px] leading-5">
            {messages.notice}
          </p>
        </aside>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="text-xs font-semibold">{messages.mine}</div>
        <div className="mt-4 space-y-3">      <div className="mb-4 rounded-xl border border-white/[0.06] bg-black/10 p-4">
        <div className="text-[10px] font-semibold text-slate-400">{messages.recent}</div>
        <div className="mt-2 space-y-2">
          {(eventsResult.data ?? []).filter((event) => event.request_type === "withdrawal").slice(0, 20).map((event) => (
            <div key={event.event_id} className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
              <span>
                {event.old_status ? (messages.statuses[event.old_status as keyof typeof messages.statuses] ?? event.old_status) + " → " : `${messages.created} → `}
                {messages.statuses[event.new_status as keyof typeof messages.statuses] ?? event.new_status}
                {event.reason ? " · " + event.reason : ""}
              </span>
              <span>{event.created_at ? new Date(event.created_at).toLocaleString(dateFormat.intlLocale, { timeZone: dateFormat.timeZone }) : "-"}</span>
            </div>
          ))}
          {!(eventsResult.data ?? []).some((event) => event.request_type === "withdrawal") ? <div className="text-[10px] text-slate-600">{messages.noEvents}</div> : null}
        </div>
      </div>
          {requestsResult.data?.map((request, index) => (
            <div
              key={request.id ?? request.request_key ?? `${request.created_at ?? "request"}-${index}`}
              className="rounded-xl border border-white/[0.06] bg-black/10 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">
                    {request.asset_code ?? messages.asset} · {String(request.amount)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {request.created_at
                      ? new Date(request.created_at).toLocaleString(dateFormat.intlLocale, {
                          timeZone: dateFormat.timeZone
                        })
                      : messages.pendingDate}
                  </div>
                </div>
                <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-slate-300">
                  {messages.statuses[request.status as keyof typeof messages.statuses] ?? request.status ?? messages.unknown}
                </span>
              </div>

              <div className="mt-3 text-[11px] text-slate-500">
                {request.destination_type === "bank" ? messages.bank : messages.wallet} · {request.destination_value ?? messages.noDestination}
                {request.destination_network ? ` · ${request.destination_network}` : ""}
              </div>

              {request.external_reference ? (
                <div className="mt-2 text-[11px] text-slate-500">
                  {messages.reference}: {request.external_reference}
                </div>
              ) : null}

              {request.rejection_reason ? (
                <div className="mt-3 rounded-lg border border-rose-300/10 bg-rose-300/[0.04] p-3 text-[11px] text-rose-200">
                  {messages.rejection}: {request.rejection_reason}
                </div>
              ) : null}

              {request.failure_reason ? (
                <div className="mt-3 rounded-lg border border-amber-300/10 bg-amber-300/[0.04] p-3 text-[11px] text-amber-100">
                  {messages.failure}: {request.failure_reason}
                </div>
              ) : null}

              {request.status === "pending" ? (
                <form action={cancelWithdrawal} className="mt-3">
                  <input type="hidden" name="request_id" value={request.id ?? ""} />
                  <input type="hidden" name="locale" value={locale} />
                  <button
                    type="submit"
                    className="rounded-lg border border-white/10 px-3 py-2 text-[10px] text-slate-300 hover:bg-white/[0.04]"
                  >
                    {messages.cancel}
                  </button>
                </form>
              ) : null}
            </div>
          ))}

          {!requestsResult.data?.length ? (
            <div className="py-6 text-center text-xs text-slate-600">
              {messages.empty}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
