import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Bell,
  Settings2,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { commonMessages, localizeHref } from "@apex-matrix/i18n";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { PageHeader } from "@/components/app/page-header";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { getRequestLocale } from "@/lib/locale";

export const instant = false;

export default async function MorePage() {
  const locale = await getRequestLocale();
  const messages = commonMessages[locale];

  const groups = [
    {
      title: messages.more.finance,
      items: [
        { href: "/dashboard/deposit", label: messages.nav.deposit, icon: ArrowDownToLine },
        { href: "/dashboard/withdrawal", label: messages.nav.withdrawal, icon: ArrowUpFromLine }
      ]
    },
    {
      title: messages.more.account,
      items: [
        { href: "/dashboard/notifications", label: messages.nav.notifications, icon: Bell },
        { href: "/dashboard/profile", label: messages.nav.profile, icon: UserRound },
        { href: "/dashboard/security", label: messages.nav.security, icon: ShieldCheck }
      ]
    }
  ];

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow={messages.more.eyebrow}
        title={messages.more.title}
        description={messages.more.description}
        icon={Settings2}
      />

      {groups.map((group) => (
        <section key={group.title} className="app-panel rounded-[24px] p-5 sm:p-6">
          <h2 className="text-sm font-semibold">{group.title}</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {group.items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={localizeHref(href, locale) as never}
                className="group app-card-soft flex min-h-14 items-center gap-3 rounded-2xl p-3.5"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-xs font-semibold">{label}</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" style={{ color: "var(--muted)" }} />
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section className="app-panel rounded-[24px] p-5 sm:p-6">
        <h2 className="text-sm font-semibold">{messages.more.preferences}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="app-card-soft flex min-h-16 items-center justify-between gap-4 rounded-2xl p-4">
            <span className="text-xs font-semibold">{messages.more.language}</span>
            <LanguageSwitcher />
          </div>
          <div className="app-card-soft flex min-h-16 items-center justify-between gap-4 rounded-2xl p-4">
            <span className="text-xs font-semibold">{messages.more.theme}</span>
            <ThemeToggle />
          </div>
        </div>
      </section>
    </section>
  );
}
