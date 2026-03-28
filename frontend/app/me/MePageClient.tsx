"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { readApiError } from "@/lib/api/clientFetch";
import { TeamSwitcher } from "@/components/TeamSwitcher";
import type { MyVoteHistoryItem } from "@/lib/lunch/types";
import { createClient } from "@/lib/supabase/client";

function formatVotedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatSessionDate(d: string): string {
  try {
    return new Date(d + "T12:00:00").toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  } catch {
    return d;
  }
}

export function MePageClient({ selectTeamHref }: { selectTeamHref: string }) {
  const [email, setEmail] = useState<string | null>(null);
  const [items, setItems] = useState<MyVoteHistoryItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) {
        setEmail(null);
        return;
      }
      if (u.email?.trim()) {
        setEmail(u.email.trim());
        return;
      }
      setEmail(u.is_anonymous ? "익명 로그인 (이메일 없음)" : null);
    });
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadError(null);
    const res = await fetch("/api/me/vote-history", { cache: "no-store" });
    if (!res.ok) {
      setLoadError(await readApiError(res));
      setItems([]);
      return;
    }
    const body = (await res.json()) as { items: MyVoteHistoryItem[] };
    setItems(body.items);
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 sm:px-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          계정
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          마이페이지
        </h1>
      </div>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          로그인 정보
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {email ?? "불러오는 중…"}
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          팀 설정
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          헤더와 동일하게 보고 있는 팀을 바꿀 수 있어요. 목록에서 골라도 되고, 카드
          화면에서 다시 고를 수 있어요.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <TeamSwitcher />
          <Link
            href={selectTeamHref}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            팀 다시 고르기
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            내 투표 이력
          </h2>
          <button
            type="button"
            onClick={() => void loadHistory()}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            새로고침
          </button>
        </div>
        {loadError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            {loadError}
          </p>
        ) : null}
        {items === null ? (
          <p className="mt-6 text-sm text-slate-500">불러오는 중…</p>
        ) : items.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            아직 기록된 투표가 없어요.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-700">
                  <th className="pb-3 pr-3">투표 시각</th>
                  <th className="pb-3 pr-3">팀</th>
                  <th className="pb-3 pr-3">세션 날짜</th>
                  <th className="pb-3 pr-3">메뉴</th>
                  <th className="pb-3">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((row) => (
                  <tr key={`${row.sessionId}-${row.votedAt}`}>
                    <td className="py-3 pr-3 tabular-nums text-slate-600 dark:text-slate-300">
                      {formatVotedAt(row.votedAt)}
                    </td>
                    <td className="py-3 pr-3 font-medium text-slate-900 dark:text-slate-50">
                      {row.teamName}
                    </td>
                    <td className="py-3 pr-3 text-slate-600 dark:text-slate-300">
                      {formatSessionDate(row.sessionDate)}
                    </td>
                    <td className="py-3 pr-3 text-slate-800 dark:text-slate-100">
                      {row.menuLabel}
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">
                      {row.sessionStatus === "open" ? "진행 중" : "마감"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
