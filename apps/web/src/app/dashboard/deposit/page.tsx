import { ArrowDownToLine, ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import {
  getActiveAssets,
  getUserDepositRequests,
  getUserFinanceRequestEvents
} from "@apex-matrix/database";
import { requireWebUser } from "@/lib/auth";
import { cancelDeposit, submitDepositRequest } from "./actions";
import { commonMessages, localeFormats } from "@apex-matrix/i18n";
import { getRequestLocale } from "@/lib/locale";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const pageMessages = {
  ko: {
    title: "입금 요청", description: "입금 사실을 운영자에게 전달하면 운영자가 실제 입금을 확인한 뒤 원장에 반영합니다.", loadError: "입금 업무 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", formTitle: "입금 요청 작성", formHint: "요청 접수만으로 잔액이 증가하지 않습니다.", success: "입금 요청이 접수되었습니다. 운영자 확인 후 잔액에 반영됩니다.", cancelled: "입금 요청을 취소했습니다.", error: "입금 요청을 처리하지 못했습니다. 입력값과 현재 요청 상태를 확인해 주세요.", asset: "자산", amount: "입금 금액", amountPlaceholder: "예: 100000 또는 10.5", memo: "메모", memoPlaceholder: "입금자명, 송금 시각 등 운영자가 확인하기 쉬운 내용을 남겨주세요.", notice: "실제 입금 방법은 운영자가 안내한 계좌 또는 지갑 정보를 사용하세요. 외부 금융기관이나 블록체인 네트워크 전송은 이 화면에서 자동 처리하지 않습니다.", submit: "입금 요청 접수", guideTitle: "입금 처리 안내", mine: "내 입금 요청", recent: "최근 입금 상태 이력", created: "요청 생성", noEvents: "아직 상태 이력이 없습니다.", pendingDate: "접수일시 확인 중", unknown: "알 수 없음", reference: "확인 참조", rejection: "반려 사유", cancel: "요청 취소", empty: "아직 입금 요청이 없습니다.", statuses: { pending: "접수 대기", reviewing: "확인 중", completed: "입금 완료", rejected: "반려", cancelled: "취소됨" }
  },
  ja: {
    title: "入金申請", description: "入金内容を運営へ連絡し、実際の入金確認後に台帳へ反映します。", loadError: "入金情報を読み込めませんでした。しばらくしてからお試しください。", formTitle: "入金申請を作成", formHint: "申請を送信しただけでは残高は増えません。", success: "入金申請を受け付けました。運営の確認後に残高へ反映されます。", cancelled: "入金申請を取り消しました。", error: "入金申請を処理できませんでした。入力内容と現在の状態をご確認ください。", asset: "資産", amount: "入金額", amountPlaceholder: "例：100000 または 10.5", memo: "メモ", memoPlaceholder: "振込名義や送金時刻など、確認に必要な情報をご入力ください。", notice: "実際の入金には運営から案内された口座またはウォレットをご利用ください。外部金融機関やブロックチェーンへの送金はこの画面では自動処理されません。", submit: "入金を申請", guideTitle: "入金処理のご案内", mine: "入金申請一覧", recent: "最近の状態履歴", created: "申請作成", noEvents: "状態履歴はまだありません。", pendingDate: "受付日時を確認中", unknown: "不明", reference: "確認番号", rejection: "却下理由", cancel: "申請を取消", empty: "入金申請はまだありません。", statuses: { pending: "受付待ち", reviewing: "確認中", completed: "入金完了", rejected: "却下", cancelled: "取消済み" }
  },
  en: {
    title: "Deposit request", description: "Report a deposit to operations. It is added to the ledger only after the actual deposit is verified.", loadError: "We could not load deposit information. Please try again shortly.", formTitle: "Create deposit request", formHint: "Submitting a request does not increase your balance.", success: "Your deposit request was received. It will be reflected after verification.", cancelled: "Your deposit request was cancelled.", error: "We could not process the deposit request. Check the input and current request status.", asset: "Asset", amount: "Deposit amount", amountPlaceholder: "Example: 100000 or 10.5", memo: "Note", memoPlaceholder: "Add the sender name, transfer time, or other details needed for verification.", notice: "Use only the account or wallet details provided by operations. Transfers through an external institution or blockchain are not executed automatically on this page.", submit: "Submit deposit request", guideTitle: "Deposit process", mine: "Your deposit requests", recent: "Recent status history", created: "Request created", noEvents: "No status history yet.", pendingDate: "Submission time pending", unknown: "Unknown", reference: "Verification reference", rejection: "Rejection reason", cancel: "Cancel request", empty: "No deposit requests yet.", statuses: { pending: "Pending", reviewing: "Under review", completed: "Completed", rejected: "Rejected", cancelled: "Cancelled" }
  }
};

export default async function DepositPage({
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

  const [assetsResult, requestsResult, eventsResult] = await Promise.all([
    getActiveAssets(supabase),
    getUserDepositRequests(supabase, user.id),
    getUserFinanceRequestEvents(supabase, 200)
  ]);

  if (assetsResult.error || requestsResult.error || eventsResult.error) {
    return (
      <section className="rounded-3xl border border-rose-300/10 bg-rose-300/[0.04] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">
          {common.nav.deposit}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{messages.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {messages.loadError}
        </p>
      </section>
    );
  }

  const requestKey = crypto.randomUUID();

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow={common.nav.deposit}
        title={messages.title}
        description={messages.description}
        icon={ArrowDownToLine}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="app-panel rounded-[24px] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">{messages.formTitle}</div>
              <div className="app-muted mt-1 text-[10px]">{messages.formHint}</div>
            </div>
          </div>
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

        <form action={submitDepositRequest} className="mt-6 grid gap-4 sm:max-w-xl">
          <input type="hidden" name="request_key" value={requestKey} />
          <input type="hidden" name="locale" value={locale} />

          <label className="grid gap-2 text-xs text-slate-400">
            {messages.asset}
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

          <div className="rounded-xl app-card-soft p-4 text-[11px] leading-5 text-slate-500">
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
          <div className="text-xs font-semibold">{messages.guideTitle}</div>
          <p className="app-muted mt-2 text-[10px] leading-5">
            {messages.notice}
          </p>
        </aside>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="text-xs font-semibold">{messages.mine}</div>
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/10 p-4">
        <div className="text-[10px] font-semibold text-slate-400">{messages.recent}</div>
        <div className="mt-2 space-y-2">
          {(eventsResult.data ?? []).filter((event) => event.request_type === "deposit").slice(0, 20).map((event) => (
            <div key={event.event_id} className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
              <span>
                {event.old_status ? (messages.statuses[event.old_status as keyof typeof messages.statuses] ?? event.old_status) + " → " : `${messages.created} → `}
                {messages.statuses[event.new_status as keyof typeof messages.statuses] ?? event.new_status}
                {event.reason ? " · " + event.reason : ""}
              </span>
              <span>{event.created_at ? new Date(event.created_at).toLocaleString(dateFormat.intlLocale, { timeZone: dateFormat.timeZone }) : "-"}</span>
            </div>
          ))}
          {!(eventsResult.data ?? []).some((event) => event.request_type === "deposit") ? <div className="text-[10px] text-slate-600">{messages.noEvents}</div> : null}
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

              {request.external_reference ? (
                <div className="mt-3 text-[11px] text-slate-500">
                  {messages.reference}: {request.external_reference}
                </div>
              ) : null}

              {request.rejection_reason ? (
                <div className="mt-3 rounded-lg border border-rose-300/10 bg-rose-300/[0.04] p-3 text-[11px] text-rose-200">
                  {messages.rejection}: {request.rejection_reason}
                </div>
              ) : null}

              {request.status === "pending" ? (
                <form action={cancelDeposit} className="mt-3">
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
