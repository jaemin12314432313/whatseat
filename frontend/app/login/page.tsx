import { Suspense } from "react";

import { LoginClient } from "./LoginClient";

function LoginFallback() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white px-6 py-10 shadow-sm sm:max-w-lg sm:px-8 dark:border-slate-700 dark:bg-slate-900">
        <div className="h-8 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-3 h-4 w-full max-w-xs animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="mt-6 h-10 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="mt-3 h-10 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="mt-4 flex gap-2">
          <div className="h-10 flex-1 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-10 flex-1 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath =
    typeof next === "string" && next.startsWith("/") ? next : "/";

  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient nextPath={nextPath} />
    </Suspense>
  );
}
