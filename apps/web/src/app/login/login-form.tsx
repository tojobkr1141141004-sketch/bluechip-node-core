"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@apex-matrix/database";

function validateStrongPassword(password: string) {
  return (
    password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setMessage(null);

    try {
      const supabase = createBrowserSupabaseClient();

      if (mode === "signup") {
        if (!validateStrongPassword(password)) {
          setMessage("회원가입 비밀번호는 12자 이상이며 영문 대문자·소문자·숫자·특수문자를 각각 1개 이상 포함해야 합니다.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName
            },
            emailRedirectTo: window.location.origin + "/auth/confirm?next=/dashboard"
          }
        });

        if (error) throw error;

        if (data.session) {
          router.push("/dashboard");
          router.refresh();
        } else {
          setMessage("가입이 완료되었습니다. 이메일 인증을 확인하세요.");
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "인증 처리에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {mode === "signup" ? (
        <label className="block text-sm text-zinc-300">
          표시 이름
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-emerald-300/40"
            autoComplete="name"
            required
          />
        </label>
      ) : null}
      <label className="block text-sm text-zinc-300">
        이메일
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-emerald-300/40"
          type="email"
          autoComplete="email"
          required
        />
      </label>
      {mode === "signup" ? (
        <p className="text-[11px] leading-5 text-zinc-500">
          가입 비밀번호는 12자 이상이며 대문자·소문자·숫자·특수문자를 각각 포함해야 합니다.
        </p>
      ) : null}
      <label className="block text-sm text-zinc-300">
        비밀번호
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-emerald-300/40"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={mode === "signup" ? 12 : 1}
          required
        />
      </label>
      {message ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
          {message}
        </p>
      ) : null}
      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="w-full rounded-xl bg-emerald-300 px-4 py-3 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
      </button>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setMessage(null);
        }}
        className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300"
      >
        {mode === "login" ? "새 계정 만들기" : "로그인으로 돌아가기"}
      </button>
    </div>
  );
}
