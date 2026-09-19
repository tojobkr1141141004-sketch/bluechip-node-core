"use client";

import { WifiOff } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { localeFromPathname } from "@apex-matrix/i18n";

const messages = {
  ko: "오프라인 상태입니다. 금융 요청과 채굴 작업은 연결이 복구될 때까지 중지됩니다.",
  ja: "オフラインです。入出金申請とマイニング操作は接続が回復するまで停止します。",
  en: "You are offline. Financial requests and mining actions are paused until the connection returns."
} as const;

export function ConnectivityGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let disconnected = !window.navigator.onLine;

    function updateConnectivity(nextOnline: boolean) {
      document.documentElement.dataset.connectivity = nextOnline ? "online" : "offline";
      setOnline(nextOnline);

      if (nextOnline && disconnected) {
        disconnected = false;
        router.refresh();
      } else if (!nextOnline) {
        disconnected = true;
      }
    }

    function handleOnline() {
      updateConnectivity(true);
    }

    function handleOffline() {
      updateConnectivity(false);
    }

    function blockOfflineSubmit(event: SubmitEvent) {
      if (!window.navigator.onLine) event.preventDefault();
    }

    updateConnectivity(window.navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("submit", blockOfflineSubmit, true);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("submit", blockOfflineSubmit, true);
    };
  }, [router]);

  if (online) return null;

  const locale = localeFromPathname(pathname);

  return (
    <div className="offline-banner fixed inset-x-3 top-3 z-[100] mx-auto flex max-w-xl items-start gap-3 rounded-2xl border border-amber-300/20 bg-slate-950/95 p-4 text-xs leading-5 text-amber-100 shadow-2xl" role="status" aria-live="polite">
      <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{messages[locale]}</span>
    </div>
  );
}
