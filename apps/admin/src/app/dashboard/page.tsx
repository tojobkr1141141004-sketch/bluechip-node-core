import { Activity, Coins, FileCheck2, UsersRound } from "lucide-react";
import { requireAdminUser } from "@/lib/auth";

export const instant = false;

const sections = [
  { title: "회원 운영", description: "회원 상태와 운영 업무", icon: UsersRound, href: "/dashboard/members" },
  { title: "KYC", description: "본인확인 검토 흐름", icon: FileCheck2, href: "/dashboard/kyc" },
  { title: "금융", description: "입출금 및 잔액 운영", icon: Coins, href: "/dashboard/finance" },
  { title: "채굴·정산", description: "자동 계산·지급 모니터링", icon: Activity, href: "/dashboard/mining" }
] as const;

export default async function AdminDashboardPage() {
  const { user } = await requireAdminUser();

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
          ADMIN CONTROL CENTER
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">운영 대시보드</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          {user.email ?? user.id} 운영자 세션으로 접속했습니다. 이 단계에서는 운영 화면의 경계와 메뉴 구조를 확정하고 실제 처리 기능은 각 도메인 Phase에서 연결합니다.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-200">
          <Activity className="h-3.5 w-3.5" /> 운영자 인증 정상
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {sections.map(({ title, description, icon: Icon, href }) => (
          <a
            key={href}
            href={href}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 transition hover:border-emerald-300/20 hover:bg-white/[0.04]"
          >
            <Icon className="h-5 w-5 text-emerald-300" />
            <div className="mt-4 text-sm font-semibold">{title}</div>
            <p className="mt-1.5 text-xs leading-5 text-zinc-500">{description}</p>
          </a>
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-4 text-xs leading-5 text-zinc-600">
        금융 잔액이나 채굴 보상은 이 화면에서 임의로 변경하지 않습니다. 모든 금전 상태 변경은 향후 원장 기반 작업으로만 처리합니다.
      </div>
    </section>
  );
}
