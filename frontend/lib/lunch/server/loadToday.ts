import type { SupabaseClient } from "@supabase/supabase-js";

import type { ApiErrorCode } from "@/lib/api/errors";
import type {
  LunchSession,
  LunchTodayPayload,
  MenuSuggestion,
  MyVote,
  SessionResult,
  Team,
} from "@/lib/lunch/types";

import { seoulDateString } from "./seoulDate";

export { defaultClosesAtUtcIsoForDate, seoulDateString } from "./seoulDate";

export type LoadTodayFailure = {
  ok: false;
  code: ApiErrorCode;
  message: string;
};

export type LoadTodaySuccess = { ok: true; data: LunchTodayPayload };

export type LoadTodayResult = LoadTodaySuccess | LoadTodayFailure;

type SessionRow = {
  id: string;
  team_id: string;
  session_date: string;
  status: "open" | "closed";
  closes_at: string;
};

function mapSession(row: SessionRow): LunchSession {
  return {
    id: row.id,
    teamId: row.team_id,
    date: row.session_date,
    status: row.status,
    closesAt: row.closes_at,
  };
}

function mapResult(row: {
  session_id: string;
  winning_suggestion_ids: string[];
  winning_labels: string[];
  closed_at: string;
  is_tie: boolean;
  note: string | null;
}): SessionResult {
  return {
    sessionId: row.session_id,
    winningSuggestionIds: row.winning_suggestion_ids,
    winningLabels: row.winning_labels,
    closedAt: row.closed_at,
    isTie: row.is_tie,
    ...(row.note ? { note: row.note } : {}),
  };
}

/**
 * GET …/teams/:teamId/lunch/today — api-spec §3.1
 */
export async function loadLunchTodayPayload(
  supabase: SupabaseClient,
  teamId: string,
  userId: string,
): Promise<LoadTodayResult> {
  const { data: teamRow, error: teamErr } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", teamId)
    .maybeSingle();

  if (teamErr || !teamRow) {
    return { ok: false, code: "NOT_FOUND", message: "팀을 찾을 수 없습니다." };
  }

  const team: Team = { id: teamRow.id, name: teamRow.name };

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

  const today = seoulDateString();

  const sessionSelect =
    "id, team_id, session_date, status, closes_at, created_at";

  const { data: openRow } = await supabase
    .from("lunch_sessions")
    .select(sessionSelect)
    .eq("team_id", teamId)
    .eq("session_date", today)
    .eq("status", "open")
    .maybeSingle();

  let sessionRow = openRow;

  if (!sessionRow) {
    const { data: closedRow } = await supabase
      .from("lunch_sessions")
      .select(sessionSelect)
      .eq("team_id", teamId)
      .eq("session_date", today)
      .eq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    sessionRow = closedRow;
  }

  if (!sessionRow) {
    return {
      ok: true,
      data: {
        team,
        session: null,
        suggestions: [],
        myVote: null,
        result: null,
      },
    };
  }

  const session = mapSession(sessionRow as SessionRow);

  const { data: suggestionRows, error: sugErr } = await supabase
    .from("menu_suggestions")
    .select("id, session_id, label, suggested_by_user_id, created_at")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  if (sugErr) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "후보 목록을 불러오지 못했습니다.",
    };
  }

  const suggesterIds = [
    ...new Set((suggestionRows ?? []).map((r) => r.suggested_by_user_id)),
  ];

  let profileRows: { id: string; display_name: string | null }[] | null = null;
  if (suggesterIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", suggesterIds);
    profileRows = data;
  }

  const nameByUser = new Map<string, string>();
  for (const p of profileRows ?? []) {
    nameByUser.set(p.id, p.display_name?.trim() || "팀원");
  }

  const { data: voteRows } = await supabase
    .from("votes")
    .select("suggestion_id, user_id")
    .eq("session_id", session.id);

  const voteCountBySuggestion = new Map<string, number>();
  let mySuggestionId: string | null = null;

  for (const v of voteRows ?? []) {
    voteCountBySuggestion.set(
      v.suggestion_id,
      (voteCountBySuggestion.get(v.suggestion_id) ?? 0) + 1,
    );
    if (v.user_id === userId) {
      mySuggestionId = v.suggestion_id;
    }
  }

  const suggestions: MenuSuggestion[] = (suggestionRows ?? []).map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    label: r.label,
    suggestedByUserId: r.suggested_by_user_id,
    suggestedByDisplayName:
      nameByUser.get(r.suggested_by_user_id) ?? "팀원",
    voteCount: voteCountBySuggestion.get(r.id) ?? 0,
    createdAt: r.created_at,
  }));

  const myVote: MyVote | null = mySuggestionId
    ? { suggestionId: mySuggestionId }
    : null;

  let result: SessionResult | null = null;
  if (session.status === "closed") {
    const { data: resRow } = await supabase
      .from("session_results")
      .select(
        "session_id, winning_suggestion_ids, winning_labels, closed_at, is_tie, note",
      )
      .eq("session_id", session.id)
      .maybeSingle();

    if (resRow) {
      result = mapResult(resRow);
    }
  }

  return {
    ok: true,
    data: {
      team,
      session,
      suggestions,
      myVote,
      result,
    },
  };
}
