"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type TeamRow = { id: string; name: string };

type MeTeamsResponse = {
  teams: TeamRow[];
  selectedTeamId: string | null;
  syncedCookie?: boolean;
};

export function TeamSwitcher() {
  const router = useRouter();
  const [data, setData] = useState<MeTeamsResponse | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/teams", { cache: "no-store" });
        const json = (await res.json()) as MeTeamsResponse;
        if (cancelled) return;
        setData(json);
        if (json.syncedCookie) {
          router.refresh();
        }
      } catch {
        if (!cancelled) setData({ teams: [], selectedTeamId: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onChange = useCallback(
    async (teamId: string) => {
      if (!teamId || busy) return;
      setBusy(true);
      try {
        const res = await fetch("/api/me/selected-team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId }),
        });
        if (!res.ok) {
          const t = await res.text();
          window.alert(t || "팀 전환에 실패했습니다.");
          return;
        }
        setData((prev) =>
          prev ? { ...prev, selectedTeamId: teamId } : prev,
        );
        router.refresh();
      } finally {
        setBusy(false);
      }
    },
    [busy, router],
  );

  if (!data || data.teams.length === 0) {
    return null;
  }

  return (
    <label className="flex max-w-[10rem] items-center gap-1 sm:max-w-xs">
      <span className="sr-only">팀 선택</span>
      <select
        value={data.selectedTeamId ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={busy}
        className="w-full truncate rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        aria-label="보고 있는 팀"
      >
        {data.teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}
