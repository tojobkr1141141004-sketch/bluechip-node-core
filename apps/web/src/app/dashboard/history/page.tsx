import { getUserLedgerHistory } from "@apex-matrix/database";
import { requireWebUser } from "@/lib/auth";

export const instant = false;

const TYPE_LABELS: Record<string, string> = {
  deposit: "입금",
  withdrawal: "출금",
  mining_reward: "채굴 보상",
  settlement: "정산",
  adjustment: "수동 조정",
  reversal: "정정 거래"
};

const STATUS_LABELS: Record<string, string> = {
  posted: "처리 완료",
  reversed: "정정됨",
  reversal: "정정 거래"
};

export default async function HistoryPage() {
  const { supabase, user } = await requireWebUser();
  const { data, error } = await getUserLedgerHistory(supabase, user.id);

  if (error) {
    return (
      <section className="rounded-3xl border border-red-300/10 bg-red-300/[0.04] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300/80">
          HISTORY
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">활동 기록</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          금융 기록을 불러오지 못했습니다. 관리자에게 확인을 요청해 주세요.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
        HISTORY
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">금융 활동 기록</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        원장에 기록된 내 금융 거래를 최신순으로 보여줍니다. 원본 거래는 수정하거나 삭제하지 않고 정정 거래로 남깁니다.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
        <div className="hidden grid-cols-[1fr_120px_120px_140px] gap-4 border-b border-white/[0.07] px-5 py-3 text-[10px] uppercase tracking-[0.15em] text-slate-500 sm:grid">
          <div>거래</div>
          <div>자산</div>
          <div>변동</div>
          <div>처리일시</div>
        </div>

        {(data ?? []).map((item) => (
          <div
            key={item.entry_id}
            className="grid gap-3 border-b border-white/[0.06] px-5 py-4 last:border-b-0 sm:grid-cols-[1fr_120px_120px_140px] sm:items-center"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {TYPE_LABELS[item.transaction_type] ?? item.transaction_type}
              </div>
              <div className="mt-1 truncate text-[11px] text-slate-500">
                {item.description || "금융 원장 거래"}
                {STATUS_LABELS[item.transaction_status]
                  ? ` · ${STATUS_LABELS[item.transaction_status]}`
                  : ""}
              </div>
            </div>
            <div className="text-sm font-semibold">{item.asset_code}</div>
            <div className="text-sm font-semibold">
              <span className={item.direction === "credit" ? "text-emerald-200" : "text-amber-200"}>
                {item.direction === "credit" ? "+" : "-"}
                {String(item.amount)}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              {new Date(item.entry_created_at).toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul"
              })}
            </div>
          </div>
        ))}

        {(data ?? []).length === 0 && (
          <div className="px-5 py-8 text-sm text-slate-500">
            아직 기록된 금융 거래가 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}
