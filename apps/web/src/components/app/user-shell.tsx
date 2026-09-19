"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Pickaxe,
  ShieldCheck,
  UserRound,
  Wallet
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/dashboard/notifications", label: "알림", icon: Bell },
  { href: "/dashboard/mining", label: "채굴 현황", icon: Pickaxe },
  { href: "/dashboard/assets", label: "내 자산", icon: Wallet },
  { href: "/dashboard/deposit", label: "입금", icon: ArrowDownToLine },
  { href: "/dashboard/withdrawal", label: "출금", icon: ArrowUpFromLine },
  { href: "/dashboard/history", label: "활동 기록", icon: History },
  { href: "/dashboard/profile", label: "내 정보", icon: UserRound },
  { href: "/dashboard/security", label: "보안 설정", icon: ShieldCheck }
] as const;

const MOBILE_ITEMS = NAV_ITEMS.slice(0, 5);

function isCurrentPath(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");
}

export function UserShell({
  children,
  email,
  unreadNotificationCount = 0
}: {
  children: React.ReactNode;
  email: string | null | undefined;
  unreadNotificationCount?: number;
}) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <header className="app-header sticky top-0 z-50">
        <div className="mx-auto flex h-[72px] max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 via-emerald-400 to-cyan-400 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/10"
            >
              A
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-[-0.02em]">
                APEX-MATRIX
              </span>
              <span className="app-muted block text-[10px] font-medium">
                Digital Operations Center
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-2xl border px-3 py-2.5 sm:flex" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
              <span className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                {(email?.[0] ?? "U").toUpperCase()}
              </span>
              <span className="max-w-[230px] truncate text-[11px] font-medium" style={{ color: "var(--muted-strong)" }}>
                {email ?? "사용자"}
              </span>
            </div>
            <Link
              href="/dashboard/notifications"
              aria-label={
                unreadNotificationCount > 0
                  ? `읽지 않은 알림 ${unreadNotificationCount}개`
                  : "알림"
              }
              className="relative grid h-10 w-10 place-items-center rounded-xl border transition"
              style={{
                borderColor: "var(--border)",
                color: "var(--muted-strong)",
                background: "var(--surface-soft)"
              }}
            >
              <Bell className="h-4 w-4" />
              {unreadNotificationCount > 0 ? (
                <span
                  className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full px-1 text-[8px] font-bold text-slate-950"
                  style={{ background: "var(--accent)" }}
                >
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </span>
              ) : null}
            </Link>
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-[11px] font-semibold transition"
                style={{ borderColor: "var(--border)", color: "var(--muted-strong)", background: "var(--surface-soft)" }}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1480px] gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8 lg:py-6">
        <aside className="desktop-sidebar app-sidebar h-fit rounded-3xl p-3 lg:sticky lg:top-[96px]">
          <div className="px-3 pb-3 pt-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
              Workspace
            </div>
            <div className="mt-1 text-sm font-semibold">내 운영공간</div>
          </div>

          <nav aria-label="사용자 메뉴" className="grid gap-1.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isCurrentPath(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={
                    "app-nav inline-flex items-center gap-3 rounded-2xl border px-3 py-3 text-xs font-medium transition " +
                    (active ? "app-nav-active" : "border-transparent")
                  }
                >
                  <span className="grid h-8 w-8 place-items-center rounded-xl" style={{ background: active ? "var(--accent-soft)" : "var(--surface-soft)" }}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">{label}</span>
                  {active ? (
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "linear-gradient(145deg, var(--accent-soft), var(--surface-soft))" }}>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <ShieldCheck className="h-4 w-4" style={{ color: "var(--accent)" }} />
              계정 보호
            </div>
            <p className="app-muted mt-2 text-[10px] leading-5">
              금융·채굴 데이터는 로그인한 본인 계정 범위에서만 조회됩니다.
            </p>
          </div>
        </aside>

        <main className="app-content min-w-0 pb-24 lg:pb-0">{children}</main>
      </div>

      <nav
        aria-label="빠른 메뉴"
        className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-2xl border p-2 shadow-2xl backdrop-blur-xl lg:hidden"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 94%, transparent)" }}
      >
        {MOBILE_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isCurrentPath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[9px] font-semibold transition"
              style={{
                color: active ? "var(--accent-strong)" : "var(--muted)",
                background: active ? "var(--accent-soft)" : "transparent"
              }}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
        <Link
          href="/dashboard/security"
          className="col-span-5 mt-1 hidden items-center justify-center gap-1 border-t pt-2 text-[9px] font-semibold sm:flex"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          <Menu className="h-3.5 w-3.5" /> 계정 보안 설정
        </Link>
      </nav>
    </div>
  );
}
