"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("apex-theme") as Theme | null;
    const next =
      stored ??
      (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");

    document.documentElement.dataset.theme = next;
    setTheme(next);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("apex-theme", next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "밝은 모드로 전환" : "어두운 모드로 전환"}
      title={theme === "dark" ? "밝은 모드" : "어두운 모드"}
      className="theme-toggle inline-flex h-10 w-10 items-center justify-center rounded-xl border transition"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
