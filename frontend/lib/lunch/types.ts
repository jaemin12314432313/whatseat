/**
 * Lunch domain types — aligned with api-spec.md §2 (and §3.1 / §3.6 response shapes).
 */

export type LunchSessionStatus = "open" | "closed";

export interface Team {
  id: string;
  name: string;
}

export interface LunchSession {
  id: string;
  teamId: string;
  date: string;
  status: LunchSessionStatus;
  closesAt: string;
}

export interface MenuSuggestion {
  id: string;
  sessionId: string;
  label: string;
  suggestedByUserId: string;
  suggestedByDisplayName: string;
  voteCount: number;
  createdAt: string;
}

/** 마감 후 확정 결과 (api-spec §2.4, §3.5 optional `note`) */
export interface SessionResult {
  sessionId: string;
  winningSuggestionIds: string[];
  winningLabels: string[];
  closedAt: string;
  isTie: boolean;
  note?: string;
}

/** 1인 1표 — 투표 전이면 화면 페이로드에서는 null (api-spec §2.5) */
export interface MyVote {
  suggestionId: string;
}

/** GET …/lunch/today 등 §3.1 본문 */
export interface LunchTodayPayload {
  team: Team;
  session: LunchSession | null;
  suggestions: MenuSuggestion[];
  myVote: MyVote | null;
  result: SessionResult | null;
}

/** 이력에서 그날 후보·득표 요약 */
export interface HistoryCandidate {
  label: string;
  voteCount: number;
}

/** §3.6 이력 항목 */
export interface LunchHistoryItem {
  sessionId: string;
  date: string;
  winningLabels: string[];
  isTie: boolean;
  closedAt: string;
  /** 마감 시점 후보 목록(득표 내림차순). 없으면 미표시 */
  candidates?: HistoryCandidate[];
}

export interface LunchHistoryPayload {
  items: LunchHistoryItem[];
}

/** GET /api/me/vote-history — 본인 투표 기록 */
export interface MyVoteHistoryItem {
  votedAt: string;
  teamId: string;
  teamName: string;
  sessionId: string;
  sessionDate: string;
  sessionStatus: LunchSessionStatus;
  menuLabel: string;
}
