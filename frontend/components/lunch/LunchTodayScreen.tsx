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
        <p className="font-semibold text-slate-900 dark:text-slate-50">
          {suggestion.label}
        </p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          제안: {suggestion.suggestedByDisplayName}
        </p>
        {isMyPick ? (
          <p className="mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
            내 투표
          </p>
        ) : null}
      </div>
      <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold tabular-nums text-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
        {suggestion.voteCount}표
      </span>
    </>
  );

  if (votingEnabled) {
    return (
      <li>
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-sm transition hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-800">
          <input
            type="radio"
            name={voteRadioGroup}
            checked={isMyPick}
            onChange={onVote}
            onClick={(e) => {
              /* 이미 고른 라디오는 onChange가 안 나옴 → 클릭에서 투표 취소 */
              if (!votingEnabled || !isMyPick) return;
              e.preventDefault();
              e.stopPropagation();
              onVote();
            }}
            className="mt-1 size-4 shrink-0 border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-blue-500"
            aria-label={`${suggestion.label}에 투표`}
          />
          {rowBody}
        </label>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
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

    if (session !== null && session.status === "open") {
      window.alert("이미 진행 중인 투표가 있어요. 마감한 뒤 새 세션을 열 수 있어요.");
      return;
    }

    setPayload((prev) => {
      if (prev.session !== null && prev.session.status === "open") {
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
        setBusy(true);
        try {
          const clearing = myVote?.suggestionId === suggestionId;
          const res = await fetch(
            `/api/lunch/sessions/${session.id}/my-vote`,
            clearing
              ? { method: "DELETE" }
              : {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ suggestionId }),
                },
          );
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
        if (prevVoteId === suggestionId) {
          const nextSuggestions = prev.suggestions.map((s) =>
            s.id === suggestionId
              ? { ...s, voteCount: Math.max(0, s.voteCount - 1) }
              : s,
          );
          const next: LunchTodayPayload = {
            ...prev,
            suggestions: nextSuggestions,
            myVote: null,
          };
          persistMockTodayPayload(prev.team.id, prev.session.date, next);
          return next;
        }

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
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          팀
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {team.name}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          오늘 점심 메뉴를 함께 정해요.
        </p>
      </div>

      {session === null ? (
        <section
          className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          aria-labelledby="no-session-heading"
        >
          <h2
            id="no-session-heading"
            className="text-lg font-semibold text-slate-900 dark:text-slate-50"
          >
            오늘 세션이 아직 없어요
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            팀원이 메뉴를 제안하고 투표하려면 먼저 오늘의 점심 세션을 열어야 해요.
            세션을 열면 후보 목록과 마감 시각을 정할 수 있어요.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              마감한 뒤에도 같은 날
            </span>{" "}
            아래에서 새 라운드를 계속 열 수 있어요.{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              동시에 진행 중인 투표는 하나
            </span>
            (열린 세션 하나)만 두는 방식이에요.
          </p>
          <p className="mt-4 text-sm">
            <Link
              href={`/history?teamId=${encodeURIComponent(team.id)}`}
              className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:decoration-blue-700 dark:hover:text-blue-300"
            >
              지난 확정 이력·그날 후보 보기
            </Link>
          </p>
          <div className="mt-8">
            <button
              type="button"
              onClick={handleOpenSession}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              오늘 세션 열기
            </button>
          </div>
        </section>
      ) : null}

      {session !== null && session.status === "closed" && result ? (
        <section
          className="mb-8 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/80 p-8 shadow-sm dark:border-emerald-900/40 dark:from-slate-900 dark:to-emerald-950/30"
          aria-labelledby="result-heading"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            오늘의 메뉴
          </p>
          <h2
            id="result-heading"
            className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50"
          >
            {result.winningLabels.length > 0
              ? result.winningLabels.join(", ")
              : "미정"}
          </h2>
          {result.note ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {result.note}
            </p>
          ) : null}
          {result.isTie && result.winningLabels.length > 1 ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              동점으로 공동 1위예요.
            </p>
          ) : null}
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            마감: {formatClosesAt(result.closedAt)}
          </p>
        </section>
      ) : null}

      {session !== null && session.status === "closed" ? (
        <section
          className="mb-8 rounded-2xl border border-blue-100 bg-blue-50/60 p-6 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/25"
          aria-labelledby="next-vote-heading"
        >
          <h2
            id="next-vote-heading"
            className="text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            다음 점심 투표는 어떻게 열어요?
          </h2>
          <>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              이 라운드는 마감됐어요. 같은 날에도 새 투표를 이어서 열려면 아래 버튼을
              눌러 주세요.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={handleOpenSession}
                disabled={busy}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                새 점심 세션 열기
              </button>
            </div>
          </>
          <p className="mt-4 text-sm">
            <Link
              href={`/history?teamId=${encodeURIComponent(team.id)}`}
              className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:decoration-blue-600 dark:hover:text-blue-300"
            >
              이력에서 그날 후보·득표 보기
            </Link>
          </p>
        </section>
      ) : null}

      {session !== null ? (
        <section aria-labelledby="session-heading">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="session-heading"
                className="text-lg font-semibold text-slate-900 dark:text-slate-50"
              >
                후보 목록
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                날짜 {session.date}
                {session.status === "open" ? " · 투표 진행 중" : " · 마감됨"}
              </p>
            </div>
            {session.status === "open" ? (
              <div className="flex flex-wrap items-center justify-end gap-3">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  마감 예정 {formatClosesAt(session.closesAt)}
                </p>
                <button
                  type="button"
                  onClick={handleCloseSession}
                  disabled={busy}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  마감
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                마감 시각 {formatClosesAt(session.closesAt)}
              </p>
            )}
          </div>

          {session.status === "open" ? (
            <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <label
                htmlFor="menu-suggest-input"
                className="text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                메뉴 제안
              </label>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                같은 이름(띄어쓰기만 다른 경우 포함)은 한 후보로 합쳐져요.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
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
                  className="min-h-10 w-full flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-50 dark:focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={handleAddSuggestion}
                  disabled={busy}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  추가
                </button>
              </div>
            </div>
          ) : null}

          {session.status === "open" ? (
            <section
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              aria-labelledby="vote-region-label"
            >
              <h3
                id="vote-region-label"
                className="text-sm font-semibold text-slate-900 dark:text-slate-50"
              >
                투표
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                1인 1표 · 마감 전까지 변경 가능 · 투표 취소 버튼 또는 고른 줄의 라디오를 다시 누르기
                {suggestions.length > 0
                  ? " · 아래 후보 중 하나를 선택하세요"
                  : " · 후보를 추가하면 여기서 선택할 수 있어요"}
              </p>

              {suggestions.length === 0 ? (
                <p className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                  아직 후보가 없어요. 위쪽 &quot;메뉴 제안&quot;에서 후보를 추가하면 여기서
                  투표할 수 있어요.
                </p>
              ) : (
                <ul className="mt-6 space-y-3">
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

              {myVote ? (
                <div className="mt-6">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleSelectVote(myVote.suggestionId)}
                    className="text-sm font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700 disabled:opacity-50 dark:text-blue-400 dark:decoration-blue-600 dark:hover:text-blue-300"
                  >
                    투표 취소
                  </button>
                </div>
              ) : null}

              {suggestions.length > 0 ? (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                  {myVote
                    ? "다른 후보를 고르면 투표가 바뀌어요. 위의 ‘투표 취소’나, 고른 줄의 라디오를 다시 눌러도 취소할 수 있어요."
                    : "후보를 한 가지 선택하면 투표가 반영돼요."}
                </p>
              ) : null}
            </section>
          ) : suggestions.length === 0 ? (
            <p className="rounded-2xl border border-slate-200/80 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              아직 제안된 메뉴가 없어요.
            </p>
          ) : (
            <ul className="space-y-3">
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
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
              이미 마감된 세션이라 새 제안이나 투표는 할 수 없습니다.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
