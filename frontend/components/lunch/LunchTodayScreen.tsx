"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { readApiError } from "@/lib/api/clientFetch";
import { computeCloseResult } from "@/lib/lunch/computeCloseResult";
import {
  createMockOpenLunchSession,
  MOCK_CURRENT_USER,
  mockTodaySessionStorageKey,
  readMockHistoryItemsFromStorage,
  todayDateLocal,
  writeMockHistoryItemsToStorage,
} from "@/lib/lunch/mockData";
import {
  menuLabelDedupKey,
  trimMenuLabel,
  validateMenuLabelTrimmed,
} from "@/lib/lunch/normalizeLabel";
import type {
  LunchHistoryItem,
  LunchTodayPayload,
  MenuSuggestion,
} from "@/lib/lunch/types";

function formatClosesAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

async function fetchTodayPayload(
  teamId: string,
): Promise<LunchTodayPayload | null> {
  const res = await fetch(`/api/teams/${teamId}/lunch/today`);
  if (!res.ok) {
    window.alert(await readApiError(res));
    return null;
  }
  return (await res.json()) as LunchTodayPayload;
}

function SuggestionRow({
  suggestion,
  isMyPick,
  voteRadioGroup,
  onVote,
  votingEnabled,
}: {
  suggestion: MenuSuggestion;
  isMyPick: boolean;
  voteRadioGroup: string;
  onVote: () => void;
  votingEnabled: boolean;
}) {
  const rowBody = (
    <>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">
          {suggestion.label}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          제안: {suggestion.suggestedByDisplayName}
        </p>
        {isMyPick ? (
          <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            내 투표
          </p>
        ) : null}
      </div>
      <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-sm tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
        {suggestion.voteCount}표
      </span>
    </>
  );

  if (votingEnabled) {
    return (
      <li>
        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 transition hover:border-zinc-300 hover:bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/70">
          <input
            type="radio"
            name={voteRadioGroup}
            checked={isMyPick}
            onChange={onVote}
            className="mt-1 size-4 shrink-0 border-zinc-300 text-zinc-900 focus:ring-2 focus:ring-zinc-400/40 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            aria-label={`${suggestion.label}에 투표`}
          />
          {rowBody}
        </label>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      {rowBody}
    </li>
  );
}

function persistMockTodayPayload(teamId: string, date: string, p: LunchTodayPayload) {
  if (typeof window === "undefined") return;
  const key = mockTodaySessionStorageKey(teamId, date);
  window.sessionStorage.setItem(
    key,
    JSON.stringify({
      session: p.session,
      suggestions: p.suggestions,
      myVote: p.myVote,
      result: p.result,
    }),
  );
}

export function LunchTodayScreen({
  data: initialData,
  apiMode = "mock",
}: {
  data: LunchTodayPayload;
  apiMode?: "mock" | "live";
}) {
  const [payload, setPayload] = useState(initialData);
  const [suggestDraft, setSuggestDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const { team, session, suggestions, myVote, result } = payload;

  useEffect(() => {
    if (apiMode === "live") return;
    if (initialData.session !== null) return;
    const today = todayDateLocal();
    const key = mockTodaySessionStorageKey(initialData.team.id, today);
    const raw =
      typeof window !== "undefined" ? window.sessionStorage.getItem(key) : null;
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<LunchTodayPayload>;
      if (
        parsed.session?.teamId === initialData.team.id &&
        parsed.session?.date === today
      ) {
        setPayload((prev) => ({
          ...prev,
          session: parsed.session!,
          suggestions: parsed.suggestions ?? [],
          myVote: parsed.myVote ?? null,
          result: parsed.result ?? null,
        }));
      }
    } catch {
      window.sessionStorage.removeItem(key);
    }
  }, [apiMode, initialData.session, initialData.team.id]);

  const handleOpenSession = useCallback(async () => {
    if (apiMode === "live") {
      setBusy(true);
      try {
        const res = await fetch(`/api/teams/${team.id}/lunch/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          window.alert(await readApiError(res));
          return;
        }
        const next = await fetchTodayPayload(team.id);
        if (next) setPayload(next);
      } finally {
        setBusy(false);
      }
      return;
    }

    const today = todayDateLocal();
    const key = mockTodaySessionStorageKey(team.id, today);

    if (session !== null) {
      window.alert("이미 오늘 세션이 열려 있어요.");
      return;
    }

    if (typeof window !== "undefined" && window.sessionStorage.getItem(key)) {
      window.alert("이 팀은 오늘 이미 세션이 열려 있어요. (동일 팀·날짜 중복 불가)");
      return;
    }

    setPayload((prev) => {
      if (prev.session !== null) return prev;
      if (typeof window !== "undefined" && window.sessionStorage.getItem(key)) {
        return prev;
      }
      const newSession = createMockOpenLunchSession(
        crypto.randomUUID(),
        prev.team.id,
        today,
      );
      const next: LunchTodayPayload = {
        ...prev,
        session: newSession,
        suggestions: [],
        myVote: null,
        result: null,
      };
      persistMockTodayPayload(prev.team.id, today, next);
      return next;
    });
  }, [apiMode, session, team.id]);

  const handleAddSuggestion = useCallback(async () => {
    if (session === null || session.status !== "open") return;

    const trimmed = trimMenuLabel(suggestDraft);
    const validationError = validateMenuLabelTrimmed(trimmed);
    if (validationError) {
      window.alert(validationError);
      return;
    }

    if (apiMode === "live") {
      setBusy(true);
      try {
        const res = await fetch(
          `/api/lunch/sessions/${session.id}/suggestions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label: suggestDraft }),
          },
        );
        if (!res.ok) {
          window.alert(await readApiError(res));
          return;
        }
        const next = await fetchTodayPayload(team.id);
        if (next) {
          setPayload(next);
          setSuggestDraft("");
        }
      } finally {
        setBusy(false);
      }
      return;
    }

    const key = menuLabelDedupKey(trimmed);
    const duplicate = suggestions.some(
      (s) => menuLabelDedupKey(s.label) === key,
    );
    if (duplicate) {
      window.alert(
        "이미 같은 이름의 후보가 있어요. 같은 메뉴는 한 줄로 합쳐집니다.",
      );
      return;
    }

    const newSuggestion: MenuSuggestion = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      label: trimmed,
      suggestedByUserId: MOCK_CURRENT_USER.id,
      suggestedByDisplayName: MOCK_CURRENT_USER.displayName,
      voteCount: 0,
      createdAt: new Date().toISOString(),
    };

    setPayload((prev) => {
      if (prev.session === null || prev.session.status !== "open") return prev;
      const next: LunchTodayPayload = {
        ...prev,
        suggestions: [...prev.suggestions, newSuggestion],
      };
      persistMockTodayPayload(prev.team.id, prev.session.date, next);
      return next;
    });
    setSuggestDraft("");
  }, [apiMode, session, suggestDraft, suggestions, team.id]);

  const handleSelectVote = useCallback(
    async (suggestionId: string) => {
      if (session === null || session.status !== "open") return;

      if (apiMode === "live") {
        if (myVote?.suggestionId === suggestionId) return;
        setBusy(true);
        try {
          const res = await fetch(`/api/lunch/sessions/${session.id}/my-vote`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ suggestionId }),
          });
          if (!res.ok) {
            window.alert(await readApiError(res));
            return;
          }
          const next = await fetchTodayPayload(team.id);
          if (next) setPayload(next);
        } finally {
          setBusy(false);
        }
        return;
      }

      setPayload((prev) => {
        if (prev.session === null || prev.session.status !== "open") return prev;
        const prevVoteId = prev.myVote?.suggestionId;
        if (prevVoteId === suggestionId) return prev;

        const nextSuggestions = prev.suggestions.map((s) => {
          let nextCount = s.voteCount;
          if (s.id === prevVoteId) nextCount = Math.max(0, nextCount - 1);
          if (s.id === suggestionId) nextCount = nextCount + 1;
          return { ...s, voteCount: nextCount };
        });

        const next: LunchTodayPayload = {
          ...prev,
          suggestions: nextSuggestions,
          myVote: { suggestionId },
        };
        persistMockTodayPayload(prev.team.id, prev.session.date, next);
        return next;
      });
    },
    [apiMode, myVote?.suggestionId, session, team.id],
  );

  const handleCloseSession = useCallback(async () => {
    if (session === null || session.status !== "open") return;

    const ok = window.confirm(
      "마감하면 더 이상 제안하거나 투표할 수 없어요. 계속할까요?",
    );
    if (!ok) return;

    if (apiMode === "live") {
      setBusy(true);
      try {
        const res = await fetch(`/api/lunch/sessions/${session.id}/close`, {
          method: "POST",
        });
        if (!res.ok) {
          window.alert(await readApiError(res));
          return;
        }
        const next = await fetchTodayPayload(team.id);
        if (next) setPayload(next);
      } finally {
        setBusy(false);
      }
      return;
    }

    setPayload((prev) => {
      const openSession = prev.session;
      if (openSession === null || openSession.status !== "open") return prev;

      const nextResult = computeCloseResult(openSession.id, prev.suggestions);
      const closedSession = { ...openSession, status: "closed" as const };

      const next: LunchTodayPayload = {
        ...prev,
        session: closedSession,
        result: nextResult,
      };
      persistMockTodayPayload(prev.team.id, openSession.date, next);

      const historyItem: LunchHistoryItem = {
        sessionId: openSession.id,
        date: openSession.date,
        winningLabels: nextResult.winningLabels,
        isTie: nextResult.isTie,
        closedAt: nextResult.closedAt,
        candidates: [...prev.suggestions]
          .map((s) => ({ label: s.label, voteCount: s.voteCount }))
          .sort((a, b) => b.voteCount - a.voteCount),
      };
      const existing = readMockHistoryItemsFromStorage(prev.team.id).filter(
        (h) => h.sessionId !== openSession.id,
      );
      writeMockHistoryItemsToStorage(prev.team.id, [
        historyItem,
        ...existing,
      ]);

      return next;
    });
  }, [apiMode, session, team.id]);

  const voteRadioGroup =
    session !== null ? `lunch-vote-${session.id}` : "lunch-vote";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          팀
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {team.name}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          오늘 점심 메뉴를 함께 정해요.
        </p>
      </div>

      {session === null ? (
        <section
          className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-6 dark:border-zinc-700 dark:bg-zinc-900/30"
          aria-labelledby="no-session-heading"
        >
          <h2
            id="no-session-heading"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
          >
            오늘 세션이 아직 없어요
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            팀원이 메뉴를 제안하고 투표하려면 먼저 오늘의 점심 세션을 열어야 해요.
            세션을 열면 후보 목록과 마감 시각을 정할 수 있어요.
          </p>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              새로운 점심 투표
            </span>
            는 날짜가 바뀐 뒤(보통 내일) 이 화면에서 다시 「오늘 세션 열기」를 눌러
            시작할 수 있어요. 하루에 같은 팀·같은 날 세션은 한 번만 열 수 있어요.
          </p>
          <p className="mt-2 text-sm">
            <Link
              href={`/history?teamId=${encodeURIComponent(team.id)}`}
              className="font-medium text-zinc-900 underline decoration-zinc-400 underline-offset-2 hover:text-zinc-700 dark:text-zinc-100 dark:decoration-zinc-600"
            >
              지난 확정 이력·그날 후보 보기
            </Link>
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={handleOpenSession}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              오늘 세션 열기
            </button>
          </div>
        </section>
      ) : null}

      {session !== null && session.status === "closed" && result ? (
        <section
          className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50/90 p-6 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/40"
          aria-labelledby="result-heading"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
            오늘의 메뉴
          </p>
          <h2
            id="result-heading"
            className="mt-2 text-xl font-semibold text-emerald-950 dark:text-emerald-50"
          >
            {result.winningLabels.length > 0
              ? result.winningLabels.join(", ")
              : "미정"}
          </h2>
          {result.note ? (
            <p className="mt-2 text-sm text-emerald-900/85 dark:text-emerald-200/90">
              {result.note}
            </p>
          ) : null}
          {result.isTie && result.winningLabels.length > 1 ? (
            <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-200/90">
              동점으로 공동 1위예요.
            </p>
          ) : null}
          <p className="mt-3 text-xs text-emerald-800/70 dark:text-emerald-400/80">
            마감: {formatClosesAt(result.closedAt)}
          </p>
        </section>
      ) : null}

      {session !== null && session.status === "closed" ? (
        <section
          className="mb-6 rounded-xl border border-sky-200 bg-sky-50/90 p-4 dark:border-sky-900/50 dark:bg-sky-950/35"
          aria-labelledby="next-vote-heading"
        >
          <h2
            id="next-vote-heading"
            className="text-sm font-semibold text-sky-950 dark:text-sky-100"
          >
            다음 점심 투표는 어떻게 열어요?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-sky-900/90 dark:text-sky-200/95">
            오늘 세션은 이미 마감됐어요.{" "}
            <strong className="font-semibold">날짜가 바뀐 뒤</strong>(보통 내일)
            이 페이지로 돌아와 「오늘 세션 열기」를 누르면 새로운 투표를 시작할 수
            있어요.
          </p>
          <p className="mt-3 text-sm">
            <Link
              href={`/history?teamId=${encodeURIComponent(team.id)}`}
              className="font-medium text-sky-950 underline decoration-sky-400 underline-offset-2 dark:text-sky-100 dark:decoration-sky-700"
            >
              이력에서 그날 후보·득표 보기
            </Link>
          </p>
        </section>
      ) : null}

      {session !== null ? (
        <section aria-labelledby="session-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                id="session-heading"
                className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
              >
                후보 목록
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                날짜 {session.date}
                {session.status === "open" ? " · 투표 진행 중" : " · 마감됨"}
              </p>
            </div>
            {session.status === "open" ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  마감 예정 {formatClosesAt(session.closesAt)}
                </p>
                <button
                  type="button"
                  onClick={handleCloseSession}
                  disabled={busy}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-amber-800/40 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 shadow-sm transition hover:bg-amber-50 disabled:opacity-60 dark:border-amber-500/40 dark:bg-zinc-900 dark:text-amber-200 dark:hover:bg-zinc-800"
                >
                  마감
                </button>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                마감 시각 {formatClosesAt(session.closesAt)}
              </p>
            )}
          </div>

          {session.status === "open" ? (
            <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
              <label
                htmlFor="menu-suggest-input"
                className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                메뉴 제안
              </label>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                같은 이름(띄어쓰기만 다른 경우 포함)은 한 후보로 합쳐져요.
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  id="menu-suggest-input"
                  type="text"
                  value={suggestDraft}
                  onChange={(e) => setSuggestDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSuggestion();
                    }
                  }}
                  placeholder="예: 마라탕"
                  maxLength={80}
                  disabled={busy}
                  className="min-h-10 w-full flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400/30 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500"
                />
                <button
                  type="button"
                  onClick={handleAddSuggestion}
                  disabled={busy}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  추가
                </button>
              </div>
            </div>
          ) : null}

          {session.status === "open" ? (
            <section
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
              aria-labelledby="vote-region-label"
            >
              <h3
                id="vote-region-label"
                className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
              >
                투표
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                1인 1표 · 마감 전까지 변경 가능
                {suggestions.length > 0
                  ? " · 아래 후보 중 하나를 선택하세요"
                  : " · 후보를 추가하면 여기서 선택할 수 있어요"}
              </p>

              {suggestions.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-600 dark:border-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-400">
                  아직 후보가 없어요. 위쪽 &quot;메뉴 제안&quot;에서 후보를 추가하면 여기서
                  투표할 수 있어요.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {suggestions.map((s) => (
                    <SuggestionRow
                      key={s.id}
                      suggestion={s}
                      isMyPick={myVote?.suggestionId === s.id}
                      voteRadioGroup={voteRadioGroup}
                      votingEnabled={session.status === "open" && !busy}
                      onVote={() => handleSelectVote(s.id)}
                    />
                  ))}
                </ul>
              )}

              {suggestions.length > 0 ? (
                <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                  {myVote
                    ? "다른 후보를 선택하면 투표가 바뀌어요."
                    : "후보를 한 가지 선택하면 투표가 반영돼요."}
                </p>
              ) : null}
            </section>
          ) : suggestions.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
              아직 제안된 메뉴가 없어요.
            </p>
          ) : (
            <ul className="space-y-2">
              {suggestions.map((s) => (
                <SuggestionRow
                  key={s.id}
                  suggestion={s}
                  isMyPick={myVote?.suggestionId === s.id}
                  voteRadioGroup={voteRadioGroup}
                  votingEnabled={false}
                  onVote={() => handleSelectVote(s.id)}
                />
              ))}
            </ul>
          )}

          {session.status === "closed" ? (
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              이미 마감된 세션이라 새 제안이나 투표는 할 수 없습니다.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
