"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { AuthNav } from "@/components/AuthNav";
import { TeamSwitcher } from "@/components/TeamSwitcher";

const nav = [
  { href: "/", label: "오늘 점심" },
  { href: "/history", label: "이력" },
  { href: "/me", label: "마이페이지" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const teamId = searchParams.get("teamId");
  const teamQuery = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";

  return (
    <header className="border-b border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link
          href={`/${teamQuery}`}
          className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50"
        >
          오늘 뭐먹지?
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
          <TeamSwitcher />
          <nav className="flex shrink-0 items-center gap-1" aria-label="주요 메뉴">
            {nav.map(({ href, label }) => {
              const active = isActive(pathname, href);
              const hrefWithTeam = href === "/" ? `/${teamQuery}` : `${href}${teamQuery}`;
              return (
                <Link
                  key={href}
                  href={hrefWithTeam}
                  className={`rounded-lg border-l-4 py-2 pl-2.5 pr-3 text-sm transition-colors ${
                    active
                      ? "border-blue-600 bg-blue-50 font-medium text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300"
                      : "border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <AuthNav />
        </div>
      </div>
    </header>
  );
}
