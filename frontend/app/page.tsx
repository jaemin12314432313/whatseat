import { LunchTodayScreen } from "@/components/lunch/LunchTodayScreen";
import {
  getMockTodayPayload,
  type MockTodayScenario,
} from "@/lib/lunch/mockData";
import { loadLunchTodayPayload } from "@/lib/lunch/server/loadToday";
import {
  bootstrapLunchTeamCookieIfEmpty,
  resolveTeamIdFromRequest,
} from "@/lib/lunch/server/resolveTeamId";
import { createClient } from "@/lib/supabase/server";

const SCENARIOS: MockTodayScenario[] = ["noSession", "open", "closed"];

function parseScenario(raw: string | undefined): MockTodayScenario {
  if (raw && SCENARIOS.includes(raw as MockTodayScenario)) {
    return raw as MockTodayScenario;
  }
  return "noSession";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string; teamId?: string }>;
}) {
  const { scenario: scenarioParam, teamId: teamIdParam } = await searchParams;

  const supabaseReady =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  let teamId: string | undefined;

  if (supabaseReady) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await bootstrapLunchTeamCookieIfEmpty(supabase, user.id);
    }

    teamId = await resolveTeamIdFromRequest(
      teamIdParam,
      process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID,
    );

    if (user && teamId) {
      const live = await loadLunchTodayPayload(supabase, teamId, user.id);
      if (live.ok) {
        return (
          <LunchTodayScreen
            key={`live:${teamId}`}
            data={live.data}
            apiMode="live"
          />
        );
      }
    }
  } else {
    teamId =
      teamIdParam?.trim() ||
      process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID?.trim() ||
      undefined;
  }

  const scenario = parseScenario(scenarioParam);
  const data = getMockTodayPayload(scenario);

  return <LunchTodayScreen key={scenario} data={data} />;
}
