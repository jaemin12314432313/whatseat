import { NextResponse } from "next/server";

import { LUNCH_TEAM_COOKIE } from "@/lib/lunch/server/resolveTeamId";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

type TeamRow = { id: string; name: string };

/**
 * GET /api/me/teams — 소속 팀 목록 + 쿠키에 맞는 selectedTeamId(멤버십 검증)
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ teams: [] as TeamRow[], selectedTeamId: null });
  }

  const { data: rows, error } = await supabase
    .from("team_members")
    .select("teams ( id, name )")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { teams: [] as TeamRow[], selectedTeamId: null, error: error.message },
      { status: 500 },
    );
  }

  const teams: TeamRow[] = [];
  for (const r of rows ?? []) {
    const raw = r.teams as unknown;
    const t = Array.isArray(raw) ? raw[0] : raw;
    if (
      t &&
      typeof t === "object" &&
      "id" in t &&
      typeof (t as { id: unknown }).id === "string"
    ) {
      const row = t as { id: string; name: string | null };
      teams.push({ id: row.id, name: row.name ?? "팀" });
    }
  }

  teams.sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const cookieStore = await cookies();
  const cookieTeam = cookieStore.get(LUNCH_TEAM_COOKIE)?.value?.trim() ?? null;
  const ids = new Set(teams.map((t) => t.id));

  let selectedTeamId: string | null = null;
  let syncedCookie = false;
  if (cookieTeam && ids.has(cookieTeam)) {
    selectedTeamId = cookieTeam;
  } else if (teams.length > 0) {
    selectedTeamId = teams[0].id;
    cookieStore.set(LUNCH_TEAM_COOKIE, selectedTeamId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
      sameSite: "lax",
      httpOnly: true,
    });
    syncedCookie = true;
  }

  return NextResponse.json({ teams, selectedTeamId, syncedCookie });
}
