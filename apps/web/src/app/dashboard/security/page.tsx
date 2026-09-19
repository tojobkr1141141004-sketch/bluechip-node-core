import { requireWebUser } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { ShieldCheck } from "lucide-react";
import { SecurityForm } from "./security-form";

export const instant = false;

export default async function SecurityPage() {
  const { user } = await requireWebUser();

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Account Security"
        title="보안 설정"
        description="현재 비밀번호를 확인한 뒤 강력한 새 비밀번호로 변경할 수 있습니다."
        icon={ShieldCheck}
      />

      <div className="app-panel rounded-[24px] p-6 sm:p-8">
        <div className="mt-5 rounded-2xl border app-card-soft p-4 text-xs leading-5 text-slate-500">
          로그인 계정: <span className="text-slate-300">{user.email ?? "미등록"}</span>
        </div>
        <div className="mt-6">
          <SecurityForm email={user.email ?? ""} />
        </div>
      </div>
    </section>
  );
}
