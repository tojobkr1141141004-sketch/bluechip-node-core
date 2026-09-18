import Link from "next/link";
import { Bell, ClipboardList, Coins, FileSearch, LayoutDashboard, LogOut, Settings2, ShieldCheck, UsersRound } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "운영 대시보드", icon: LayoutDashboard },
  { href: "/dashboard/members", label: "회원 관리", icon: UsersRound },
  { href: "/dashboard/kyc", label: "KYC", icon: FileSearch },
  { href: "/dashboard/finance", label: "금융 운영", icon: Coins },
  { href: "/dashboard/mining", label: "채굴·정산", icon: ClipboardList },
  { href: "/dashboard/notifications", label: "운영 알림", icon: Bell },
  { href: "/dashboard/system", label: "시스템", icon: Settings2 }
] as const;

export function AdminShell({
  children,
  email,
  notificationCount = 0
}: {
  children: React.ReactNode;
  email: string | null | undefined;
  notificationCount?: number;
}) {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#09090b]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="min-w-0">
            <div className="text-sm font-semibold">APEX-MATRIX ADMIN</div>
            <div className="text-[10px] text-zinc-500">운영자 통합 관리센터</div>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-56 truncate text-[11px] text-zinc-500 sm:block">{email ?? "운영자"}</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[11px] text-zinc-300 hover:bg-white/[0.04]"
              >
                <LogOut className="h-3.5 w-3.5" /> 로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-2">
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-emerald-300/10 bg-emerald-300/[0.04] px-3 py-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <span className="text-[10px] text-emerald-200">활성 운영자 세션</span>
          </div>
          <nav aria-label="관리자 메뉴" className="grid gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {label}
                {href === "/dashboard/notifications" && notificationCount > 0 ? (
                  <span className="ml-auto rounded-full border border-amber-300/15 bg-amber-300/[0.05] px-1.5 py-0.5 text-[9px] font-semibold text-amber-100">
                    {notificationCount}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/10 p-3 text-[10px] leading-5 text-zinc-600">
            화면은 Admin 세션 아래에 있으며 실제 작업 권한은 DB RBAC 정책이 결정합니다.
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
