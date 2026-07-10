import { describe, expect, it, vi } from "vitest";

import {
  getAdminClubOverviews,
  type SupabaseAdminOverviewAdapter,
} from "@/lib/supabaseAdminRepository";

vi.mock("server-only", () => ({}));

function createAdapter(): SupabaseAdminOverviewAdapter {
  return {
    listActiveClubs: vi.fn().mockResolvedValue([
      { id: "club-seoul", slug: "seoultech", name: "서울과기대 테니스", title: "서울과기대 단식 랭킹" },
      { id: "club-petc", slug: "petc", name: "고려대 PETC", title: "PETC 단식 랭킹" },
      { id: "club-empty", slug: "empty", name: "신규 동아리", title: "신규 랭킹" },
    ]),
    listCurrentSeasons: vi.fn().mockResolvedValue([
      { id: "season-3", clubId: "club-seoul", name: "시즌3", startsOn: "2026-07-01", endsOn: null },
      { id: "season-petc", clubId: "club-petc", name: "현재", startsOn: null, endsOn: null },
    ]),
    listSeasonPlayers: vi.fn().mockResolvedValue([
      { seasonId: "season-3", status: "active" },
      { seasonId: "season-3", status: "active" },
      { seasonId: "season-3", status: "injured" },
      { seasonId: "season-3", status: "inactive" },
      { seasonId: "season-3", status: "left" },
      { seasonId: "season-petc", status: "active" },
    ]),
    listConfirmedMatches: vi.fn().mockResolvedValue([
      { seasonId: "season-3", playedOn: "2026-07-03" },
      { seasonId: "season-3", playedOn: "2026-07-08" },
      { seasonId: "season-petc", playedOn: "2026-07-02" },
    ]),
    listRuleConfigs: vi.fn().mockResolvedValue([
      {
        seasonId: "season-3",
        challengeRange: 4,
        rematchCooldownDays: 14,
        inactivityPenaltyDrop: 2,
      },
    ]),
  };
}

describe("getAdminClubOverviews", () => {
  it("builds operational metrics for every active club", async () => {
    const overviews = await getAdminClubOverviews(createAdapter());

    expect(overviews).toEqual([
      {
        id: "club-petc",
        slug: "petc",
        name: "고려대 PETC",
        title: "PETC 단식 랭킹",
        season: {
          id: "season-petc",
          name: "현재",
          startsOn: null,
          endsOn: null,
        },
        roster: { total: 1, active: 1, injured: 0, inactive: 0, left: 0 },
        matches: { confirmed: 1, latestPlayedOn: "2026-07-02" },
        rules: null,
      },
      {
        id: "club-seoul",
        slug: "seoultech",
        name: "서울과기대 테니스",
        title: "서울과기대 단식 랭킹",
        season: {
          id: "season-3",
          name: "시즌3",
          startsOn: "2026-07-01",
          endsOn: null,
        },
        roster: { total: 5, active: 2, injured: 1, inactive: 1, left: 1 },
        matches: { confirmed: 2, latestPlayedOn: "2026-07-08" },
        rules: {
          challengeRange: 4,
          rematchCooldownDays: 14,
          inactivityPenaltyDrop: 2,
        },
      },
      {
        id: "club-empty",
        slug: "empty",
        name: "신규 동아리",
        title: "신규 랭킹",
        season: null,
        roster: { total: 0, active: 0, injured: 0, inactive: 0, left: 0 },
        matches: { confirmed: 0, latestPlayedOn: null },
        rules: null,
      },
    ]);
  });

  it("does not query season tables when no club has a current season", async () => {
    const adapter = createAdapter();
    vi.mocked(adapter.listCurrentSeasons).mockResolvedValue([]);

    await getAdminClubOverviews(adapter);

    expect(adapter.listSeasonPlayers).not.toHaveBeenCalled();
    expect(adapter.listConfirmedMatches).not.toHaveBeenCalled();
    expect(adapter.listRuleConfigs).not.toHaveBeenCalled();
  });
});
