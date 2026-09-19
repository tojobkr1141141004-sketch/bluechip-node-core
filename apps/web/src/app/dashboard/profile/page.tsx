import { UserRound } from "lucide-react";
import Link from "next/link";
import { requireWebUser } from "@/lib/auth";
import { saveProfile } from "./actions";
import { PageHeader } from "@/components/app/page-header";
import { commonMessages, localizeHref } from "@apex-matrix/i18n";
import { getRequestLocale } from "@/lib/locale";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const pageMessages = {
  ko: {
    title: "내 정보", description: "서비스에서 표시되는 기본 정보와 언어 설정을 관리합니다.", profile: "기본 프로필", profileDescription: "계정에 표시되는 사용자 정보를 관리합니다.", saved: "저장되었습니다.", failed: "요청을 처리하지 못했습니다.", email: "이메일", displayName: "표시 이름", username: "아이디", usernamePlaceholder: "영문 소문자·숫자·밑줄", language: "언어", timezone: "시간대", save: "저장", dashboard: "대시보드로",
    errors: { invalid: "입력값을 확인하세요. 표시 이름은 1~80자, 아이디는 영문 소문자·숫자·밑줄 3~32자입니다.", username_taken: "이미 사용 중인 아이디입니다.", save_failed: "저장하지 못했습니다. 잠시 후 다시 시도하세요." }
  },
  ja: {
    title: "プロフィール", description: "サービスに表示される基本情報と言語設定を管理します。", profile: "基本プロフィール", profileDescription: "アカウントに表示される情報を管理します。", saved: "保存しました。", failed: "処理できませんでした。", email: "メール", displayName: "表示名", username: "ユーザーID", usernamePlaceholder: "英小文字・数字・アンダースコア", language: "言語", timezone: "タイムゾーン", save: "保存", dashboard: "ダッシュボードへ",
    errors: { invalid: "入力内容を確認してください。表示名は1～80文字、ユーザーIDは英小文字・数字・アンダースコアで3～32文字です。", username_taken: "このユーザーIDは既に使用されています。", save_failed: "保存できませんでした。しばらくしてからお試しください。" }
  },
  en: {
    title: "Profile", description: "Manage the basic information and language shown in the service.", profile: "Basic profile", profileDescription: "Manage the details shown on your account.", saved: "Saved.", failed: "We could not process your request.", email: "Email", displayName: "Display name", username: "Username", usernamePlaceholder: "Lowercase letters, numbers, underscores", language: "Language", timezone: "Time zone", save: "Save", dashboard: "Back to dashboard",
    errors: { invalid: "Check your input. Display name must be 1–80 characters; username must be 3–32 lowercase letters, numbers, or underscores.", username_taken: "That username is already in use.", save_failed: "We could not save your profile. Please try again shortly." }
  }
};

export default async function ProfilePage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const { supabase, user } = await requireWebUser();
  const locale = await getRequestLocale();
  const messages = pageMessages[locale];
  const common = commonMessages[locale];

  const [profileResult, settingsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, username, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_settings")
      .select("locale, timezone")
      .eq("user_id", user.id)
      .maybeSingle()
  ]);

  const params = await searchParams;
  const updated = first(params.updated) === "1";
  const error = first(params.error);

  return (
    <section className="space-y-6">
      <PageHeader eyebrow={common.nav.profile} title={messages.title} description={messages.description} icon={UserRound} />

      <div className="app-panel rounded-[24px] p-6 sm:p-8">
        <div className="app-muted text-[10px] font-semibold tracking-[0.14em]">{messages.profile}</div>
        <h2 className="mt-2 text-lg font-semibold">{messages.profile}</h2>
        <p className="app-muted mt-1 text-xs leading-5">
          {messages.profileDescription}
        </p>

        {updated ? (
          <p className="mt-4 rounded-xl border border-emerald-300/15 bg-[var(--accent)]/[0.05] p-3 text-xs text-emerald-200">
            {messages.saved}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-xl border border-rose-300/10 bg-rose-300/[0.04] p-3 text-xs text-rose-200">
            {messages.errors[error as keyof typeof messages.errors] ?? messages.failed}
          </p>
        ) : null}

        <form action={saveProfile} className="mt-6 max-w-2xl space-y-4">
          <label className="block text-xs text-slate-300">
            {messages.email}
            <input
              value={user.email ?? ""}
              readOnly
              className="mt-2 w-full rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 text-sm text-slate-500 outline-none"
            />
          </label>

          <label className="block text-xs text-slate-300">
            {messages.displayName}
            <input
              name="display_name"
              defaultValue={profileResult.data?.display_name ?? ""}
              minLength={1}
              maxLength={80}
              required
              className="mt-2 w-full rounded-xl border app-input px-4 py-3 text-sm outline-none focus:border-emerald-300/40"
            />
          </label>

          <label className="block text-xs text-slate-300">
            {messages.username}
            <input
              name="username"
              defaultValue={profileResult.data?.username ?? ""}
              minLength={3}
              maxLength={32}
              pattern="[a-z0-9_]{3,32}"
              placeholder={messages.usernamePlaceholder}
              className="mt-2 w-full rounded-xl border app-input px-4 py-3 text-sm outline-none focus:border-emerald-300/40"
            />
          </label>

          <label className="block text-xs text-slate-300">
            {messages.language}
            <select
              name="locale"
              defaultValue={settingsResult.data?.locale ?? "ko-KR"}
              className="mt-2 w-full rounded-xl border app-input px-4 py-3 text-sm outline-none focus:border-emerald-300/40"
            >
              <option value="ko-KR">한국어</option>
              <option value="ja-JP">日本語</option>
              <option value="en-US">English</option>
            </select>
          </label>

          <div className="rounded-xl border app-card-soft p-3 text-xs text-slate-600">
            {messages.timezone}: {settingsResult.data?.timezone ?? "Asia/Seoul"}
          </div>

          <button
            type="submit"
            className="rounded-xl bg-[var(--accent)] px-5 py-3 text-xs font-bold text-slate-950 hover:bg-emerald-200"
          >
            {messages.save}
          </button>
        </form>
      </div>

      <Link
        href={localizeHref("/dashboard", locale) as never}
        className="inline-flex rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-300"
      >
        {messages.dashboard}
      </Link>
    </section>
  );
}
