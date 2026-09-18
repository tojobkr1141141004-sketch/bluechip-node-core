import { ShieldCheck } from "lucide-react";
import { requireAdminUser } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const { user } = await requireAdminUser();

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <section className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-emerald-300/15 bg-emerald-300/10">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
              APEX-MATRIX
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Admin Foundation</h1>
          </div>
        </div>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-400">
          운영자 인증이 완료되었습니다. 로그인 계정: {user.email ?? user.id}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["회원", "KYC", "금융", "시스템"].map((item) => (
            <div key={item} className="rounded-2xl border border-white/8 bg-black/10 px-4 py-4 text-sm text-zinc-300">
              {item}
            </div>
          ))}
        </div>
        <form action="/auth/signout" method="post" className="mt-6">
          <button className="rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300" type="submit">
            로그아웃
          </button>
        </form>
      </section>
    </main>
  );
}
