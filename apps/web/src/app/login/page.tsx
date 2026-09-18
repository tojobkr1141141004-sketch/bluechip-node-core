import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "로그인"
};

export default function LoginPage() {
  return (
    <main className="min-h-screen px-6 py-12 sm:px-10">
      <section className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
          APEX-MATRIX
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">회원 로그인</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          가입 후 로그인하면 계정과 자산 영역을 이용할 수 있습니다.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
