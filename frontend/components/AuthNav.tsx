"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function AuthNav() {
  const router = useRouter();
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    function pick(u: {
      email?: string | null;
      user_metadata?: { full_name?: string };
      is_anonymous?: boolean;
    } | null) {
      if (!u) return null;
      const meta = u.user_metadata?.full_name?.trim();
      if (meta) return meta;
      const em = u.email?.trim();
      if (em) return em;
      if (u.is_anonymous) return "게스트";
      return null;
    }
    supabase.auth.getUser().then(({ data }) => {
      setLabel(pick(data.user));
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLabel(pick(session?.user ?? null));
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    setLabel(null);
  }, [router]);

  if (label) {
    return (
      <div className="flex max-w-[min(12rem,40vw)] flex-col items-end gap-1 sm:max-w-none sm:flex-row sm:items-center sm:gap-3">
        <span
          className="truncate text-xs text-slate-500 dark:text-slate-400"
          title={label}
        >
          {label}
        </span>
        <button
          type="button"
          onClick={signOut}
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700 dark:hover:text-white"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
    >
      로그인
    </Link>
  );
}
