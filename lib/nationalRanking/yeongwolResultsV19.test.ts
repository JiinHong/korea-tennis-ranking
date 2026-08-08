import { describe, expect, it } from "vitest";

import { calculateNationalRankings } from "@/lib/nationalRanking/calculate";
import { loadNationalRankingDataset } from "@/lib/nationalRanking/dataset";
import { NATIONAL_FORMULA_V4 } from "@/lib/nationalRanking/formula";

const EXPECTED_YEONGWOL_EDITIONS = {
  "yeongwol-2023-men": 4,
  "yeongwol-2023-women": 4,
  "yeongwol-2024-men": 14,
  "yeongwol-2024-women": 8,
  "yeongwol-2025-men": 16,
  "yeongwol-2025-women": 10,
  "yeongwol-2026-men": 28,
  "yeongwol-2026-women": 16,
} as const;

describe("Yeongwol results v19", () => {
  it("loads all supplied 2023-2026 men's and women's results", () => {
    const dataset = loadNationalRankingDataset();

    expect(dataset.version).toBe("sources-2026-08-08-v19");
    expect(dataset.tournaments).toContainEqual({
      slug: "yeongwol",
      name: "영월 전국대학 동아리 테니스 대회",
      scope: "national",
      scopeFactor: 1,
    });

    for (const [editionKey, expectedCount] of Object.entries(
      EXPECTED_YEONGWOL_EDITIONS
    )) {
      const edition = dataset.editions.find(({ key }) => key === editionKey);
      const results = dataset.results.filter(
        (result) => result.editionKey === editionKey
      );

      expect(edition, editionKey).toMatchObject({
        actualEntrants: expectedCount,
        sourceStatus: "verified",
      });
      expect(results, editionKey).toHaveLength(expectedCount);
      expect(
        results.every((result) => result.qualityStatus === "verified"),
        editionKey
      ).toBe(true);
    }
  });

  it("keeps 2023 podium honors for club pages but excludes them from ranking points", () => {
    const calculated = calculateNationalRankings(
      loadNationalRankingDataset(),
      NATIONAL_FORMULA_V4
    );
    const jeonbukMen = calculated.rows.find(
      (row) => row.clubSlug === "jeonbuk-ace" && row.gender === "men"
    );
    const kyungheeWomen = calculated.rows.find(
      (row) =>
        row.clubSlug === "kyunghee-kuta-lovice" && row.gender === "women"
    );

    expect(jeonbukMen?.honors).toContainEqual(
      expect.objectContaining({
        editionKey: "yeongwol-2023-men",
        stage: "champion",
      })
    );
    expect(kyungheeWomen?.honors).toContainEqual(
      expect.objectContaining({
        editionKey: "yeongwol-2023-women",
        stage: "champion",
      })
    );

    expect(
      jeonbukMen?.contributions.some(
        (contribution) => contribution.editionKey === "yeongwol-2023-men"
      )
    ).toBe(false);
    expect(
      kyungheeWomen?.contributions.some(
        (contribution) => contribution.editionKey === "yeongwol-2023-women"
      )
    ).toBe(false);
  });

  it("scores verified 2024-2026 results with Yeongwol's third-tier weight", () => {
    const calculated = calculateNationalRankings(
      loadNationalRankingDataset(),
      NATIONAL_FORMULA_V4
    );
    const sogangMen = calculated.rows.find(
      (row) => row.clubSlug === "sogang-sgtc" && row.gender === "men"
    );

    expect(NATIONAL_FORMULA_V4.tournamentUnits.yeongwol).toBe(1);
    expect(sogangMen?.contributions).toContainEqual(
      expect.objectContaining({
        editionKey: "yeongwol-2026-men",
        stage: "champion",
      })
    );
  });
});
