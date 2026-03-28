import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/** HttpOnly cookie — selected team for logged-in users */
export const LUNCH_TEAM_COOKIE = "lunch_team_id";

const cookieOptions = {
  path: "/",
  maxAge: 60 * 60 * 24 * 400,
  sameSite: "lax" as const,
  httpOnly: true,
};

/**
 * 쿠키가 비어 있으면 소속 팀 하나를 골라 저장(첫 로그인 직후 화면 깜빡임 완화).
 */
export async function bootstrapLunchTeamCookieIfEmpty(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(LUNCH_TEAM_COOKIE)?.value?.trim();
  if (existing) return;

  const { data } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .limit(1);

  const tid = data?.[0]?.team_id;
  if (!tid) return;

  cookieStore.set(LUNCH_TEAM_COOKIE, tid, cookieOptions);
}

/**
 * ?teamId= 우선, 다음 쿠키, 마지막 env 기본값.
 */
export async function resolveTeamIdFromRequest(
  searchTeamId: string | undefined,
  envDefault: string | undefined,
): Promise<string | undefined> {
  const q = searchTeamId?.trim();
  if (q) return q;

  const c = (await cookies()).get(LUNCH_TEAM_COOKIE)?.value?.trim();
  if (c) return c;

  const env = envDefault?.trim();
  return env || undefined;
}
