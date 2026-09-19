"use client";

import { Languages } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  SUPPORTED_LOCALES,
  commonMessages,
  localeFromPathname,
  localizeHref,
  type AppLocale
} from "@apex-matrix/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = localeFromPathname(pathname);

  function changeLocale(nextLocale: AppLocale) {
    router.push(localizeHref(pathname, nextLocale) as never);
  }

  return (
    <label
      className="language-switcher inline-flex h-11 items-center gap-2 rounded-xl border px-2.5"
      style={{
        borderColor: "var(--border)",
        color: "var(--muted-strong)",
        background: "var(--surface-soft)"
      }}
    >
      <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">Language</span>
      <select
        value={locale}
        onChange={(event) => changeLocale(event.target.value as AppLocale)}
        aria-label="Language"
        className="min-w-0 cursor-pointer appearance-none bg-transparent text-[11px] font-semibold outline-none"
      >
        {SUPPORTED_LOCALES.map((item) => (
          <option key={item} value={item}>
            {compact ? item.toUpperCase() : commonMessages[item].localeName}
          </option>
        ))}
      </select>
    </label>
  );
}
