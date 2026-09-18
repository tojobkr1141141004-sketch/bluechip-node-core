"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@apex-matrix/database";

function isStrongPassword(password: string) {
  return (
    password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function SecurityForm({ email }: { email: string }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setMessage(null);

    if (!email) {
      setMessage("이메일 계정을 확인할 수 없습니다.");
      return;
    }

    if (!isStrongPassword(newPassword)) {
      setMessage("새 비밀번호는 12자 이상이며 영문 대문자·소문자·숫자·특수문자를 각각 1개 이상 포함해야 합니다.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("새 비밀번호와 확인용 비밀번호가 일치하지 않습니다.");
      return;
    }

    if (currentPassword === newPassword) {
      setMessage("현재 비밀번호와 다른 비밀번호를 사용하세요.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword
      });

      if (reauthError) {
        throw new Error("현재 비밀번호가 올바르지 않습니다.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("비밀번호가 변경되었습니다. 다시 로그인해야 하는 경우 안내에 따라 진행하세요.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <label className="block text-xs text-slate-300">
        현재 비밀번호
        <input
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          type="password"
          autoComplete="current-password"
          minLength={1}
          required
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-emerald-300/40"
        />
      </label>

      <label className="block text-xs text-slate-300">
        새 비밀번호
        <input
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-emerald-300/40"
        />
      </label>

      <label className="block text-xs text-slate-300">
        새 비밀번호 확인
        <input
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none focus:border-emerald-300/40"
        />
      </label>

      <div className="rounded-2xl border border-white/[0.06] bg-black/10 p-4 text-xs leading-5 text-slate-600">
        12자 이상 + 대문자 + 소문자 + 숫자 + 특수문자를 사용하세요. 이전 비밀번호와 다른 값을 사용해야 합니다.
      </div>

      {message ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-300">
          {message}
        </div>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="rounded-xl bg-emerald-300 px-5 py-3 text-xs font-bold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "확인 중..." : "비밀번호 변경"}
      </button>
    </div>
  );
}
