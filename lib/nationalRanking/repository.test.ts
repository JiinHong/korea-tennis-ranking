import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseReadClient: vi.fn(),
  supabaseFrom: vi.fn(),
  unstableCache: vi.fn(<T extends (...args: never[]) => unknown>(callback: T) =>
    callback
  ),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabaseServer", () => ({
  getSupabaseReadClient: mocks.getSupabaseReadClient,
}));
vi.mock("next/cache", () => ({
  unstable_cache: mocks.unstableCache,
}));

import {
  getCachedNationalRankingPageData,
  getNationalRankingPageData,
  type NationalRankingReadAdapter,
  type NationalRankingViewRow,
} from "@/lib/nationalRanking/repository";

function rankingRow(
  overrides: Partial<NationalRankingViewRow> = {}
): NationalRankingViewRow {
  return {
    formula_version: "national-club-v1",
    calculated_at: "2026-07-12T12:00:00.000Z",
    gender: "men",
    rank: 1,
    total_points: 120,
    latest_edition_points: 40,
    championships: 2,
    runner_ups: 1,
    club_slug: "seoultech",
    university_name: "Seoul National University of Science and Technology",
    club_name: "STC",
    display_name: "SeoulTech STC",
    ...overrides,
  };
}

function createAdapter(
  rows: NationalRankingViewRow[]
): NationalRankingReadAdapter {
  return {
    listLatestRows: vi.fn().mockResolvedValue(rows),
  };
}

describe("getNationalRankingPageData", () => {
  beforeEach(() => {
    mocks.getSupabaseReadClient.mockReset();
    mocks.supabaseFrom.mockReset();
    mocks.getSupabaseReadClient.mockReturnValue({ from: mocks.supabaseFrom });
  });

  test("groups unsorted rows by gender and sorts each ranking by rank", async () => {
    const adapter = createAdapter([
      rankingRow({
        gender: "women",
        rank: 2,
        club_slug: "yonsei",
        university_name: "Yonsei University",
        club_name: "YTC",
        display_name: "Yonsei YTC",
        total_points: 90,
        latest_edition_points: 20,
        championships: 1,
        runner_ups: 2,
      }),
      rankingRow({ gender: "combined", rank: 2 }),
      rankingRow({
        gender: "men",
        rank: 2,
        club_slug: "hanyang",
        university_name: "Hanyang University",
        club_name: "HYTC",
        display_name: "Hanyang HYTC",
      }),
      rankingRow({ gender: "combined", rank: 1, club_slug: "yonsei" }),
      rankingRow({ gender: "women", rank: 1, club_slug: "seoultech" }),
      rankingRow({ gender: "men", rank: 1, club_slug: "yonsei" }),
    ]);

    await expect(getNationalRankingPageData(adapter)).resolves.toEqual({
      formulaVersion: "national-club-v1",
      calculatedAt: "2026-07-12T12:00:00.000Z",
      rankings: {
        men: [
          expect.objectContaining({ rank: 1, clubSlug: "yonsei" }),
          expect.objectContaining({ rank: 2, clubSlug: "hanyang" }),
        ],
        women: [
          expect.objectContaining({ rank: 1, clubSlug: "seoultech" }),
          {
            rank: 2,
            clubSlug: "yonsei",
            universityName: "Yonsei University",
            clubName: "YTC",
            displayName: "Yonsei YTC",
            points: 90,
            latestEditionPoints: 20,
            championships: 1,
            runnerUps: 2,
          },
        ],
        combined: [
          expect.objectContaining({ rank: 1, clubSlug: "yonsei" }),
          expect.objectContaining({ rank: 2, clubSlug: "seoultech" }),
        ],
      },
    });
  });

  test("returns null when no ranking snapshot has been published", async () => {
    await expect(getNationalRankingPageData(createAdapter([]))).resolves.toBeNull();
  });

  test("wraps adapter errors with the public read context", async () => {
    const adapter: NationalRankingReadAdapter = {
      listLatestRows: vi.fn().mockRejectedValue(new Error("database unavailable")),
    };

    try {
      await getNationalRankingPageData(adapter);
      throw new Error("Expected national ranking read to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(
        "National ranking read failed: database unavailable"
      );
    }
  });

  test.each([
    {
      metadata: "formula version",
      overrides: { formula_version: "national-club-v2" },
      received:
        "formula_version national-club-v2 and calculated_at " +
        "2026-07-12T12:00:00.000Z",
    },
    {
      metadata: "calculation timestamp",
      overrides: { calculated_at: "2026-07-13T12:00:00.000Z" },
      received:
        "formula_version national-club-v1 and calculated_at " +
        "2026-07-13T12:00:00.000Z",
    },
  ])("rejects rows with a different $metadata", async ({ overrides, received }) => {
    const adapter = createAdapter([
      rankingRow(),
      rankingRow({ gender: "women", ...overrides }),
    ]);

    await expect(getNationalRankingPageData(adapter)).rejects.toThrow(
      "National ranking snapshot metadata mismatch: expected formula_version " +
        "national-club-v1 and calculated_at 2026-07-12T12:00:00.000Z, received " +
        received
    );
  });

  test("keeps calls with an injected adapter outside the server cache", async () => {
    const adapter = createAdapter([]);

    await getNationalRankingPageData(adapter);
    await getNationalRankingPageData(adapter);

    expect(adapter.listLatestRows).toHaveBeenCalledTimes(2);
  });
});

describe("default national ranking read adapter", () => {
  beforeEach(() => {
    mocks.getSupabaseReadClient.mockReset();
    mocks.supabaseFrom.mockReset();
    mocks.getSupabaseReadClient.mockReturnValue({ from: mocks.supabaseFrom });
  });

  test("selects the latest ranking view once and orders it by gender then rank", async () => {
    const rankOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const genderOrder = vi.fn().mockReturnValue({ order: rankOrder });
    const select = vi.fn().mockReturnValue({ order: genderOrder });
    mocks.supabaseFrom.mockReturnValue({ select });

    await expect(getNationalRankingPageData()).resolves.toBeNull();

    expect(mocks.supabaseFrom).toHaveBeenCalledTimes(1);
    expect(mocks.supabaseFrom).toHaveBeenCalledWith("latest_national_rankings");
    expect(select).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledWith(
      "formula_version, calculated_at, gender, rank, total_points, latest_edition_points, championships, runner_ups, club_slug, university_name, club_name, display_name"
    );
    expect(genderOrder).toHaveBeenCalledWith("gender", { ascending: true });
    expect(rankOrder).toHaveBeenCalledWith("rank", { ascending: true });
  });
});

describe("getCachedNationalRankingPageData", () => {
  test("uses the national ranking five-minute cache contract", () => {
    expect(getCachedNationalRankingPageData).toBeTypeOf("function");
    expect(mocks.unstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["national-ranking-v1"],
      { tags: ["national-ranking"], revalidate: 300 }
    );
  });
});
