import { randomUUID } from "crypto";
import { Handshake, ShieldCheck } from "lucide-react";
import {
  getAdminMiningContractCancellations,
  getAdminMiningContracts,
  getAdminMiningProductVersions,
  getMiningMemberCandidates
} from "@apex-matrix/database";
import { requireAdminUser } from "@/lib/auth";
import {
  cancelContract,
  recalculateContract,
  submitMiningContract
} from "../mining/actions";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-";
}

function formatAmount(value: number | null | undefined) {
  return value == null ? "-" : String(value);
}

const STATUS_LABELS: Record<string, string> = {
  active: "운영 중",
  completed: "완료",
  cancelled: "취소"
};

export default async function ContractsPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireAdminUser();
  const params = await searchParams;
  const success = first(params.success);
  const error = first(params.error);

  const [versionsResult, membersResult, contractsResult, cancellationsResult] = await Promise.all([
    getAdminMiningProductVersions(supabase),
    getMiningMemberCandidates(supabase),
    getAdminMiningContracts(supabase),
    getAdminMiningContractCancellations(supabase)
  ]);

  if (versionsResult.error || membersResult.error || contractsResult.error || cancellationsResult.error) {
    return (
      <section className="rounded-3xl border border-rose-300/10 bg-rose-300/[0.04] p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">채굴 계약 관리</h1>
        <p className="mt-2 text-sm text-zinc-400">계약 데이터를 불러오지 못했습니다.</p>
      </section>
    );
  }

  const publishedVersions = (versionsResult.data ?? []).filter((item) => item.status === "published");
  const activeMembers = (membersResult.data ?? []).filter((item) => item.status === "active");
  const contracts = contractsResult.data ?? [];
  const cancellations = cancellationsResult.data ?? [];

  return (
    <section className="space-y-4">
      <header className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-300/[0.08] text-emerald-300"><Handshake className="h-5 w-5" /></span>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">MINING CONTRACTS</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">회원 채굴 계약 관리</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">발행된 상품 버전을 회원 계약에 고정하고, 재계산·취소·종료 이력을 한 화면에서 관리합니다.</p>
          </div>
        </div>
        {success ? <p role="status" className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] p-3 text-xs text-emerald-200">{success === "contract_created" ? "계약을 활성화했습니다." : success === "contract_cancelled" ? "계약을 취소하고 최종 계산했습니다." : "계약을 재계산했습니다."}</p> : null}
        {error ? <p role="alert" className="mt-4 rounded-xl border border-rose-300/10 bg-rose-300/[0.04] p-3 text-xs text-rose-200">계약 작업을 처리하지 못했습니다. 입력값과 운영자 권한을 확인해 주세요.</p> : null}
      </header>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /><h2 className="text-sm font-semibold">새 계약 활성화</h2></div>
        <p className="mt-1 text-[11px] leading-5 text-zinc-600">계약 생성 시점의 버전·보상률·운영 기간이 고정됩니다.</p>
        <form action={submitMiningContract} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input type="hidden" name="return_to" value="/dashboard/contracts" />
          <select name="user_id" required defaultValue="" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-white outline-none">
            <option value="" disabled>활성 회원 선택</option>
            {activeMembers.map((member) => <option key={member.user_id} value={member.user_id ?? ""}>{member.display_name || member.username || member.email || "회원"}</option>)}
          </select>
          <select name="product_version_id" required defaultValue="" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-white outline-none">
            <option value="" disabled>발행 상품 버전 선택</option>
            {publishedVersions.map((version) => <option key={version.id} value={version.id ?? ""}>{version.product_code} · v{version.version} · {version.reward_asset_code}</option>)}
          </select>
          <input name="capacity" required inputMode="decimal" placeholder="채굴 용량" className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-white outline-none" />
          <input type="hidden" name="idempotency_key" value={`mining-contract:${randomUUID()}`} />
          <button type="submit" disabled={!activeMembers.length || !publishedVersions.length} className="rounded-xl bg-emerald-300 px-4 py-3 text-xs font-bold text-zinc-950 disabled:opacity-40">계약 활성화</button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">계약 현황</h2><span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-500">{contracts.length}개</span></div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[1380px] w-full text-left text-xs">
            <thead className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.14em] text-zinc-600"><tr><th className="px-3 py-2">회원</th><th className="px-3 py-2">상품</th><th className="px-3 py-2">용량</th><th className="px-3 py-2">누적 채굴</th><th className="px-3 py-2">지급 / 미지급</th><th className="px-3 py-2">상태</th><th className="px-3 py-2">기간</th><th className="px-3 py-2">관리</th></tr></thead>
            <tbody className="divide-y divide-white/[0.05]">
              {contracts.map((contract) => (
                <tr key={contract.contract_id}>
                  <td className="px-3 py-4"><div className="font-medium">{contract.display_name || contract.username || contract.email || "회원"}</div><div className="mt-1 text-[10px] text-zinc-600">{contract.email ?? contract.user_id}</div></td>
                  <td className="px-3 py-4"><div>{contract.product_code ?? "-"}</div><div className="mt-1 text-[10px] text-zinc-600">v{String(contract.version ?? "-")}</div></td>
                  <td className="px-3 py-4">{formatAmount(contract.capacity)} {contract.capacity_unit}</td>
                  <td className="px-3 py-4">{formatAmount(contract.total_reward_earned)} {contract.reward_asset_code}</td>
                  <td className="px-3 py-4">{formatAmount(contract.total_reward_paid)} / {formatAmount(contract.pending_reward)} {contract.reward_asset_code}</td>
                  <td className="px-3 py-4">{STATUS_LABELS[contract.status ?? ""] ?? contract.status}</td>
                  <td className="px-3 py-4 text-[10px] text-zinc-500">{formatDate(contract.started_at)}<br />{formatDate(contract.scheduled_end_at)}</td>
                  <td className="px-3 py-4">
                    {contract.status === "active" ? <div className="grid min-w-52 gap-2">
                      <form action={recalculateContract}><input type="hidden" name="return_to" value="/dashboard/contracts" /><input type="hidden" name="contract_id" value={contract.contract_id ?? ""} /><input type="hidden" name="idempotency_key" value={`mining-recalc:${randomUUID()}`} /><button type="submit" className="w-full rounded-lg border border-sky-300/15 px-3 py-2 text-[10px] text-sky-200">즉시 재계산</button></form>
                      <form action={cancelContract} className="grid gap-2"><input type="hidden" name="return_to" value="/dashboard/contracts" /><input type="hidden" name="contract_id" value={contract.contract_id ?? ""} /><input type="hidden" name="idempotency_key" value={`mining-cancel:${randomUUID()}`} /><input name="reason" required minLength={3} maxLength={1000} placeholder="취소 사유" className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[10px]" /><button type="submit" className="rounded-lg border border-rose-300/15 px-3 py-2 text-[10px] text-rose-200">취소 + 최종 계산</button></form>
                    </div> : <span className="text-[10px] text-zinc-600">종료 계약</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!contracts.length ? <p className="py-8 text-center text-xs text-zinc-600">등록된 계약이 없습니다.</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold">계약 취소 이력</h2>
        <div className="mt-4 grid gap-2">
          {cancellations.map((item) => <article key={item.cancellation_id} className="grid gap-2 rounded-xl border border-white/[0.05] p-4 text-xs md:grid-cols-4"><div>{formatDate(item.created_at)}</div><div>{item.display_name || item.email || item.user_id}</div><div>{item.product_code ?? "-"} · {formatAmount(item.reward_paid_on_cancel)} 지급</div><div className="text-zinc-500">{item.reason ?? "-"}</div></article>)}
          {!cancellations.length ? <p className="py-6 text-center text-xs text-zinc-600">취소 이력이 없습니다.</p> : null}
        </div>
      </section>
    </section>
  );
}
