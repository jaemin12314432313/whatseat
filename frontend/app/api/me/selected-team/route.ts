import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/errors";
import { LUNCH_TEAM_COOKIE } from "@/lib/lunch/server/resolveTeamId";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/**
 * POST /api/me/selected-team — 선택 팀 쿠키 설정(멤버만)
 */
export async function POST(request: Request) {
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

  const teamId =
    typeof body.teamId === "string" ? body.teamId.trim() : "";
  if (!teamId) {
    return jsonError("VALIDATION_ERROR", "teamId가 필요합니다.");
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

  const cookieStore = await cookies();
  cookieStore.set(LUNCH_TEAM_COOKIE, teamId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    sameSite: "lax",
    httpOnly: true,
  });

  return NextResponse.json({ ok: true, teamId });
}
