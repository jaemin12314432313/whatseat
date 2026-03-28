"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setStatus("error");
      setMessage("이메일을 입력해 주세요.");
      return;
    }

    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      setStatus("sent");
      setMessage("로그인 링크를 이메일로 보냈어요. 메일함을 확인해 주세요.");
    } catch {
      setStatus("error");
      setMessage("요청에 실패했습니다.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        로그인
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        이메일로 매직 링크를 보냅니다. 팀 점심 제안·투표는 로그인 후에만 할 수
        있어요.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            이메일
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            placeholder="you@company.com"
            required
          />
        </div>

        <button
          type="submit"
          disabled={status === "sending" || status === "sent"}
          className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {status === "sending" ? "보내는 중…" : "로그인 링크 받기"}
        </button>
      </form>

      {message ? (
        <p
          className={`mt-4 text-sm ${
            status === "error"
              ? "text-red-600 dark:text-red-400"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
