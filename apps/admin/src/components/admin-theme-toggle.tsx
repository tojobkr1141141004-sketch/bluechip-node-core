"use client";

import { Moon, Sun } from "lucide-react";

export function AdminThemeToggle() {
  function toggleTheme() {
    const current = document.documentElement.dataset.adminTheme === "light" ? "light" : "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.adminTheme = next;
    window.localStorage.setItem("apex-admin-theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="운영자 밝은/어두운 모드 전환"
      className="admin-theme-toggle inline-flex h-10 w-10 items-center justify-center rounded-xl border"
    >
      <Sun className="admin-theme-sun h-4 w-4" />
      <Moon className="admin-theme-moon hidden h-4 w-4" />
    </button>
  );
}