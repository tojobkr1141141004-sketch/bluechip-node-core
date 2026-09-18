import type { Metadata } from "next";
import { AdminLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "운영자 로그인"
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ? await searchParams : {};
  const error = first(params.error);

  const message =
    error === "reauth"
      ? "보안상 다시 로그인해야 합니다. 최근 인증이 만료되었습니다."
      : error === "forbidden"
        ? "활성 운영자 계정만 Admin에 접근할 수 있습니다."
        : error === "configuration"
          ? "인증 설정을 확인하세요."
          : null;

  return (
    <main className="min-h-screen px-6 py-12 sm:px-10">
      <section className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
          APEX-MATRIX ADMIN
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">운영자 로그인</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Supabase Auth 인증 후 활성 운영자 계정과 최근 인증 상태를 확인합니다.
        </p>
        {message ? (
          <p className="mt-5 rounded-xl border border-amber-300/10 bg-amber-300/[0.04] px-4 py-3 text-xs leading-5 text-amber-100">
            {message}
          </p>
        ) : null}
        <div className="mt-6">
          <AdminLoginForm />
        </div>
      </section>
    </main>
  );
}
