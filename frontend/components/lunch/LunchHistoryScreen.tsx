"use client";

import { useCallback, useEffect, useState } from "react";

import { readApiError } from "@/lib/api/clientFetch";
import {
  getVisibleMockHistoryItemsForTeam,
  removeMockHistoryItem,
} from "@/lib/lunch/mockData";
import type { LunchHistoryItem } from "@/lib/lunch/types";

function formatHistoryDate(date: string): string {
  try {
    return new Date(date + "T12:00:00").toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  } catch {
    return date;
  }
}

function formatClosedAt(iso: string): string {
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

export function LunchHistoryScreen({
  initialItems,
  teamName,
  teamId,
  apiMode = "mock",
}: {
  initialItems: LunchHistoryItem[];
  teamName: string;
  teamId: string;
  apiMode?: "mock" | "live";
}) {
  const [items, setItems] = useState<LunchHistoryItem[]>(initialItems);

  const refreshLive = useCallback(async () => {
    const res = await fetch(
      `/api/teams/${teamId}/lunch/history?limit=30`,
    );
    if (!res.ok) {
      window.alert(await readApiError(res));
      return;
    }
    const body = (await res.json()) as { items: LunchHistoryItem[] };
    setItems(body.items);
  }, [teamId]);

  const refreshMock = useCallback(() => {
    setItems(getVisibleMockHistoryItemsForTeam(teamId));
  }, [teamId]);

  const handleDeleteItem = useCallback(
    async (item: LunchHistoryItem) => {
      const ok = window.confirm(
        `${formatHistoryDate(item.date)} 확정 이력을 목록에서 삭제할까요?`,
      );
      if (!ok) return;

      if (apiMode === "live") {
        const res = await fetch(
          `/api/teams/${teamId}/lunch/history/${item.sessionId}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          window.alert(await readApiError(res));
          return;
        }
        await refreshLive();
        return;
      }

      removeMockHistoryItem(teamId, item.sessionId);
      refreshMock();
    },
    [apiMode, refreshLive, refreshMock, teamId],
  );

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    if (apiMode !== "mock") return;
    refreshMock();
  }, [apiMode, refreshMock]);

  useEffect(() => {
    const onFocus = () => {
      if (apiMode === "live") void refreshLive();
      else refreshMock();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [apiMode, refreshLive, refreshMock]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          팀
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          확정 메뉴 이력
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {teamName} · 날짜순 (최근이 위)
        </p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-slate-200/80 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          아직 확정된 이력이 없어요.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
          {items.map((item) => (
            <li
              key={item.sessionId}
              className="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {formatHistoryDate(item.date)}
                </p>
                <p className="mt-1.5 text-lg font-medium text-slate-800 dark:text-slate-100">
                  {item.winningLabels.length > 0
                    ? item.winningLabels.join(", ")
                    : "미정"}
                </p>
                {item.isTie && item.winningLabels.length > 1 ? (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    동점 공동 1위
                  </p>
                ) : null}
                {item.candidates && item.candidates.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      그날 후보
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {item.candidates.map((c, idx) => (
                        <li
                          key={`${item.sessionId}-${idx}-${c.label}`}
                          className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          {c.label}{" "}
                          <span className="tabular-nums text-slate-500 dark:text-slate-400">
                            ({c.voteCount}표)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-stretch gap-3 sm:items-end">
                <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  마감 {formatClosedAt(item.closedAt)}
                </p>
                <button
                  type="button"
                  onClick={() => void handleDeleteItem(item)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  aria-label={`${formatHistoryDate(item.date)} 이력 삭제`}
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
