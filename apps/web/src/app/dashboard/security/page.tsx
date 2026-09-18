import { requireWebUser } from "@/lib/auth";
import { SecurityForm } from "./security-form";

export const instant = false;

export default async function SecurityPage() {
  const { user } = await requireWebUser();

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.025] p-6 sm:p-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
          ACCOUNT SECURITY
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">보안 설정</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          비밀번호를 변경하기 전에 현재 비밀번호를 다시 확인합니다. 새 비밀번호는 강한 비밀번호 규칙을 적용합니다.
        </p>
        <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/10 p-4 text-xs leading-5 text-slate-500">
          로그인 계정: <span className="text-slate-300">{user.email ?? "미등록"}</span>
        </div>
        <div className="mt-6">
          <SecurityForm email={user.email ?? ""} />
        </div>
      </div>
    </section>
  );
}
