import Link from "next/link";
import { AlertTriangle, Bell, Check, CheckCircle2, Clock3, RotateCcw } from "lucide-react";
import {
  getAdminNotificationEvents,
  getAdminNotificationSummary,
  getAdminNotifications
} from "@apex-matrix/database";
import { requireAdminUser } from "@/lib/auth";
import { acknowledgeNotification, resolveNotification } from "./actions";

export const instant = false;

function formatDate(value: string) {
  return new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

function severityLabel(value: string) {
  if (value === "critical") return "즉시 확인";
  if (value === "attention") return "확인 필요";
  return "안내";
}

export default async function NotificationsPage() {
  const { supabase } = await requireAdminUser();
  const [summaryResult, activeResult, resolvedResult, eventsResult] = await Promise.all([
    getAdminNotificationSummary(supabase),
    getAdminNotifications(supabase),
    getAdminNotifications(supabase, "resolved", 50),
    getAdminNotificationEvents(supabase, 50)
  ]);

  const summary = (summaryResult.data ?? {}) as {
    open_count?: number;
    acknowledged_count?: number;
    active_count?: number;
    critical_count?: number;
    can_manage?: boolean;
    last_event_at?: string | null;
  };
  const active = activeResult.data ?? [];
  const resolved = resolvedResult.data ?? [];
  const events = eventsResult.data ?? [];
  const canManage = summary.can_manage === true;

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
              <Bell className="h-3.5 w-3.5" /> NOTIFICATION CENTER
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">운영 알림</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
              채굴 계산, 출금 처리, 대사, Ledger, Cron 및 DB 예약 작업에서 발견된 운영 이슈를 확인합니다.
            </p>
          </div>
          <Link
            href="/dashboard/notifications"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-semibold text-zinc-300 hover:bg-white/[0.04]"
          >
            <RotateCcw className="h-3.5 w-3.5" /> 상태 새로고침
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["미확인", summary.open_count ?? 0],
            ["확인됨", summary.acknowledged_count ?? 0],
            ["활성 알림", summary.active_count ?? 0],
            ["긴급", summary.critical_count ?? 0]
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
              <div className="text-[10px] text-zinc-600">{label}</div>
              <div className="mt-2 text-2xl font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-200" />
          <h2 className="text-sm font-semibold">현재 활성 알림</h2>
        </div>

        {active.length ? (
          <div className="mt-4 space-y-3">
            {active.map((notification) => (
              <article key={notification.id} className="rounded-2xl border border-white/[0.06] bg-black/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={notification.severity === "critical"
                        ? "rounded-full border border-rose-300/10 bg-rose-300/[0.04] px-2 py-1 text-[9px] font-semibold text-rose-200"
                        : "rounded-full border border-amber-300/10 bg-amber-300/[0.04] px-2 py-1 text-[9px] font-semibold text-amber-100"
                      }>
                        {severityLabel(notification.severity)}
                      </span>
                      <h3 className="text-sm font-semibold">{notification.title}</h3>
                      <span className="rounded-full border border-white/[0.06] px-2 py-1 text-[9px] text-zinc-500">
                        {notification.status === "open" ? "미확인" : "확인됨"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-zinc-400">{notification.message}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-zinc-600">
                      <span>영역 · {notification.owner_area}</span>
                      <span>발생 {formatDate(notification.first_seen_at)}</span>
                      <span>최근 확인 {formatDate(notification.last_seen_at)}</span>
                      <span>감지 {notification.occurrence_count}회</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={notification.href as never}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-semibold text-zinc-300 hover:bg-white/[0.04]"
                    >
                      담당 화면
                    </Link>
                    {canManage && notification.status === "open" ? (
                      <form action={acknowledgeNotification}>
                        <input type="hidden" name="notificationId" value={notification.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-2 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-300/[0.09]"
                        >
                          <Check className="h-3.5 w-3.5" /> 확인
                        </button>
                      </form>
                    ) : null}
                    {canManage ? (
                      <form action={resolveNotification}>
                        <input type="hidden" name="notificationId" value={notification.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-semibold text-zinc-400 hover:bg-white/[0.04]"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> 해결 처리
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-zinc-600">
            현재 활성 운영 알림이 없습니다.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-black/10 p-5">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-zinc-500" />
          <h2 className="text-sm font-semibold">최근 해결된 알림</h2>
        </div>
        {resolved.length ? (
          <div className="mt-4 space-y-2">
            {resolved.map((notification) => (
              <div key={notification.id} className="rounded-xl border border-white/[0.05] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-zinc-300">{notification.title}</div>
                    <div className="mt-1 text-[10px] text-zinc-600">
                      {notification.owner_area} · 마지막 감지 {formatDate(notification.last_seen_at)}
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-600">누적 {notification.occurrence_count}회</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-zinc-600">해결된 알림 기록이 없습니다.</div>
        )}
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-black/10 p-5">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-zinc-500" />
          <h2 className="text-sm font-semibold">최근 운영 이벤트</h2>
        </div>
        {events.length ? (
          <div className="mt-4 space-y-2">
            {events.map((event) => (
              <div key={event.event_id} className="rounded-xl border border-white/[0.05] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-zinc-300">{event.title}</div>
                    <div className="mt-1 text-[10px] text-zinc-600">
                      {event.event_type} · {event.code} · {formatDate(event.created_at)}
                    </div>
                  </div>
                  <span className="max-w-[220px] truncate text-[10px] text-zinc-600" title={event.actor_user_id ?? "system"}>
                    {event.actor_user_id ? event.actor_user_id : "system"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-zinc-600">아직 운영 이벤트가 없습니다.</div>
        )}
      </section>

      <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-4 text-[11px] leading-5 text-zinc-600">
        알림은 운영 감시 기록이며 금융 잔액이나 Ledger를 직접 변경하지 않습니다. 실제 금융 처리는 기존 승인된 도메인 작업에서만 수행됩니다.
      </div>
    </section>
  );
}
