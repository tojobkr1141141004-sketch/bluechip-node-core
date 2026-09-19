import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  action
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  action?: { href: string; label: string };
}) {
  return (
    <div className="app-panel relative overflow-hidden rounded-[26px] p-6 sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-3xl">
          <div className="app-kicker inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em]">
            <Icon className="h-3.5 w-3.5" />
            {eyebrow}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">{title}</h1>
          <p className="app-muted mt-3 text-sm leading-6">{description}</p>
        </div>
        {action ? (
          <Link href={action.href} className="group inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition hover:-translate-y-0.5" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
            {action.label}
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}