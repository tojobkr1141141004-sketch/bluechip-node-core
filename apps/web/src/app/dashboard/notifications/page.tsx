import { Bell, CheckCheck, ChevronRight, Circle } from "lucide-react";
import { localeFormats, localizeHref } from "@apex-matrix/i18n";
import {
  getUserNotifications,
  getUserUnreadNotificationCount
} from "@apex-matrix/database";
import { requireWebUser } from "@/lib/auth";
import { getRequestLocale } from "@/lib/locale";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

export const instant = false;

function formatDate(value: string | null | undefined, intlLocale: string, timeZone: string) {
  return value
    ? new Date(value).toLocaleString(intlLocale, {
        timeZone,
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "-";
}

const pageMessages = {
  ko: {
    eyebrow: "알림센터", title: "내 알림", description: "채굴 시작과 같은 중요한 사용자 안내를 여기에서 확인할 수 있습니다.",
    loadTitle: "알림을 불러오지 못했습니다.", loadDescription: "잠시 후 다시 시도해 주세요.", markAll: "모두 읽음",
    total: "전체 알림", unread: "읽지 않은 알림", retention: "보관 기준", permanent: "영구 기록",
    empty: "아직 도착한 알림이 없습니다.", emptyDescription: "중요한 사용자 안내가 생기면 이곳에 표시됩니다.",
    new: "새 알림", open: "내용 확인", markRead: "읽음 처리", privacy: "알림은 회원별로 분리되어 저장되며 다른 회원의 알림은 조회할 수 없습니다.",
    types: { mining_contract_started: "채굴", finance_request: "금융", system: "시스템", fallback: "안내" }
  },
  ja: {
    eyebrow: "通知センター", title: "通知", description: "マイニング開始など、アカウントに関する重要なお知らせを確認できます。",
    loadTitle: "通知を読み込めませんでした。", loadDescription: "しばらくしてからもう一度お試しください。", markAll: "すべて既読にする",
    total: "すべての通知", unread: "未読", retention: "保存方針", permanent: "継続保存",
    empty: "通知はまだありません。", emptyDescription: "重要なお知らせが届くと、ここに表示されます。",
    new: "新着", open: "内容を確認", markRead: "既読にする", privacy: "通知は会員ごとに分離して保存され、他の会員から閲覧できません。",
    types: { mining_contract_started: "マイニング", finance_request: "金融", system: "システム", fallback: "お知らせ" }
  },
  en: {
    eyebrow: "Notification center", title: "Notifications", description: "Review important account notices, including mining starts.",
    loadTitle: "We could not load notifications.", loadDescription: "Please try again shortly.", markAll: "Mark all read",
    total: "All notifications", unread: "Unread", retention: "Retention", permanent: "Persistent record",
    empty: "No notifications yet.", emptyDescription: "Important account notices will appear here.",
    new: "New", open: "View details", markRead: "Mark as read", privacy: "Notifications are isolated by member and cannot be viewed by other members.",
    types: { mining_contract_started: "Mining", finance_request: "Finance", system: "System", fallback: "Notice" }
  }
};

export default async function NotificationsPage() {
  const { supabase } = await requireWebUser();
  const locale = await getRequestLocale();
  const messages = pageMessages[locale];
  const dateFormat = localeFormats[locale];

  const [notificationsResult, unreadResult] = await Promise.all([
    getUserNotifications(supabase),
    getUserUnreadNotificationCount(supabase)
  ]);

  if (notificationsResult.error || unreadResult.error) {
    return (
      <section className="rounded-3xl border border-rose-300/10 bg-rose-300/[0.04] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300/80">
          {messages.eyebrow}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
          {messages.loadTitle}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {messages.loadDescription}
        </p>
      </section>
    );
  }

  const notifications = notificationsResult.data ?? [];
  const unreadCount = unreadResult.count ?? 0;

  return (
    <section className="space-y-4">
      <div className="app-panel rounded-[24px] p-6 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
              <Bell className="h-4 w-4" />
              {messages.eyebrow}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{messages.title}</h1>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">
              {messages.description}
            </p>
          </div>

          {unreadCount > 0 ? (
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-3.5 py-2.5 text-[11px] font-semibold text-slate-300 transition hover:border-emerald-300/20 hover:text-emerald-200"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {messages.markAll}
              </button>
            </form>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="app-card-soft rounded-2xl p-4">
            <div className="text-[10px] text-slate-600">{messages.total}</div>
            <div className="mt-2 text-xl font-semibold">{notifications.length}</div>
          </div>
          <div className="app-card-soft rounded-2xl p-4">
            <div className="text-[10px] text-slate-600">{messages.unread}</div>
            <div className="mt-2 text-xl font-semibold text-emerald-200">{unreadCount}</div>
          </div>
          <div className="app-card-soft rounded-2xl p-4">
            <div className="text-[10px] text-slate-600">{messages.retention}</div>
            <div className="mt-2 text-sm font-semibold">{messages.permanent}</div>
          </div>
        </div>
      </div>

      <section className="app-panel rounded-[24px] p-5 sm:p-6">
        {!notifications.length ? (
          <div className="rounded-2xl border border-white/[0.06] p-10 text-center">
            <Bell className="mx-auto h-8 w-8 text-slate-600" />
            <div className="mt-3 text-sm font-semibold">{messages.empty}</div>
            <div className="mt-1 text-[10px] text-slate-600">
              {messages.emptyDescription}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const unread = !notification.read_at;
              const label = messages.types[notification.notification_type as keyof typeof messages.types] ?? messages.types.fallback;

              return (
                <article
                  key={notification.id}
                  className={
                    "rounded-2xl border p-4 transition " +
                    (unread
                      ? "border-emerald-300/20 bg-emerald-300/[0.035]"
                      : "border-white/[0.06] bg-white/[0.01]")
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.04] text-emerald-200">
                      {unread ? (
                        <Circle className="h-3.5 w-3.5 fill-current" />
                      ) : (
                        <CheckCheck className="h-4 w-4 text-slate-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/[0.06] px-2 py-1 text-[9px] font-semibold text-slate-500">
                          {label}
                        </span>
                        {unread ? (
                          <span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.05] px-2 py-1 text-[9px] font-semibold text-emerald-200">
                            {messages.new}
                          </span>
                        ) : null}
                      </div>

                      <h2 className="mt-2 text-sm font-semibold">{notification.title}</h2>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{notification.message}</p>
                      <div className="mt-2 text-[10px] text-slate-600">
                        {formatDate(notification.created_at, dateFormat.intlLocale, dateFormat.timeZone)}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {notification.href ? (
                          <form action={markNotificationRead}>
                            <input type="hidden" name="notification_id" value={notification.id} />
                            <input type="hidden" name="redirect_to" value={localizeHref(notification.href, locale)} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-300 px-3 py-2 text-[10px] font-bold text-slate-950 transition hover:bg-emerald-200"
                            >
                              {messages.open}
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          </form>
                        ) : null}

                        {unread ? (
                          <form action={markNotificationRead}>
                            <input type="hidden" name="notification_id" value={notification.id} />
                            <input type="hidden" name="redirect_to" value={localizeHref("/dashboard/notifications", locale)} />
                            <button
                              type="submit"
                              className="rounded-xl border border-white/[0.08] px-3 py-2 text-[10px] font-semibold text-slate-400 transition hover:text-slate-200"
                            >
                              {messages.markRead}
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="text-[10px] leading-5 text-slate-600">
        {messages.privacy}
      </div>
    </section>
  );
}
