import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/errors";
import { loadLunchHistoryItems } from "@/lib/lunch/server/loadHistory";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/teams/{teamId}/lunch/history?limit=30 — api-spec §3.6 (+ 후보·득표)
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ teamId: string }> },
) {
  const { teamId } = await context.params;
  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get("limit");
  const limit = Math.min(
    100,
    Math.max(1, limitRaw ? Number.parseInt(limitRaw, 10) || 30 : 30),
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const result = await loadLunchHistoryItems(supabase, teamId, user.id, limit);
  if (!result.ok) {
    return jsonError(result.code, result.message);
  }

  return NextResponse.json({ items: result.items });
}
