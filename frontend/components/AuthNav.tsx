"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function AuthNav() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    setEmail(null);
  }, [router]);

  if (email) {
    return (
      <div className="flex max-w-[min(12rem,40vw)] flex-col items-end gap-1 sm:max-w-none sm:flex-row sm:items-center sm:gap-3">
        <span
          className="truncate text-xs text-zinc-500 dark:text-zinc-400"
          title={email}
        >
          {email}
        </span>
        <button
          type="button"
          onClick={signOut}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="rounded-md px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
    >
      로그인
    </Link>
  );
}
