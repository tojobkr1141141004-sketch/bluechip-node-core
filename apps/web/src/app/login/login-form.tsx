"use client";

import { useState } from "react";
import { CheckCircle2, Mail, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@apex-matrix/database";
import {
  authMessages,
  localeFromPathname,
  localizeHref
} from "@apex-matrix/i18n";

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
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const messages = authMessages[locale];
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
          setMessage(messages.strongPasswordError);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo:
              window.location.origin +
              "/auth/confirm?next=" +
              encodeURIComponent(localizeHref("/dashboard", locale))
          }
        });

        if (error) throw error;

        if (data.session) {
          router.push(localizeHref("/dashboard", locale) as never);
          router.refresh();
        } else {
          setMessage(messages.signupComplete);
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      router.push(localizeHref("/dashboard", locale) as never);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : messages.authFailed
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
            {messages.displayName}
          </span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="app-input w-full rounded-2xl px-4 py-3.5 text-sm transition"
            autoComplete="name"
            placeholder={messages.displayNamePlaceholder}
            required
          />
        </label>
      ) : null}

      <label className="grid gap-2 text-xs font-medium">
        <span className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5" style={{ color: "var(--muted)" }} />
          {messages.email}
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
        <span>{messages.password}</span>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="app-input w-full rounded-2xl px-4 py-3.5 text-sm transition"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={isSignup ? 12 : 1}
          placeholder={
            isSignup
              ? messages.passwordPlaceholderSignup
              : messages.passwordPlaceholderLogin
          }
          required
        />
      </label>

      {isSignup ? (
        <div className="grid gap-3 rounded-2xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-soft)" }}>
          <p className="app-muted text-[10px] leading-5">
            {messages.passwordPolicy}
          </p>
          <div className="text-[10px] font-semibold tracking-[0.12em]" style={{ color: "var(--muted)" }}>
            {messages.passwordPolicyLabel}
          </div>
          <div className="grid gap-2 text-[10px] sm:grid-cols-2" style={{ color: "var(--muted-strong)" }}>
            {messages.passwordRules.map((rule) => (
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
              message === messages.signupComplete ? "color-mix(in srgb, var(--accent) 20%, var(--border))" : "var(--border)",
            background:
              message === messages.signupComplete ? "var(--accent-soft)" : "var(--surface-soft)",
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
        {loading
          ? messages.loading
          : isSignup
            ? messages.signupButton
            : messages.loginButton}
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
        {isSignup ? messages.existingAccount : messages.newAccount}
      </button>
    </div>
  );
}
