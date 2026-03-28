import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/errors";
import { getMenuSuggestionsForSession } from "@/lib/lunch/server/sessionSuggestions";
import { createClient } from "@/lib/supabase/server";

type SessionRow = {
  id: string;
  team_id: string;
  status: "open" | "closed";
};

function parseSuggestionId(body: Record<string, unknown>): string | null {
  const raw = body.suggestionId;
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }
  return raw.trim();
}

async function handleUpsertVote(
  request: Request,
  sessionId: string,
): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const suggestionId = parseSuggestionId(body);
  if (!suggestionId) {
    return jsonError("VALIDATION_ERROR", "후보(suggestionId)를 지정해 주세요.");
  }

  const { data: sessionRow, error: sessionErr } = await supabase
    .from("lunch_sessions")
    .select("id, team_id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionErr || !sessionRow) {
    return jsonError("NOT_FOUND", "세션을 찾을 수 없습니다.");
  }

  const session = sessionRow as SessionRow;

  if (session.status !== "open") {
    return jsonError("VOTE_CLOSED", "이미 마감된 세션에는 투표할 수 없습니다.");
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("team_id", session.team_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return jsonError("FORBIDDEN", "이 팀에 속하지 않았습니다.");
  }

  const { data: suggestion } = await supabase
    .from("menu_suggestions")
    .select("id")
    .eq("id", suggestionId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!suggestion) {
    return jsonError("VALIDATION_ERROR", "이 세션의 후보가 아닙니다.");
  }

  const { error: upsertErr } = await supabase.from("votes").upsert(
    {
      session_id: sessionId,
      user_id: user.id,
      suggestion_id: suggestionId,
    },
    { onConflict: "session_id,user_id" },
  );

  if (upsertErr) {
    return jsonError(
      "VALIDATION_ERROR",
      upsertErr.message || "투표를 저장하지 못했습니다.",
    );
  }

  const suggestions = await getMenuSuggestionsForSession(supabase, sessionId);
  if (!suggestions) {
    return jsonError("NOT_FOUND", "후보 목록을 불러오지 못했습니다.");
  }

  return NextResponse.json({
    myVote: { suggestionId },
    suggestions,
  });
}

/**
 * PUT / POST — api-spec §3.4 투표·변경
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  return handleUpsertVote(request, sessionId);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  return handleUpsertVote(request, sessionId);
}

/**
 * DELETE — api-spec §3.4 투표 취소 (선택)
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const { data: sessionRow } = await supabase
    .from("lunch_sessions")
    .select("id, team_id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (!sessionRow) {
    return jsonError("NOT_FOUND", "세션을 찾을 수 없습니다.");
  }

  const session = sessionRow as SessionRow;

  if (session.status !== "open") {
    return jsonError("VOTE_CLOSED", "이미 마감된 세션에서는 투표를 바꿀 수 없습니다.");
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("team_id", session.team_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return jsonError("FORBIDDEN", "이 팀에 속하지 않았습니다.");
  }

  const { error: delErr } = await supabase
    .from("votes")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (delErr) {
    return jsonError(
      "VALIDATION_ERROR",
      delErr.message || "투표를 취소하지 못했습니다.",
    );
  }

  return NextResponse.json({ myVote: null });
}
