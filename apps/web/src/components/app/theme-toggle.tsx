"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { commonMessages, localeFromPathname } from "@apex-matrix/i18n";
import { usePathname } from "next/navigation";

export function ThemeToggle() {
  const pathname = usePathname();
  const label = commonMessages[localeFromPathname(pathname)].shell.themeToggle;
  useEffect(() => {
    const stored = window.localStorage.getItem("apex-theme");
    const next =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";

    document.documentElement.dataset.theme = next;
  }, []);

  function toggleTheme() {
    const current =
      document.documentElement.dataset.theme === "light" ? "light" : "dark";
    const next = current === "dark" ? "light" : "dark";

    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("apex-theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="theme-toggle inline-flex h-11 w-11 items-center justify-center rounded-xl border transition"
    >
      <Sun className="h-4 w-4 theme-icon-light" aria-hidden="true" />
      <Moon className="hidden h-4 w-4 theme-icon-dark" aria-hidden="true" />
    </button>
  );
}
