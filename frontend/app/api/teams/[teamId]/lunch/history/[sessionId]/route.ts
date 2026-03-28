import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * DELETE /api/teams/{teamId}/lunch/history/{sessionId} — 확정된 세션 이력 제거
 * (lunch_sessions 행 삭제 → CASCADE로 후보·투표·session_results 정리)
 */
export async function DELETE(
  _request: Request,
  context: {
    params: Promise<{ teamId: string; sessionId: string }>;
  },
) {
  const { teamId, sessionId } = await context.params;

  if (!UUID_RE.test(teamId) || !UUID_RE.test(sessionId)) {
    return jsonError("VALIDATION_ERROR", "요청 식별자가 올바르지 않습니다.");
  }

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

  const { data: sessionRow, error: sessionErr } = await supabase
    .from("lunch_sessions")
    .select("id, team_id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionErr || !sessionRow) {
    return jsonError("NOT_FOUND", "세션을 찾을 수 없습니다.");
  }

  if (sessionRow.team_id !== teamId) {
    return jsonError("NOT_FOUND", "이 팀의 이력이 아닙니다.");
  }

  if (sessionRow.status !== "closed") {
    return jsonError(
      "VALIDATION_ERROR",
      "마감된 확정 이력만 삭제할 수 있어요.",
    );
  }

  const { error: delErr } = await supabase
    .from("lunch_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("team_id", teamId);

  if (delErr) {
    return jsonError(
      "VALIDATION_ERROR",
      delErr.message || "이력을 삭제하지 못했습니다.",
    );
  }

  return new NextResponse(null, { status: 204 });
}
