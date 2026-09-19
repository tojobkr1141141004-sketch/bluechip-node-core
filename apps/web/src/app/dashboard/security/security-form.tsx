"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@apex-matrix/database";
import type { AppLocale } from "@apex-matrix/i18n";

function isStrongPassword(password: string) {
  return (
    password.length >= 12 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

const messages = {
  ko: { noEmail: "이메일 계정을 확인할 수 없습니다.", weak: "새 비밀번호는 12자 이상이며 영문 대문자·소문자·숫자·특수문자를 각각 1개 이상 포함해야 합니다.", mismatch: "새 비밀번호와 확인용 비밀번호가 일치하지 않습니다.", same: "현재 비밀번호와 다른 비밀번호를 사용하세요.", wrong: "현재 비밀번호가 올바르지 않습니다.", success: "비밀번호가 변경되었습니다. 다시 로그인해야 하는 경우 안내에 따라 진행하세요.", failed: "비밀번호 변경에 실패했습니다.", current: "현재 비밀번호", next: "새 비밀번호", confirm: "새 비밀번호 확인", guide: "12자 이상 + 대문자 + 소문자 + 숫자 + 특수문자를 사용하세요. 이전 비밀번호와 다른 값을 사용해야 합니다.", checking: "확인 중...", submit: "비밀번호 변경" },
  ja: { noEmail: "メールアカウントを確認できません。", weak: "新しいパスワードは12文字以上で、大文字・小文字・数字・記号をそれぞれ1文字以上含めてください。", mismatch: "新しいパスワードと確認用パスワードが一致しません。", same: "現在のパスワードとは異なる値を使用してください。", wrong: "現在のパスワードが正しくありません。", success: "パスワードを変更しました。再ログインが必要な場合は画面の案内に従ってください。", failed: "パスワードを変更できませんでした。", current: "現在のパスワード", next: "新しいパスワード", confirm: "新しいパスワード（確認）", guide: "12文字以上で、大文字・小文字・数字・記号を含め、以前とは異なるパスワードを使用してください。", checking: "確認中...", submit: "パスワードを変更" },
  en: { noEmail: "We could not verify the email account.", weak: "Use at least 12 characters with an uppercase letter, lowercase letter, number, and symbol.", mismatch: "The new passwords do not match.", same: "Use a password different from your current password.", wrong: "The current password is incorrect.", success: "Your password has been changed. Follow the prompt if you need to sign in again.", failed: "We could not change your password.", current: "Current password", next: "New password", confirm: "Confirm new password", guide: "Use at least 12 characters with uppercase and lowercase letters, a number, and a symbol. Do not reuse your current password.", checking: "Checking...", submit: "Change password" }
} as const;

export function SecurityForm({ email, locale }: { email: string; locale: AppLocale }) {
  const router = useRouter();
  const copy = messages[locale];
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setMessage(null);

    if (!email) {
      setMessage(copy.noEmail);
      return;
    }

    if (!isStrongPassword(newPassword)) {
      setMessage(copy.weak);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage(copy.mismatch);
      return;
    }

    if (currentPassword === newPassword) {
      setMessage(copy.same);
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
        throw new Error(copy.wrong);
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage(copy.success);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <label className="block text-xs text-slate-300">
        {copy.current}
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
        {copy.next}
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
        {copy.confirm}
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
        {copy.guide}
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
        {loading ? copy.checking : copy.submit}
      </button>
    </div>
  );
}
