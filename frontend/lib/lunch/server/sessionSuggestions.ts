import type { SupabaseClient } from "@supabase/supabase-js";

import type { MenuSuggestion } from "@/lib/lunch/types";

/**
 * Session 후보 목록 + 득표 수 + 제안자 표시명 — api-spec §3.4 응답 등에서 재사용
 */
export async function getMenuSuggestionsForSession(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<MenuSuggestion[] | null> {
  const { data: suggestionRows, error: sugErr } = await supabase
    .from("menu_suggestions")
    .select("id, session_id, label, suggested_by_user_id, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (sugErr) {
    return null;
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
    .select("suggestion_id")
    .eq("session_id", sessionId);

  const voteCountBySuggestion = new Map<string, number>();
  for (const v of voteRows ?? []) {
    voteCountBySuggestion.set(
      v.suggestion_id,
      (voteCountBySuggestion.get(v.suggestion_id) ?? 0) + 1,
    );
  }

  return (suggestionRows ?? []).map((r) => ({
    id: r.id,
    sessionId: r.session_id,
    label: r.label,
    suggestedByUserId: r.suggested_by_user_id,
    suggestedByDisplayName:
      nameByUser.get(r.suggested_by_user_id) ?? "팀원",
    voteCount: voteCountBySuggestion.get(r.id) ?? 0,
    createdAt: r.created_at,
  }));
}
