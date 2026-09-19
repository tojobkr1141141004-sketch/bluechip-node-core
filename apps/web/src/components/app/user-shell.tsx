"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  commonMessages,
  localeFromPathname,
  localizeHref,
  stripLocaleFromPathname
} from "@apex-matrix/i18n";
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
import { LanguageSwitcher } from "./language-switcher";

const PRIMARY_NAV_ITEMS = [
  { href: "/dashboard", labelKey: "home", icon: LayoutDashboard },
  { href: "/dashboard/mining", labelKey: "mining", icon: Pickaxe },
  { href: "/dashboard/assets", labelKey: "assets", icon: Wallet },
  { href: "/dashboard/history", labelKey: "activity", icon: History },
  { href: "/dashboard/more", labelKey: "more", icon: Menu }
] as const;

const SECONDARY_NAV_ITEMS = [
  { href: "/dashboard/notifications", labelKey: "notifications", icon: Bell },
  { href: "/dashboard/deposit", labelKey: "deposit", icon: ArrowDownToLine },
  { href: "/dashboard/withdrawal", labelKey: "withdrawal", icon: ArrowUpFromLine },
  { href: "/dashboard/profile", labelKey: "profile", icon: UserRound },
  { href: "/dashboard/security", labelKey: "security", icon: ShieldCheck }
] as const;

const NAV_ITEMS = [...PRIMARY_NAV_ITEMS, ...SECONDARY_NAV_ITEMS] as const;
const MOBILE_ITEMS = PRIMARY_NAV_ITEMS;

function isCurrentPath(pathname: string, href: string) {
  const currentPath = stripLocaleFromPathname(pathname);
  return href === "/dashboard"
    ? currentPath === href
    : currentPath === href || currentPath.startsWith(href + "/");
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
  const locale = localeFromPathname(pathname);
  const messages = commonMessages[locale];

  return (
    <div className="app-shell">
      <header className="app-header sticky top-0 z-50">
        <div className="mx-auto flex h-[72px] max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href={localizeHref("/dashboard", locale) as never} className="flex min-w-0 items-center gap-3">
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
                {messages.shell.subtitle}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-2xl border px-3 py-2.5 sm:flex" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
              <span className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                {(email?.[0] ?? "U").toUpperCase()}
              </span>
              <span className="max-w-[230px] truncate text-[11px] font-medium" style={{ color: "var(--muted-strong)" }}>
                {email ?? messages.shell.user}
              </span>
            </div>
            <Link
              href={localizeHref("/dashboard/notifications", locale) as never}
              aria-label={
                unreadNotificationCount > 0
                  ? messages.shell.unreadNotifications(unreadNotificationCount)
                  : messages.shell.notification
              }
              className="relative grid h-11 w-11 place-items-center rounded-xl border transition"
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
            <div className="hidden md:block">
              <LanguageSwitcher compact />
            </div>
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-[11px] font-semibold transition"
                style={{ borderColor: "var(--border)", color: "var(--muted-strong)", background: "var(--surface-soft)" }}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{messages.shell.logout}</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1480px] gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8 lg:py-6">
        <aside className="desktop-sidebar app-sidebar h-fit rounded-3xl p-3 lg:sticky lg:top-[96px]">
          <div className="px-3 pb-3 pt-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--muted)" }}>
              {messages.shell.workspace}
            </div>
            <div className="mt-1 text-sm font-semibold">{messages.shell.workspaceTitle}</div>
          </div>

          <nav aria-label={messages.shell.navigation} className="grid gap-1.5">
            {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
              const active = isCurrentPath(pathname, href);
              const label = messages.nav[labelKey];
              return (
                <Link
                  key={href}
                  href={localizeHref(href, locale) as never}
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
              {messages.shell.protectedAccount}
            </div>
            <p className="app-muted mt-2 text-[10px] leading-5">
              {messages.shell.protectedDescription}
            </p>
          </div>
        </aside>

        <main className="app-content min-w-0 pb-24 lg:pb-0">{children}</main>
      </div>

      <nav
        aria-label={messages.shell.quickMenu}
        className="mobile-bottom-nav fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-2xl border p-2 shadow-2xl lg:hidden"
        style={{
          bottom: "max(0.75rem, env(safe-area-inset-bottom))",
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--surface) 94%, transparent)"
        }}
      >
        {MOBILE_ITEMS.map(({ href, labelKey, icon: Icon }) => {
          const active = isCurrentPath(pathname, href);
          const label = messages.nav[labelKey];
          return (
            <Link
              key={href}
              href={localizeHref(href, locale) as never}
              aria-current={active ? "page" : undefined}
              className="flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[9px] font-semibold transition"
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
      </nav>
    </div>
  );
}
