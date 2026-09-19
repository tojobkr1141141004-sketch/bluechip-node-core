"use client";

import { useState } from "react";
import { CheckCircle2, Mail, UserRound } from "lucide-react";
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
          setMessage("비밀번호는 12자 이상이며 영문 대문자·소문자·숫자·특수문자를 각각 1개 이상 포함해야 합니다.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo:
              window.location.origin + "/auth/confirm?next=/dashboard"
          }
        });

        if (error) throw error;

        if (data.session) {
          router.push("/dashboard");
          router.refresh();
        } else {
          setMessage("가입이 완료되었습니다. 받은 이메일에서 인증을 완료하면 로그인할 수 있습니다.");
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
      setMessage(
        error instanceof Error ? error.message : "인증 처리에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <div className="space-y-5">
      {isSignup ? (
        <label className="grid gap-2 text-xs font-medium">
          <span className="flex items-center gap-2">
            <UserRound className="h-3.5 w-3.5" style={{ color: "var(--muted)" }} />
            표시 이름
          </span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="app-input w-full rounded-2xl px-4 py-3.5 text-sm transition"
            autoComplete="name"
            placeholder="서비스에서 사용할 이름"
            required
          />
        </label>
      ) : null}

      <label className="grid gap-2 text-xs font-medium">
        <span className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5" style={{ color: "var(--muted)" }} />
          이메일
        </span>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="app-input w-full rounded-2xl px-4 py-3.5 text-sm transition"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </label>

      <label className="grid gap-2 text-xs font-medium">
        <span>비밀번호</span>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="app-input w-full rounded-2xl px-4 py-3.5 text-sm transition"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={isSignup ? 12 : 1}
          placeholder={isSignup ? "12자 이상" : "비밀번호 입력"}
          required
        />
      </label>

      {isSignup ? (
        <div className="grid gap-2 rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
            Password Policy
          </div>
          <div className="grid gap-2 text-[10px] sm:grid-cols-2">
            {[
              "12자 이상",
              "영문 대문자 포함",
              "영문 소문자 포함",
              "숫자 포함",
              "특수문자 포함"
            ].map((rule) => (
              <div key={rule} className="flex items-center gap-2" style={{ color: "var(--muted-strong)" }}>
                <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                {rule}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {message ? (
        <div
          role="status"
          className="rounded-2xl border p-4 text-xs leading-5"
          style={{
            borderColor:
              message.includes("완료") ? "color-mix(in srgb, var(--accent) 20%, var(--border))" : "var(--border)",
            background:
              message.includes("완료") ? "var(--accent-soft)" : "var(--surface-soft)",
            color: "var(--muted-strong)"
          }}
        >
          {message}
        </div>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="app-button-primary w-full rounded-2xl px-4 py-3.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "처리 중..." : isSignup ? "회원가입하고 시작하기" : "안전하게 로그인"}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode(isSignup ? "login" : "signup");
          setMessage(null);
        }}
        className="w-full rounded-2xl border px-4 py-3.5 text-xs font-semibold transition"
        style={{
          borderColor: "var(--border)",
          color: "var(--muted-strong)",
          background: "var(--surface-soft)"
        }}
      >
        {isSignup ? "기존 계정으로 로그인" : "새 계정 만들기"}
      </button>
    </div>
  );
}
