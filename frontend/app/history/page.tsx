import { LunchHistoryScreen } from "@/components/lunch/LunchHistoryScreen";
import {
  mergeMockHistoryItems,
  mockHistoryItems,
  MOCK_TEAM,
} from "@/lib/lunch/mockData";
import { loadLunchHistoryItems } from "@/lib/lunch/server/loadHistory";
import { createClient } from "@/lib/supabase/server";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ teamId?: string }>;
}) {
  const { teamId: teamIdParam } = await searchParams;
  const teamId =
    teamIdParam ?? process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID ?? MOCK_TEAM.id;

  const supabaseReady =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (supabaseReady) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
