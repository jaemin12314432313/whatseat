"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { loginAuthAction } from "./actions";
import { loginActionInitialState } from "./loginActionState";

export function LoginClient({ nextPath }: { nextPath: string }) {
  const searchParams = useSearchParams();
  const [urlError, setUrlError] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(
    loginAuthAction,
    loginActionInitialState,
  );

  const nextSafe = nextPath.startsWith("/") ? nextPath : "/";

  useEffect(() => {
    if (searchParams.get("error") === "auth") {
      setUrlError("로그인 연결에 실패했어요. 다시 시도해 주세요.");
    }
  }, [searchParams]);

  const displayError = urlError ?? state.error;
  const displaySuccess = state.success;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white px-6 py-10 shadow-sm sm:max-w-lg sm:px-8 dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          로그인
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          이메일과 비밀번호로 가입하거나 로그인할 수 있어요.
        </p>

        <form
          className="mt-6 space-y-4"
          action={formAction}
          onSubmit={() => setUrlError(null)}
        >
          <input type="hidden" name="next" value={nextSafe} />
          <div>
            <label
              htmlFor="auth-email"
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              이메일
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isPending}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
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
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={6}
              disabled={isPending}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50"
              placeholder="6자 이상"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              type="submit"
              name="intent"
              value="signin"
              disabled={isPending}
              className="inline-flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {isPending ? "처리 중…" : "이메일로 로그인"}
            </button>
            <button
              type="submit"
              name="intent"
              value="signup"
              disabled={isPending}
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {isPending ? "처리 중…" : "회원가입"}
            </button>
          </div>

          {displayError ? (
            <p className="pt-1 text-sm text-red-600 dark:text-red-400">
              {displayError}
            </p>
          ) : null}
          {displaySuccess ? (
            <p className="pt-1 text-sm text-emerald-700 dark:text-emerald-400">
              {displaySuccess}
            </p>
          ) : null}

          {state.showResend ? (
            <button
              type="submit"
              name="intent"
              value="resend"
              formNoValidate
              disabled={isPending}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {isPending ? "보내는 중…" : "인증 메일 다시 받기"}
            </button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
