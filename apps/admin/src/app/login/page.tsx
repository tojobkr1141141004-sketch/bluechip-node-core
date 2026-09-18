import type { Metadata } from "next";
import { AdminLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "운영자 로그인"
};

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen px-6 py-12 sm:px-10">
      <section className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
          APEX-MATRIX ADMIN
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">운영자 로그인</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Supabase Auth 계정으로 인증한 뒤 활성 운영자 계정만 Admin 영역에 접근할 수 있습니다.
        </p>
        <div className="mt-6">
          <AdminLoginForm />
        </div>
      </section>
    </main>
  );
}
