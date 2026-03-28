import { LunchHistoryScreen } from "@/components/lunch/LunchHistoryScreen";
import {
  mergeMockHistoryItems,
  mockHistoryItems,
  MOCK_TEAM,
} from "@/lib/lunch/mockData";
import { loadLunchHistoryItems } from "@/lib/lunch/server/loadHistory";
import {
  bootstrapLunchTeamCookieIfEmpty,
  resolveTeamIdFromRequest,
} from "@/lib/lunch/server/resolveTeamId";
import { createClient } from "@/lib/supabase/server";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ teamId?: string }>;
}) {
  const { teamId: teamIdParam } = await searchParams;

  const supabaseReady =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  let teamId: string;

  if (supabaseReady) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await bootstrapLunchTeamCookieIfEmpty(supabase, user.id);
    }

    const resolved = await resolveTeamIdFromRequest(
      teamIdParam,
      process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID,
    );
    teamId = resolved ?? MOCK_TEAM.id;

    if (user) {
      const live = await loadLunchHistoryItems(supabase, teamId, user.id);
      if (live.ok) {
        const { data: teamRow } = await supabase
          .from("teams")
          .select("name")
          .eq("id", teamId)
          .maybeSingle();

        return (
          <LunchHistoryScreen
            key={`live:${teamId}`}
            teamId={teamId}
            teamName={teamRow?.name ?? "팀"}
            initialItems={live.items}
            apiMode="live"
          />
        );
      }
    }
  } else {
    teamId =
      teamIdParam?.trim() ||
      process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID?.trim() ||
      MOCK_TEAM.id;
  }

  const merged = mergeMockHistoryItems(mockHistoryItems, []);

  return (
    <LunchHistoryScreen
      teamId={MOCK_TEAM.id}
      teamName={MOCK_TEAM.name}
      initialItems={merged}
      apiMode="mock"
    />
  );
}
