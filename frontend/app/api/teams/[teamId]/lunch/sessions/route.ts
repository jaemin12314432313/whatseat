import { NextResponse } from "next/server";

import { isUniqueViolation, jsonError } from "@/lib/api/errors";
import type { LunchSession } from "@/lib/lunch/types";
import {
  defaultClosesAtUtcIsoForDate,
  parseOptionalSessionDate,
  seoulDateString,
} from "@/lib/lunch/server/seoulDate";
import { createClient } from "@/lib/supabase/server";

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

function parseClosesAt(raw: unknown, sessionDateYmd: string): string | null {
  if (typeof raw === "string" && raw.trim()) {
    const t = Date.parse(raw.trim());
    if (Number.isNaN(t)) {
      return null;
    }
    return new Date(t).toISOString();
  }
  return defaultClosesAtUtcIsoForDate(sessionDateYmd);
}

/**
 * POST /api/teams/{teamId}/lunch/sessions — api-spec §3.2
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ teamId: string }> },
) {
  const { teamId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const { data: teamRow } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .maybeSingle();

  if (!teamRow) {
    return jsonError("NOT_FOUND", "팀을 찾을 수 없습니다.");
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return jsonError("FORBIDDEN", "이 팀에 속하지 않았습니다.");
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const sessionDate =
    parseOptionalSessionDate(body.date) ?? seoulDateString();

  const closesAt = parseClosesAt(body.closesAt, sessionDate);
  if (!closesAt) {
    return jsonError(
      "VALIDATION_ERROR",
      "마감 시각(closesAt) 형식이 올바르지 않습니다.",
    );
  }

  const { data: existingOpen } = await supabase
    .from("lunch_sessions")
    .select("id")
    .eq("team_id", teamId)
    .eq("session_date", sessionDate)
    .eq("status", "open")
    .maybeSingle();

  if (existingOpen) {
    return jsonError(
      "VALIDATION_ERROR",
      "이미 열린 세션이 있어요. 마감한 뒤 같은 날에도 새 점심 투표를 열 수 있어요.",
    );
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("lunch_sessions")
    .insert({
      team_id: teamId,
      session_date: sessionDate,
      status: "open",
      closes_at: closesAt,
    })
    .select("id, team_id, session_date, status, closes_at")
    .single();

  if (insertErr) {
    if (isUniqueViolation(insertErr)) {
      return jsonError(
        "VALIDATION_ERROR",
        "이미 열린 세션이 있어요. 마감한 뒤 다시 시도해 주세요.",
      );
    }
    return jsonError(
      "VALIDATION_ERROR",
      insertErr.message || "세션을 만들 수 없습니다.",
    );
  }

  if (!inserted) {
    return jsonError("VALIDATION_ERROR", "세션을 만들 수 없습니다.");
  }

  return NextResponse.json(
    { session: mapSession(inserted as SessionRow) },
    { status: 201 },
  );
}
