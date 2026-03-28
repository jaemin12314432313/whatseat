"use client";

import { useCallback, useEffect, useState } from "react";

import { readApiError } from "@/lib/api/clientFetch";
import {
  mergeMockHistoryItems,
  mockHistoryItems,
  readMockHistoryItemsFromStorage,
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
    const fromStorage = readMockHistoryItemsFromStorage(teamId);
    setItems(mergeMockHistoryItems(mockHistoryItems, fromStorage));
  }, [teamId]);

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
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          팀
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          확정 메뉴 이력
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {teamName} · 날짜순 (최근이 위)
        </p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white px-4 py-12 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          아직 확정된 이력이 없어요.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/40">
          {items.map((item) => (
            <li
              key={item.sessionId}
              className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {formatHistoryDate(item.date)}
                </p>
                <p className="mt-1 text-base text-zinc-800 dark:text-zinc-100">
                  {item.winningLabels.length > 0
                    ? item.winningLabels.join(", ")
                    : "미정"}
                </p>
                {item.isTie && item.winningLabels.length > 1 ? (
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    동점 공동 1위
                  </p>
                ) : null}
                {item.candidates && item.candidates.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      그날 후보
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {item.candidates.map((c, idx) => (
                        <li
                          key={`${item.sessionId}-${idx}-${c.label}`}
                          className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                          {c.label}{" "}
                          <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                            ({c.voteCount}표)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              <p className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                마감 {formatClosedAt(item.closedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
