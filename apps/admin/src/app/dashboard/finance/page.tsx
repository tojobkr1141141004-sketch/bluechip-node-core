import { getAdminLedgerTransactions } from "@apex-matrix/database";
import { requireAdminUser } from "@/lib/auth";

export const instant = false;

const TYPE_LABELS: Record<string, string> = {
  deposit: "입금",
  withdrawal: "출금",
  mining_reward: "채굴 보상",
  settlement: "정산",
  adjustment: "수동 조정",
  reversal: "정정 거래"
};

export default async function FinancePage() {
  const { supabase } = await requireAdminUser();
  const { data, error } = await getAdminLedgerTransactions(supabase);

  if (error) {
    return (
      <section className="rounded-3xl border border-red-300/10 bg-red-300/[0.04] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300/80">
          FINANCE
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">금융 원장</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          금융 원장을 불러오지 못했습니다. 금융 조회 권한과 DB 보안 정책을 확인해 주세요.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
        FINANCE
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">금융 원장</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
        관리자는 원장을 직접 수정하지 않습니다. 금융 사건은 정해진 거래 또는 정정 거래를 통해 기록합니다.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
        <div className="grid grid-cols-[1fr_100px_160px] gap-4 border-b border-white/[0.07] px-5 py-3 text-[10px] uppercase tracking-[0.15em] text-slate-500">
          <div>거래</div>
          <div>상태</div>
          <div>처리일시</div>
        </div>

        {(data ?? []).map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[1fr_100px_160px] gap-4 border-b border-white/[0.06] px-5 py-4 last:border-b-0"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {TYPE_LABELS[item.transaction_type] ?? item.transaction_type}
              </div>
              <div className="mt-1 truncate text-[11px] text-slate-500">
                {item.description || "금융 원장 거래"}
              </div>
            </div>
            <div className="text-xs text-slate-400">
              {item.reversal_of_transaction_id ? "정정 거래" : "기록 완료"}
            </div>
            <div className="text-[11px] text-slate-500">
              {new Date(item.created_at).toLocaleString("ko-KR", {
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
