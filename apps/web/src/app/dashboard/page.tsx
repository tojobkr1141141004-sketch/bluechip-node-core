import Link from "next/link";
import {
  ArrowRight,
  Pickaxe,
  ShieldCheck,
  Wallet,
  RefreshCcw
} from "lucide-react";
import {
  getActiveAssets,
  getUserAssetBalances,
  getUserLedgerHistory,
  getUserMiningContracts
} from "@apex-matrix/database";
import { requireWebUser } from "@/lib/auth";

export const instant = false;

const cards = [
  {
    href: "/dashboard/mining",
    title: "채굴 현황",
    description: "자동 채굴 상태와 영구 계산·지급 기록을 확인합니다.",
    icon: Pickaxe
  },
  {
    href: "/dashboard/assets",
    title: "자산",
    description: "원장 기반 현재 잔액과 활성 자산을 확인합니다.",
    icon: Wallet
  },
  {
    href: "/dashboard/history",
    title: "활동 기록",
    description: "입출금·채굴·정산 등 원장 거래 기록을 확인합니다.",
    icon: RefreshCcw
  }
] as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export default async function UserDashboardPage() {
  const { supabase, user } = await requireWebUser();

  const [profileResult, assetsResult, balancesResult, contractsResult, historyResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, username, status")
        .eq("id", user.id)
        .maybeSingle(),
      getActiveAssets(supabase),
      getUserAssetBalances(supabase, user.id),
      getUserMiningContracts(supabase),
      getUserLedgerHistory(supabase, user.id)
    ]);

  const profile = profileResult.data;
  const assets = assetsResult.data ?? [];
  const balances = balancesResult.data ?? [];
  const activeContracts = (contractsResult.data ?? []).filter(
    (item) => item.status === "active"
  );
  const historyCount = (historyResult.data ?? []).length;
  const hasDataError =
    assetsResult.error ||
    balancesResult.error ||
    contractsResult.error ||
    historyResult.error;

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
              USER CENTER
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              {profile?.display_name ?? "회원"}님의 운영센터
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              APEX-MATRIX의 사용자 영역입니다. 자산은 원장 기반 잔액으로,
              채굴과 금융 이력은 서버에서 확정된 기록으로 조회합니다.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" /> 계정 인증 완료
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["이메일", user.email ?? "미등록"],
            ["아이디", profile?.username ?? "미설정"],
            ["계정 상태", profile?.status ?? "unknown"]
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-white/[0.06] bg-black/10 p-4"
            >
              <div className="text-[10px] text-slate-600">{label}</div>
              <div className="mt-1 truncate text-sm text-slate-200">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="text-[10px] text-slate-600">활성 자산</div>
          <div className="mt-2 text-2xl font-semibold">
            {hasDataError ? "—" : formatNumber(assets.length)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">운영자가 활성화한 자산</div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="text-[10px] text-slate-600">활성 채굴 계약</div>
          <div className="mt-2 text-2xl font-semibold">
            {hasDataError ? "—" : formatNumber(activeContracts.length)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">현재 계산 대상 계약</div>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="text-[10px] text-slate-600">활동 기록</div>
          <div className="mt-2 text-2xl font-semibold">
            {hasDataError ? "—" : formatNumber(historyCount)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            원장에 기록된 최근 거래
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {cards.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition hover:border-emerald-300/20 hover:bg-white/[0.04]"
          >
            <Icon className="h-5 w-5 text-emerald-300" />
            <div className="mt-4 text-sm font-semibold">{title}</div>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">{description}</p>
            <div className="mt-4 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-200">
              화면 열기{" "}
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="text-xs font-semibold">자산 잔액</div>
          <p className="mt-1 text-[11px] text-slate-600">
            현재 계정에 귀속된 자산별 원장 기반 잔액입니다.
          </p>
          <div className="mt-4 space-y-2">
            {balances.slice(0, 5).map((balance) => (
              <div
                key={balance.asset_id}
                className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-black/10 px-3 py-2.5"
              >
                <span className="text-[11px] text-slate-500">
                  {balance.asset_code ?? "자산"}
                </span>
                <span className="font-mono text-xs text-slate-200">
                  {String(balance.balance ?? 0)}
                </span>
              </div>
            ))}
            {!balances.length ? (
              <div className="rounded-xl border border-white/[0.05] bg-black/10 px-3 py-4 text-center text-[11px] text-slate-600">
                현재 표시할 잔액이 없습니다.
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-300/10 bg-amber-300/[0.035] p-5">
          <div className="text-xs font-semibold">운영 원칙</div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            사용자가 화면에서 잔액이나 채굴 보상을 직접 수정할 수 없습니다.
            금융 승인과 채굴 지급은 승인된 서버 작업과 Ledger 기록을 통해서만 반영됩니다.
          </p>
        </div>
      </div>
    </section>
  );
}
