import Link from "next/link";
import {
  LogOut,
  Pickaxe,
  Wallet,
  History,
  UserRound,
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShieldCheck
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/dashboard/mining", label: "채굴 현황", icon: Pickaxe },
  { href: "/dashboard/assets", label: "자산", icon: Wallet },
  { href: "/dashboard/deposit", label: "입금", icon: ArrowDownToLine },
  { href: "/dashboard/withdrawal", label: "출금", icon: ArrowUpFromLine },
  { href: "/dashboard/history", label: "활동 기록", icon: History },
  { href: "/dashboard/profile", label: "내 정보", icon: UserRound },
  { href: "/dashboard/security", label: "보안 설정", icon: ShieldCheck }
] as const;

export function UserShell({
  children,
  email
}: {
  children: React.ReactNode;
  email: string | null | undefined;
}) {
  return (
    <div className="min-h-screen bg-[#06101d] text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#06101d]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="min-w-0">
            <div className="text-sm font-semibold tracking-[-0.02em]">APEX-MATRIX</div>
            <div className="text-[10px] text-slate-500">사용자 운영센터</div>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-52 truncate text-[11px] text-slate-500 sm:block">
              {email ?? "사용자"}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[11px] text-slate-300 hover:bg-white/[0.04]"
              >
                <LogOut className="h-3.5 w-3.5" /> 로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-2">
          <nav aria-label="사용자 메뉴" className="grid gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 rounded-xl border border-emerald-300/10 bg-emerald-300/[0.04] p-3 text-[10px] leading-5 text-slate-500">
            모든 자산·금융·채굴 화면은 인증된 계정 범위에서 서버와 원장 데이터를 조회합니다.
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
