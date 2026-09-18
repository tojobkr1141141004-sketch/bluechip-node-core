import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createWebServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "내 계정"
};

export default async function AccountPage() {
  let supabase;
  try {
    supabase = await createWebServerSupabaseClient();
  } catch {
    redirect("/login?error=configuration");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, status, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen px-6 py-12 sm:px-10">
      <section className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/20 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
          APEX-MATRIX
        </p>
        <h1 className="mt-2 text-2xl font-semibold">내 계정</h1>
        <div className="mt-6 space-y-3 text-sm text-zinc-300">
          <p>이메일: {user.email ?? "미등록"}</p>
          <p>표시 이름: {profile?.display_name ?? "미설정"}</p>
          <p>아이디: {profile?.username ?? "미설정"}</p>
          <p>계정 상태: {profile?.status ?? "unknown"}</p>
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
