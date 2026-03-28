import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/errors";
import type { MenuSuggestion } from "@/lib/lunch/types";
import {
  menuLabelDedupKey,
  trimMenuLabel,
  validateMenuLabelTrimmed,
} from "@/lib/lunch/normalizeLabel";
import { createClient } from "@/lib/supabase/server";

type SessionRow = {
  id: string;
  team_id: string;
  status: "open" | "closed";
};

type SuggestionRow = {
  id: string;
  session_id: string;
  label: string;
  suggested_by_user_id: string;
  created_at: string;
};

function mapSuggestion(
  row: SuggestionRow,
  displayName: string,
  voteCount: number,
): MenuSuggestion {
  return {
    id: row.id,
    sessionId: row.session_id,
    label: row.label,
    suggestedByUserId: row.suggested_by_user_id,
    suggestedByDisplayName: displayName,
    voteCount,
    createdAt: row.created_at,
  };
}

/**
 * POST /api/lunch/sessions/{sessionId}/suggestions — api-spec §3.3
 */
export async function POST(
  request: Request,
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

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const rawLabel = body.label;
  if (typeof rawLabel !== "string") {
    return jsonError("VALIDATION_ERROR", "메뉴 이름(label)을 입력해 주세요.");
  }

  const trimmed = trimMenuLabel(rawLabel);
  const validationMsg = validateMenuLabelTrimmed(trimmed);
  if (validationMsg) {
    return jsonError("VALIDATION_ERROR", validationMsg);
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
    return jsonError(
      "VALIDATION_ERROR",
      "마감된 세션에는 메뉴를 제안할 수 없습니다.",
    );
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

  const { data: existing } = await supabase
    .from("menu_suggestions")
    .select("id, label")
    .eq("session_id", sessionId);

  const newKey = menuLabelDedupKey(trimmed);
  for (const row of existing ?? []) {
    if (menuLabelDedupKey(row.label) === newKey) {
      return jsonError(
        "VALIDATION_ERROR",
        "같은 이름의 후보가 이미 있습니다. 기존 항목에 투표해 주세요.",
      );
    }
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("menu_suggestions")
    .insert({
      session_id: sessionId,
      label: trimmed,
      suggested_by_user_id: user.id,
    })
    .select("id, session_id, label, suggested_by_user_id, created_at")
    .single();

  if (insertErr || !inserted) {
    return jsonError(
      "VALIDATION_ERROR",
      insertErr?.message || "제안을 저장하지 못했습니다.",
    );
  }

  const row = inserted as SuggestionRow;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.display_name?.trim() || "팀원";

  const suggestion = mapSuggestion(row, displayName, 0);

  return NextResponse.json({ suggestion }, { status: 201 });
}
