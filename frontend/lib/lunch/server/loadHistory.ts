import type { SupabaseClient } from "@supabase/supabase-js";

import type { ApiErrorCode } from "@/lib/api/errors";
import type {
  HistoryCandidate,
  LunchHistoryItem,
} from "@/lib/lunch/types";

export type LoadHistoryFailure = {
  ok: false;
  code: ApiErrorCode;
  message: string;
};

export type LoadHistorySuccess = { ok: true; items: LunchHistoryItem[] };

export type LoadHistoryResult = LoadHistorySuccess | LoadHistoryFailure;

type SessionResultRow = {
  winning_labels: string[];
  is_tie: boolean;
  closed_at: string;
};

type SessionWithResult = {
  id: string;
  session_date: string;
  session_results: SessionResultRow | SessionResultRow[] | null;
};

function pickSessionResult(
  raw: SessionWithResult["session_results"],
): SessionResultRow | null {
  if (raw == null) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

async function enrichItemsWithCandidates(
  supabase: SupabaseClient,
  items: LunchHistoryItem[],
): Promise<LunchHistoryItem[]> {
  if (items.length === 0) return items;
  const sessionIds = items.map((i) => i.sessionId);

  const { data: sugRows } = await supabase
    .from("menu_suggestions")
    .select("id, session_id, label, created_at")
    .in("session_id", sessionIds);

  const { data: voteRows } = await supabase
    .from("votes")
    .select("suggestion_id, session_id")
    .in("session_id", sessionIds);

  const voteCountBySuggestion = new Map<string, number>();
  for (const v of voteRows ?? []) {
    voteCountBySuggestion.set(
      v.suggestion_id,
      (voteCountBySuggestion.get(v.suggestion_id) ?? 0) + 1,
    );
  }

  type SugRow = {
    id: string;
    session_id: string;
    label: string;
    created_at: string;
  };

  const bySession = new Map<string, SugRow[]>();
  for (const raw of sugRows ?? []) {
    const s = raw as SugRow;
    const arr = bySession.get(s.session_id) ?? [];
    arr.push(s);
    bySession.set(s.session_id, arr);
  }

  return items.map((item) => {
    const rows = bySession.get(item.sessionId) ?? [];
    const candidates: HistoryCandidate[] = rows
      .map((r) => ({
        label: r.label,
        voteCount: voteCountBySuggestion.get(r.id) ?? 0,
        createdAt: r.created_at,
      }))
      .sort((a, b) => {
        if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      })
      .map(({ label, voteCount }) => ({ label, voteCount }));
    return { ...item, candidates };
  });
}

export async function loadLunchHistoryItems(
  supabase: SupabaseClient,
  teamId: string,
  userId: string,
  limit = 30,
): Promise<LoadHistoryResult> {
  const { data: teamRow } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .maybeSingle();

  if (!teamRow) {
    return { ok: false, code: "NOT_FOUND", message: "팀을 찾을 수 없습니다." };
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "이 팀에 속하지 않았습니다.",
    };
  }

  const { data: rows, error } = await supabase
    .from("lunch_sessions")
    .select(
      `
      id,
      session_date,
      session_results (
        winning_labels,
        is_tie,
        closed_at
      )
    `,
    )
    .eq("team_id", teamId)
    .eq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: error.message || "이력을 불러오지 못했습니다.",
    };
  }

  const items: LunchHistoryItem[] = (rows as SessionWithResult[] | null)
    ?.map((r) => {
      const sr = pickSessionResult(r.session_results);
      if (!sr) return null;
      return {
        sessionId: r.id,
        date: r.session_date,
        winningLabels: sr.winning_labels,
        isTie: sr.is_tie,
        closedAt: sr.closed_at,
      };
    })
    .filter((x): x is LunchHistoryItem => x !== null) ?? [];

  const withCandidates = await enrichItemsWithCandidates(supabase, items);

  return { ok: true, items: withCandidates };
}
