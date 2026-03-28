import { NextResponse } from "next/server";

import { jsonError, type ApiErrorCode } from "@/lib/api/errors";
import type { SessionResult } from "@/lib/lunch/types";
import { createClient } from "@/lib/supabase/server";

type ResultRow = {
  session_id: string;
  winning_suggestion_ids: string[];
  winning_labels: string[];
  closed_at: string;
  is_tie: boolean;
  note: string | null;
};

function mapResult(row: ResultRow): SessionResult {
  return {
    sessionId: row.session_id,
    winningSuggestionIds: row.winning_suggestion_ids,
    winningLabels: row.winning_labels,
    closedAt: row.closed_at,
    isTie: row.is_tie,
    ...(row.note ? { note: row.note } : {}),
  };
}

function mapRpcError(message: string | undefined): {
  code: ApiErrorCode;
  message: string;
} | null {
  if (!message) return null;
  const m = message.toUpperCase();
  if (m.includes("NOT_FOUND")) {
    return { code: "NOT_FOUND", message: "세션을 찾을 수 없습니다." };
  }
  if (m.includes("ALREADY_CLOSED")) {
    return {
      code: "ALREADY_CLOSED",
      message: "이미 마감된 세션입니다.",
    };
  }
  if (m.includes("FORBIDDEN")) {
    return { code: "FORBIDDEN", message: "이 팀에 속하지 않았습니다." };
  }
  return null;
}

/**
 * POST /api/lunch/sessions/{sessionId}/close — api-spec §3.5 (RPC `close_lunch_session`)
 */
export async function POST(
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

  const { error: rpcErr } = await supabase.rpc("close_lunch_session", {
    p_session_id: sessionId,
  });

  if (rpcErr) {
    const mapped = mapRpcError(rpcErr.message);
    if (mapped) {
      return jsonError(mapped.code, mapped.message);
    }
    return jsonError(
      "VALIDATION_ERROR",
      rpcErr.message || "마감 처리에 실패했습니다.",
    );
  }

  const { data: sessionRow } = await supabase
    .from("lunch_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .maybeSingle();

  if (!sessionRow) {
    return jsonError("NOT_FOUND", "세션을 찾을 수 없습니다.");
  }

  const { data: resRow } = await supabase
    .from("session_results")
    .select(
      "session_id, winning_suggestion_ids, winning_labels, closed_at, is_tie, note",
    )
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!resRow) {
    return jsonError("NOT_FOUND", "마감 결과를 찾을 수 없습니다.");
  }

  const result = mapResult(resRow as ResultRow);

  return NextResponse.json({
    session: {
      id: sessionRow.id,
      status: sessionRow.status as "open" | "closed",
    },
    result,
  });
}
