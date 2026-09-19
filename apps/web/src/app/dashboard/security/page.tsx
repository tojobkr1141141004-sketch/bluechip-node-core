import { requireWebUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { ShieldCheck } from "lucide-react";
import { SecurityForm } from "./security-form";
import { commonMessages } from "@apex-matrix/i18n";
import { getRequestLocale } from "@/lib/locale";

export const instant = false;

export default async function SecurityPage() {
  const { user } = await requireWebUser();
  const locale = await getRequestLocale();
  const common = commonMessages[locale];
  const messages = {
    ko: { title: "보안 설정", description: "현재 비밀번호를 확인한 뒤 강력한 새 비밀번호로 변경할 수 있습니다.", account: "로그인 계정", missing: "미등록" },
    ja: { title: "セキュリティ設定", description: "現在のパスワードを確認してから、安全性の高い新しいパスワードに変更できます。", account: "ログインアカウント", missing: "未登録" },
    en: { title: "Security settings", description: "Verify your current password, then change it to a strong new password.", account: "Signed-in account", missing: "Not registered" }
  }[locale];

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow={common.nav.security}
        title={messages.title}
        description={messages.description}
        icon={ShieldCheck}
      />

      <div className="app-panel rounded-[24px] p-6 sm:p-8">
        <div className="mt-5 rounded-2xl border app-card-soft p-4 text-xs leading-5 text-slate-500">
          {messages.account}: <span className="text-slate-300">{user.email ?? messages.missing}</span>
        </div>
        <div className="mt-6">
          <SecurityForm email={user.email ?? ""} locale={locale} />
        </div>
      </div>
    </section>
  );
}
