import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/errors";
import type { LunchSessionStatus, MyVoteHistoryItem } from "@/lib/lunch/types";
import { createClient } from "@/lib/supabase/server";

type TeamEmbed = { name: string | null } | { name: string | null }[] | null;

type SessionEmbed = {
  id: string;
  session_date: string;
  status: string;
  team_id: string;
  teams: TeamEmbed;
} | null;

type SuggestionEmbed = { label: string | null } | null;

type VoteRow = {
  created_at: string;
  lunch_sessions: SessionEmbed;
  menu_suggestions: SuggestionEmbed;
};

function pickSession(raw: SessionEmbed | SessionEmbed[] | null): SessionEmbed {
  if (raw == null) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

function pickSuggestion(
  raw: SuggestionEmbed | SuggestionEmbed[] | null,
): SuggestionEmbed {
  if (raw == null) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

function pickTeamName(raw: TeamEmbed): string {
  if (raw == null) return "팀";
  const t = Array.isArray(raw) ? raw[0] : raw;
  return t?.name?.trim() || "팀";
}

/**
 * GET /api/me/vote-history — 로그인 사용자 본인의 점심 투표 이력
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const { data: rows, error } = await supabase
    .from("votes")
    .select(
      `
      created_at,
      lunch_sessions (
        id,
        session_date,
        status,
        team_id,
        teams ( name )
      ),
      menu_suggestions ( label )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    return jsonError(
      "NOT_FOUND",
      error.message || "투표 이력을 불러오지 못했습니다.",
    );
  }

  const items: MyVoteHistoryItem[] = [];
  for (const r of rows ?? []) {
    const row = r as unknown as VoteRow;
    const ls = pickSession(row.lunch_sessions as SessionEmbed | SessionEmbed[]);
    const ms = pickSuggestion(
      row.menu_suggestions as SuggestionEmbed | SuggestionEmbed[],
    );
    if (!ls?.id) continue;
    const status =
      ls.status === "open" || ls.status === "closed" ? ls.status : "closed";
    items.push({
      votedAt: row.created_at,
      teamId: ls.team_id,
      teamName: pickTeamName(ls.teams),
      sessionId: ls.id,
      sessionDate: ls.session_date,
      sessionStatus: status as LunchSessionStatus,
      menuLabel:
        ms && typeof ms === "object" && "label" in ms && ms.label
          ? ms.label
          : "(메뉴)",
    });
  }

  return NextResponse.json({ items });
}
