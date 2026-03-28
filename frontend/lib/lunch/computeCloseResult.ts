import type { MenuSuggestion, SessionResult } from "./types";

/**
 * 마감 시 집계 — spec §5:
 * - 후보 0개: 미정 (빈 라벨 + 안내 note)
 * - 득표 0(전부 0표): 미정 단일 라벨 + note
 * - 그 외: 최다 득표, 동점이면 공동 1위(isTie)로 모두 포함
 */
export function computeCloseResult(
  sessionId: string,
  suggestions: MenuSuggestion[],
): SessionResult {
  const closedAt = new Date().toISOString();

  if (suggestions.length === 0) {
    return {
      sessionId,
      winningSuggestionIds: [],
      winningLabels: [],
      closedAt,
      isTie: false,
      note: "후보가 없어 오늘 메뉴는 미정이에요.",
    };
  }

  const maxVotes = Math.max(...suggestions.map((s) => s.voteCount));

  if (maxVotes === 0) {
    return {
      sessionId,
      winningSuggestionIds: [],
      winningLabels: ["미정"],
      closedAt,
      isTie: false,
      note: "득표가 없어 오늘 메뉴는 미정이에요.",
    };
  }

  const winners = suggestions.filter((s) => s.voteCount === maxVotes);
  winners.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return {
    sessionId,
    winningSuggestionIds: winners.map((w) => w.id),
    winningLabels: winners.map((w) => w.label),
    closedAt,
    isTie: winners.length > 1,
  };
}
