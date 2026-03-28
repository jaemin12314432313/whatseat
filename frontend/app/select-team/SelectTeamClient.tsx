"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { readApiError } from "@/lib/api/clientFetch";

type TeamRow = { id: string; name: string };

type MeTeamsResponse = {
  teams: TeamRow[];
  selectedTeamId: string | null;
};

export function SelectTeamClient({ nextHref }: { nextHref: string }) {
  const router = useRouter();
  const [data, setData] = useState<MeTeamsResponse | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/teams", { cache: "no-store" });
        const json = (await res.json()) as MeTeamsResponse;
        if (cancelled) return;
        setData(json);
      } catch {
        if (!cancelled) setData({ teams: [], selectedTeamId: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectTeam = useCallback(
    async (teamId: string) => {
      if (!teamId || busyId) return;
      setBusyId(teamId);
      setError(null);
      try {
        const res = await fetch("/api/me/selected-team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId }),
        });
        if (!res.ok) {
          setError(await readApiError(res));
          return;
        }
        router.refresh();
        router.replace(nextHref);
      } finally {
        setBusyId(null);
      }
    },
    [busyId, nextHref, router],
  );

  const autoSingleRef = useRef(false);
  useEffect(() => {
    if (!data || data.teams.length !== 1 || autoSingleRef.current) return;
    const only = data.teams[0];
    if (!only?.id) return;
    autoSingleRef.current = true;
    void selectTeam(only.id);
  }, [data, selectTeam]);

  if (!data) {
    return (
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        팀 목록을 불러오는 중…
      </p>
    );
  }

  if (data.teams.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
          아직 소속된 팀이 없어요.
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          관리자에게 팀 초대를 요청한 뒤 다시 로그인해 주세요.
        </p>
        <button
          type="button"
          onClick={() => router.replace(nextHref)}
          className="mt-6 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          홈으로
        </button>
      </div>
    );
  }

  if (data.teams.length === 1) {
    return (
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        팀을 설정하는 중…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-center text-sm text-slate-600 dark:text-slate-300">
        점심 투표에 사용할{" "}
        <span className="font-semibold text-slate-900 dark:text-white">
          팀을 하나
        </span>
        선택해 주세요.
      </p>
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {data.teams.map((t) => {
          const loading = busyId === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void selectTeam(t.id)}
                className="flex h-full min-h-[5.5rem] w-full flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-4 text-center shadow-sm transition hover:border-blue-300 hover:shadow-md disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-700"
              >
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {loading ? "…" : t.name}
                </span>
                {loading ? (
                  <span className="mt-1 text-xs text-slate-500">선택 중</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
