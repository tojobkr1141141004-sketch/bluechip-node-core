import Link from "next/link";
import { ArrowRight, Pickaxe, ShieldCheck, Wallet, RefreshCcw } from "lucide-react";
import { requireWebUser } from "@/lib/auth";

export const instant = false;

const cards = [
  {
    href: "/dashboard/mining",
    title: "채굴 현황",
    description: "자동 채굴 상태와 누적 기록을 확인하는 공간입니다.",
    icon: Pickaxe
  },
  {
    href: "/dashboard/assets",
    title: "자산",
    description: "보유 자산과 원장 기반 잔액을 확인하는 공간입니다.",
    icon: Wallet
  },
  {
    href: "/dashboard/history",
    title: "활동 기록",
    description: "입출금·채굴·정산 등 주요 기록을 한 곳에서 봅니다.",
    icon: RefreshCcw
  }
] as const;

export default async function UserDashboardPage() {
  const { supabase, user } = await requireWebUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, status")
    .eq("id", user.id)
    .maybeSingle();

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
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              계정 인증과 기본 사용자 영역이 연결되었습니다. 실제 금융·채굴 데이터는 다음 도메인 Phase에서 원장과 연결합니다.
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
            <div key={label} className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
              <div className="text-[10px] text-slate-600">{label}</div>
              <div className="mt-1 truncate text-sm text-slate-200">{value}</div>
            </div>
          ))}
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
              화면 열기 <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-amber-300/10 bg-amber-300/[0.04] p-4 text-xs leading-5 text-slate-500">
        현재 Phase에서는 화면·인증·접근 경계만 확정합니다. 잔액을 임의로 변경하거나 데모 수치를 실제 자산으로 표시하지 않습니다.
      </div>
    </section>
  );
}
