import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/errors";
import { loadLunchTodayPayload } from "@/lib/lunch/server/loadToday";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/teams/{teamId}/lunch/today — api-spec §3.1
 */
export async function GET(
  _request: Request,
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

  const result = await loadLunchTodayPayload(supabase, teamId, user.id);
  if (!result.ok) {
    return jsonError(result.code, result.message);
  }

  return NextResponse.json(result.data);
}
