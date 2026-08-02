import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const libRoot = join(process.cwd(), "lib");

const expectedModules = [
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

describe("lib folder structure", () => {
  it("groups shared modules by responsibility", () => {
    const missingModules = expectedModules.filter(
      (modulePath) => !existsSync(join(libRoot, modulePath)),
    );

    expect(missingModules).toEqual([]);
  });

  it("does not leave TypeScript modules loose in the lib root", () => {
    const rootTypeScriptFiles = readdirSync(libRoot, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
      .map((entry) => entry.name)
      .sort();

    expect(rootTypeScriptFiles).toEqual([]);
  });
});
