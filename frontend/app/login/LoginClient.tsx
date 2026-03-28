"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Pending = null | "signin" | "signup" | "resend";

type AuthErrShape = {
  message?: string;
  msg?: string;
  code?: string | number;
  error_code?: string;
};

function textFromAuthError(err: AuthErrShape): string {
  const m = typeof err.message === "string" ? err.message.trim() : "";
  if (m) return m;
  const q = typeof err.msg === "string" ? err.msg.trim() : "";
  if (q) return q;
  try {
    return JSON.stringify(err);
  } catch {
    return "알 수 없는 오류";
  }
}

function isEmailNotConfirmed(err: AuthErrShape): boolean {
  const code = String(err.error_code ?? err.code ?? "").toLowerCase();
  const t = textFromAuthError(err).toLowerCase();
  return code === "email_not_confirmed" || t.includes("email not confirmed");
}

function passwordAuthMessage(err: AuthErrShape): string {
  const code = String(err.error_code ?? err.code ?? "").toLowerCase();
  const msg = textFromAuthError(err).toLowerCase();

  if (isEmailNotConfirmed(err)) {
    return "이메일 인증이 필요해요. 메일함의 링크를 확인하거나 아래에서 인증 메일을 다시 보낼 수 있어요.";
  }
  if (
    code === "invalid_credentials" ||
    code === "invalid_grant" ||
    msg.includes("invalid login") ||
    msg.includes("invalid email or password")
  ) {
    return "이메일 또는 비밀번호가 맞지 않아요.";
  }
  if (
    code === "user_already_exists" ||
    msg.includes("user already registered") ||
    msg.includes("already been registered")
  ) {
    return "이미 가입된 이메일이에요. 「이메일로 로그인」을 눌러 주세요.";
  }
  if (msg.includes("password") && msg.includes("least")) {
    return "비밀번호 규칙을 만족하지 못했어요. 더 긴 비밀번호로 시도해 보세요.";
  }
  return textFromAuthError(err);
}

export function LoginClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);

  const nextSafe = nextPath.startsWith("/") ? nextPath : "/";

  useEffect(() => {
    if (searchParams.get("error") === "auth") {
      setError("로그인 연결에 실패했어요. 다시 시도해 주세요.");
    }
  }, [searchParams]);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const finishLogin = useCallback(() => {
    router.refresh();
    const q = new URLSearchParams({ next: nextSafe });
    router.replace(`/select-team?${q.toString()}`);
  }, [router, nextSafe]);

  function validateForm(): string | null {
    const trimmed = email.trim();
    if (!trimmed || !password) return "이메일과 비밀번호를 입력해 주세요.";
    if (password.length < 6) return "비밀번호는 6자 이상이어야 해요.";
    return null;
  }

  async function submitSignIn(e: React.FormEvent) {
    e.preventDefault();
    setPending("signin");
    clearMessages();
    setShowResend(false);
    const v = validateForm();
    if (v) {
      setError(v);
      setPending(null);
      return;
    }
    const trimmed = email.trim();
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (err) {
        setError(passwordAuthMessage(err));
        setShowResend(isEmailNotConfirmed(err));
        setPending(null);
        return;
      }
      finishLogin();
    } catch {
      setError("로그인에 실패했어요.");
      setPending(null);
    }
  }

  async function clickSignUp() {
    setPending("signup");
    clearMessages();
    setShowResend(false);
    const v = validateForm();
    if (v) {
      setError(v);
      setPending(null);
      return;
    }
    const trimmed = email.trim();
    const supabase = createClient();
    const origin = window.location.origin;
    const callback = `${origin}/auth/callback?next=${encodeURIComponent(nextSafe)}`;

    try {
      const { data, error: upErr } = await supabase.auth.signUp({
        email: trimmed,
        password,
        options: { emailRedirectTo: callback },
      });
      if (upErr) {
        setError(passwordAuthMessage(upErr));
        setShowResend(isEmailNotConfirmed(upErr));
        setPending(null);
        return;
      }
      if (data.session) {
        finishLogin();
        return;
      }

      const trySignIn = () =>
        supabase.auth.signInWithPassword({ email: trimmed, password });

      let { error: inErr } = await trySignIn();
      if (!inErr) {
        finishLogin();
        return;
      }
      await new Promise((r) => setTimeout(r, 400));
      const second = await trySignIn();
      inErr = second.error;
      if (!inErr) {
        finishLogin();
        return;
      }

      setError(passwordAuthMessage(inErr));
      setShowResend(isEmailNotConfirmed(inErr));
    } catch {
      setError("가입에 실패했어요.");
    } finally {
      setPending(null);
    }
  }

  async function clickResend() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("이메일을 입력한 뒤 다시 시도해 주세요.");
      return;
    }
    setPending("resend");
    clearMessages();
    const supabase = createClient();
    const origin = window.location.origin;
    const callback = `${origin}/auth/callback?next=${encodeURIComponent(nextSafe)}`;
    try {
      const { error: err } = await supabase.auth.resend({
        type: "signup",
        email: trimmed,
        options: { emailRedirectTo: callback },
      });
      if (err) {
        setError(passwordAuthMessage(err));
        setPending(null);
        return;
      }
      setShowResend(false);
      setSuccess("인증 메일을 보냈어요. 메일함과 스팸함을 확인해 주세요.");
    } catch {
      setError("메일 재전송에 실패했어요.");
    } finally {
      setPending(null);
    }
  }

  const busy = pending !== null;

  return (
    <div className="mx-4 my-12 flex w-full max-w-md flex-col rounded-2xl border border-slate-200/80 bg-white px-6 py-10 shadow-sm sm:mx-auto sm:max-w-lg sm:px-8 dark:border-slate-700 dark:bg-slate-900">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        로그인
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        이메일과 비밀번호로 가입하거나 로그인할 수 있어요.
      </p>

      <form className="mt-6 space-y-4" onSubmit={submitSignIn}>
        <div>
          <label
            htmlFor="auth-email"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            이메일
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label
            htmlFor="auth-password"
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            비밀번호
          </label>
          <input
            id="auth-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            minLength={6}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
            placeholder="6자 이상"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {pending === "signin" ? "로그인 중…" : "이메일로 로그인"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void clickSignUp()}
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            {pending === "signup" ? "가입 중…" : "회원가입"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="mt-5 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      {success ? (
        <p className="mt-5 text-sm text-emerald-700 dark:text-emerald-400">
          {success}
        </p>
      ) : null}

      {showResend ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void clickResend()}
          className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          {pending === "resend" ? "보내는 중…" : "인증 메일 다시 받기"}
        </button>
      ) : null}
    </div>
  );
}
