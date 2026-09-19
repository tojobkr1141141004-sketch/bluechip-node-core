"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminThemeToggle } from "./admin-theme-toggle";
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

const isCurrentPath = (pathname: string, href: string) => href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(href + "/");

export function AdminShell({
  children,
  email,
  notificationCount = 0
}: {
  children: React.ReactNode;
  email: string | null | undefined;
  notificationCount?: number;
}) {
  const pathname = usePathname();

  return (
    <div className="admin-shell">
      <header className="admin-header sticky top-0 z-50">
        <div className="mx-auto flex h-[72px] max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 via-emerald-400 to-cyan-400 text-sm font-black text-slate-950">A</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">APEX-MATRIX ADMIN</span>
              <span className="admin-muted block text-[10px]">운영자 통합 관리센터</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-56 truncate text-[11px] admin-muted sm:block">{email ?? "운영자"}</span>
            <AdminThemeToggle />
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

      <div className="mx-auto grid max-w-[1480px] gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8 lg:py-6">
        <aside className="admin-desktop-sidebar admin-sidebar h-fit rounded-3xl p-3 lg:sticky lg:top-[96px]">
          <div className="mb-3 flex items-center gap-2 rounded-2xl border p-3" style={{ borderColor: "var(--admin-border)", background: "color-mix(in srgb, var(--admin-accent) 8%, transparent)" }}>
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <span className="text-[10px] text-emerald-200">활성 운영자 세션</span>
          </div>
          <nav aria-label="관리자 메뉴" className="grid gap-1.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isCurrentPath(pathname, href);
              return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={"admin-nav inline-flex items-center gap-3 rounded-2xl border px-3 py-3 text-xs font-medium transition " + (active ? "admin-nav-active" : "border-transparent")}
              >
                <span className="grid h-8 w-8 place-items-center rounded-xl" style={{ background: active ? "color-mix(in srgb, var(--admin-accent) 10%, transparent)" : "var(--admin-soft)" }}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1">{label}</span>
                {href === "/dashboard/notifications" && notificationCount > 0 ? (
                  <span className="ml-auto rounded-full border border-amber-300/15 bg-amber-300/[0.05] px-1.5 py-0.5 text-[9px] font-semibold text-amber-100">
                    {notificationCount}
                  </span>
                ) : null}
              </Link>
              );
            })}
          </nav>
          <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/10 p-3 text-[10px] leading-5 text-zinc-600">
            화면은 Admin 세션 아래에 있으며 실제 작업 권한은 DB RBAC 정책이 결정합니다.
          </div>
        </aside>

        <main className="min-w-0 pb-6">{children}</main>
      </div>
    </div>
  );
}
