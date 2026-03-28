import type {
  LunchHistoryItem,
  LunchHistoryPayload,
  LunchSession,
  LunchTodayPayload,
  Team,
} from "./types";

/** 브라우저 로컬 기준 오늘 날짜 (YYYY-MM-DD) — 세션 `date`와 동일 형식 */
export function todayDateLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 목업: 동일 팀·동일 날짜 세션 스냅샷 저장 키 (중복 열림 시뮬·새로고침 유지) */
export function mockTodaySessionStorageKey(teamId: string, date: string): string {
  return `lunch-mock-today:${teamId}:${date}`;
}

/** 목업: 새로 연 `open` 세션 객체 (id는 호출부에서 부여) */
export function createMockOpenLunchSession(
  id: string,
  teamId: string,
  date: string,
): LunchSession {
  const closesAt = new Date();
  const [y, m, d] = date.split("-").map(Number);
  if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
    closesAt.setFullYear(y, m - 1, d);
  }
  closesAt.setHours(14, 0, 0, 0);
  return {
    id,
    teamId,
    date,
    status: "open",
    closesAt: closesAt.toISOString(),
  };
}

/** 공통 팀 (api-spec 예시 UUID) */
export const MOCK_TEAM: Team = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "디자인1팀",
};

/** 목업: 현재 사용자 (제안자 표시용 — 2단계에서 Auth로 교체) */
export const MOCK_CURRENT_USER = {
  id: "a0b0c0d0-e29b-41d4-a716-446655440099",
  displayName: "나",
} as const;

const SESSION_ID = "660e8400-e29b-41d4-a716-446655440001";
const TEAM_ID = MOCK_TEAM.id;

/** 오늘 세션 없음 — §3.1 “오늘 세션이 아직 없을 때” */
export const mockTodayNoSession: LunchTodayPayload = {
  team: MOCK_TEAM,
  session: null,
  suggestions: [],
  myVote: null,
  result: null,
};

/** 마감 전 — §3.1 응답 예시 */
export const mockTodayOpen: LunchTodayPayload = {
  team: MOCK_TEAM,
  session: {
    id: SESSION_ID,
    teamId: TEAM_ID,
    date: "2025-03-27",
    status: "open",
    closesAt: "2025-03-27T11:30:00.000Z",
  },
  suggestions: [
    {
      id: "770e8400-e29b-41d4-a716-446655440002",
      sessionId: SESSION_ID,
      label: "쌀국수",
      suggestedByUserId: "880e8400-e29b-41d4-a716-446655440003",
      suggestedByDisplayName: "민지",
      voteCount: 4,
      createdAt: "2025-03-27T09:12:00.000Z",
    },
    {
      id: "770e8400-e29b-41d4-a716-446655440004",
      sessionId: SESSION_ID,
      label: "돈까스",
      suggestedByUserId: "880e8400-e29b-41d4-a716-446655440005",
      suggestedByDisplayName: "준호",
      voteCount: 2,
      createdAt: "2025-03-27T09:15:00.000Z",
    },
  ],
  myVote: { suggestionId: "770e8400-e29b-41d4-a716-446655440002" },
  result: null,
};

/** 마감 후 — §3.1 “마감 후” */
export const mockTodayClosed: LunchTodayPayload = {
  team: MOCK_TEAM,
  session: {
    id: SESSION_ID,
    teamId: TEAM_ID,
    date: "2025-03-27",
    status: "closed",
    closesAt: "2025-03-27T11:30:00.000Z",
  },
  suggestions: [
    {
      id: "770e8400-e29b-41d4-a716-446655440002",
      sessionId: SESSION_ID,
      label: "쌀국수",
      suggestedByUserId: "880e8400-e29b-41d4-a716-446655440003",
      suggestedByDisplayName: "민지",
      voteCount: 4,
      createdAt: "2025-03-27T09:12:00.000Z",
    },
  ],
  myVote: { suggestionId: "770e8400-e29b-41d4-a716-446655440002" },
  result: {
    sessionId: SESSION_ID,
    winningSuggestionIds: ["770e8400-e29b-41d4-a716-446655440002"],
    winningLabels: ["쌀국수"],
    closedAt: "2025-03-27T11:30:05.000Z",
    isTie: false,
  },
};

/** 목업에서 오늘 화면 진입 시나리오 선택 (기본: 세션 없음 → 플로우 1) */
export type MockTodayScenario = "noSession" | "open" | "closed";

export const mockTodayByScenario: Record<MockTodayScenario, LunchTodayPayload> =
  {
    noSession: mockTodayNoSession,
    open: mockTodayOpen,
    closed: mockTodayClosed,
  };

export function getMockTodayPayload(
  scenario: MockTodayScenario = "noSession",
): LunchTodayPayload {
  return mockTodayByScenario[scenario];
}

/** §3.6 이력 예시 (과거 확정 건) */
export const mockHistoryItems: LunchHistoryItem[] = [
  {
    sessionId: SESSION_ID,
    date: "2025-03-27",
    winningLabels: ["쌀국수"],
    isTie: false,
    closedAt: "2025-03-27T11:30:05.000Z",
    candidates: [
      { label: "쌀국수", voteCount: 4 },
      { label: "돈까스", voteCount: 2 },
      { label: "마라탕", voteCount: 1 },
    ],
  },
  {
    sessionId: "aa0e8400-e29b-41d4-a716-446655440010",
    date: "2025-03-26",
    winningLabels: ["볶음밥", "짜장면"],
    isTie: true,
    closedAt: "2025-03-26T11:28:00.000Z",
    candidates: [
      { label: "볶음밥", voteCount: 3 },
      { label: "짜장면", voteCount: 3 },
      { label: "짬뽕", voteCount: 1 },
    ],
  },
];

export const mockHistory: LunchHistoryPayload = {
  items: mockHistoryItems,
};

/** 목업: 팀별 이력 추가분(sessionStorage) 키 — 마감 시 push */
export function mockHistorySessionStorageKey(teamId: string): string {
  return `lunch-mock-history:${teamId}`;
}

export function readMockHistoryItemsFromStorage(teamId: string): LunchHistoryItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.sessionStorage.getItem(mockHistorySessionStorageKey(teamId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LunchHistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function writeMockHistoryItemsToStorage(
  teamId: string,
  items: LunchHistoryItem[],
): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    mockHistorySessionStorageKey(teamId),
    JSON.stringify(items),
  );
}

/** 기본 목업 이력 + 스토리지(마감으로 쌓인 항목) 병합, 날짜 내림차순 */
export function mergeMockHistoryItems(
  base: LunchHistoryItem[],
  fromStorage: LunchHistoryItem[],
): LunchHistoryItem[] {
  const bySession = new Map<string, LunchHistoryItem>();
  for (const item of base) {
    bySession.set(item.sessionId, item);
  }
  for (const item of fromStorage) {
    bySession.set(item.sessionId, item);
  }
  return Array.from(bySession.values()).sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    if (d !== 0) return d;
    return b.closedAt.localeCompare(a.closedAt);
  });
}
