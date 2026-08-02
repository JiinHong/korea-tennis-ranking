import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const libRoot = join(projectRoot, "lib");
const scriptsRoot = join(projectRoot, "scripts");

const expectedSharedModules = [
  "admin/actionPolicy.ts",
  "admin/rankAdjustment.ts",
  "analytics/amplitude.ts",
  "analytics/internalTraffic.ts",
  "campusRanking/config.ts",
  "campusRanking/highlights.ts",
  "campusRanking/monthlyPenalty.ts",
  "campusRanking/movementWindow.ts",
  "campusRanking/playerDetails.ts",
  "campusRanking/rank.ts",
  "campusRanking/rankingData.ts",
  "campusRanking/rules.ts",
  "campusRanking/weeklySnapshots.ts",
  "googleSheets/client.ts",
  "googleSheets/currentMatches.ts",
  "googleSheets/currentRanking.ts",
  "googleSheets/historicalMatches.ts",
  "supabase/admin/matchCommands.ts",
  "supabase/admin/matches.ts",
  "supabase/admin/playerCommands.ts",
  "supabase/admin/players.ts",
  "supabase/admin/repository.ts",
  "supabase/client.ts",
  "supabase/matchCommands.ts",
  "supabase/monthly/automationStatus.ts",
  "supabase/monthly/settlementCommands.ts",
  "supabase/monthly/settlements.ts",
  "supabase/rankingRepository.ts",
  "supabase/seed/plan.ts",
  "supabase/seed/sql.ts",
];

const expectedAppModules = [
  "app/_components/analytics/AmplitudeAnalytics.tsx",
  "app/_components/national-ranking/NationalPodiumCrown.tsx",
  "app/_components/national-ranking/NationalRankingDivisionTabs.tsx",
  "app/_components/national-ranking/NationalRankingExpandedResults.tsx",
  "app/_components/national-ranking/NationalRankingHonor.tsx",
  "app/_components/national-ranking/NationalRankingTable.tsx",
  "app/_components/site/SiteFooter.tsx",
  "app/[club]/_components/CampusResultUpdateLink.tsx",
  "app/[club]/_components/ClubRankingClient.tsx",
  "app/[club]/_components/MatchEntryDialog.tsx",
  "app/[club]/_components/PlayerDetailView.tsx",
  "app/[club]/_lib/playerPaths.ts",
  "app/admin/matches/_components/AdminMatchManager.tsx",
  "app/admin/monthly/_components/AdminMonthlyManager.tsx",
  "app/admin/players/_components/AdminPlayerManager.tsx",
  "app/clubs/[clubSlug]/_components/NationalClubResultsView.tsx",
  "app/internal/analytics/_components/InternalAnalyticsRegistration.tsx",
  "app/methodology/_components/MethodologyTableRegion.tsx",
];

const expectedScriptModules = [
  "scripts/campus-ranking/build-supabase-seed-sql.ts",
  "scripts/national-ranking/build-national-ranking-seed-sql.ts",
  "scripts/national-ranking/corrections/consolidate-kyunghee-clubs.ts",
  "scripts/national-ranking/corrections/resolve-gyeongin-2024-men-bracket.ts",
  "scripts/national-ranking/corrections/resolve-yanggu-2023-men-mappings.ts",
  "scripts/national-ranking/corrections/resolve-yanggu-2023-women-mappings.ts",
];

const legacyLooseAppModules = [
  "app/AmplitudeAnalytics.tsx",
  "app/NationalRankingTable.tsx",
  "app/SiteFooter.tsx",
  "app/[club]/ClubRankingClient.tsx",
  "app/[club]/playerPaths.ts",
  "app/admin/matches/AdminMatchManager.tsx",
  "app/clubs/[clubSlug]/NationalClubResultsView.tsx",
];

describe("project folder structure", () => {
  it("groups shared modules by responsibility", () => {
    const missingModules = expectedSharedModules.filter(
      (modulePath) => !existsSync(join(libRoot, modulePath)),
    );

    expect(missingModules).toEqual([]);
  });

  it("keeps shared TypeScript modules out of the lib root", () => {
    const rootTypeScriptFiles = readdirSync(libRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
      .map((entry) => entry.name)
      .sort();

    expect(rootTypeScriptFiles).toEqual([]);
  });

  it("places reusable UI next to its owning route", () => {
    const missingModules = expectedAppModules.filter(
      (modulePath) => !existsSync(join(projectRoot, modulePath)),
    );

    expect(missingModules).toEqual([]);
  });

  it("does not leave reusable UI in legacy loose locations", () => {
    const remainingLegacyModules = legacyLooseAppModules.filter((modulePath) =>
      existsSync(join(projectRoot, modulePath)),
    );

    expect(remainingLegacyModules).toEqual([]);
  });

  it("groups data scripts by product area and purpose", () => {
    const missingModules = expectedScriptModules.filter(
      (modulePath) => !existsSync(join(projectRoot, modulePath)),
    );
    const looseTypeScriptFiles = readdirSync(scriptsRoot, {
      withFileTypes: true,
    })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
      .map((entry) => entry.name)
      .sort();

    expect(missingModules).toEqual([]);
    expect(looseTypeScriptFiles).toEqual([]);
  });
});
