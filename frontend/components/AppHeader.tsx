"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { AuthNav } from "@/components/AuthNav";

const nav = [
  { href: "/", label: "오늘 점심" },
  { href: "/history", label: "이력" },
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
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href={`/${teamQuery}`}
          className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          오늘 뭐먹지?
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="flex items-center gap-1" aria-label="주요 메뉴">
            {nav.map(({ href, label }) => {
              const active = isActive(pathname, href);
              const hrefWithTeam = href === "/" ? `/${teamQuery}` : `${href}${teamQuery}`;
              return (
                <Link
                  key={href}
                  href={hrefWithTeam}
                  className={`rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
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
