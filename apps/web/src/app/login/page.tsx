import type { Metadata } from "next";
import { ShieldCheck, Sparkles } from "lucide-react";
import { authMessages } from "@apex-matrix/i18n";
import { LoginForm } from "./login-form";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { getRequestLocale } from "@/lib/locale";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return { title: authMessages[locale].signInTitle };
}

export default async function LoginPage() {
  const locale = await getRequestLocale();
  const messages = authMessages[locale];

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 sm:py-8">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="mx-auto flex max-w-6xl justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 via-emerald-400 to-cyan-400 text-sm font-black text-slate-950">
            A
          </span>
          <div>
            <div className="text-sm font-bold tracking-[-0.02em]">APEX-MATRIX</div>
            <div className="app-muted text-[10px]">{messages.center}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

      <section className="mx-auto mt-8 grid max-w-6xl overflow-hidden rounded-[32px] border" style={{ borderColor: "var(--border)", background: "var(--surface)", boxShadow: "var(--shadow)" }}>
        <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative hidden min-h-[650px] overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: "var(--border)", color: "var(--accent)", background: "var(--accent-soft)" }}>
                <Sparkles className="h-3.5 w-3.5" />
                APEX-MATRIX
              </div>
              <h1 className="mt-8 max-w-xl text-5xl font-semibold leading-[1.06] tracking-[-0.055em]">
                {messages.heroLine}
                <br />
                <span style={{ color: "var(--accent)" }}>{messages.heroHighlight}</span>
              </h1>
              <p className="app-muted mt-6 max-w-lg text-sm leading-7">
                {messages.heroDescription}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {messages.features.map(({ title, description }) => (
                <div key={title} className="rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
                  <div className="text-xs font-semibold">{title}</div>
                  <div className="app-muted mt-1.5 text-[10px] leading-5">{description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-h-[650px] flex-col justify-center p-6 sm:p-10 lg:p-12">
            <div className="lg:hidden">
              <div className="app-kicker text-[10px] font-bold uppercase tracking-[0.18em]">
                {messages.secureAccess}
              </div>
            </div>
            <div className="mt-4">
              <div className="app-kicker text-[10px] font-bold uppercase tracking-[0.18em]">
                {messages.secureAccess}
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                {messages.signInTitle}
              </h2>
              <p className="app-muted mt-3 text-sm leading-6">
                {messages.signInDescription}
              </p>
            </div>

            <div className="mt-8">
              <LoginForm />
            </div>

            <div className="app-muted mt-8 flex items-start gap-2 text-[10px] leading-5">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--accent)" }} />
              <span>{messages.immutableNotice}</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
