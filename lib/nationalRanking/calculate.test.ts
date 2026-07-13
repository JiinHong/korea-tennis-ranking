import { describe, expect, it } from "vitest";

import { calculateNationalRankings as calculateRankings } from "@/lib/nationalRanking/calculate";
import {
  NATIONAL_FORMULA_V1,
  NATIONAL_FORMULA_V2,
} from "@/lib/nationalRanking/formula";
import type { NationalRankingDataset } from "@/lib/nationalRanking/types";

function calculateNationalRankings(dataset: NationalRankingDataset) {
  return calculateRankings(dataset, NATIONAL_FORMULA_V1);
}

const dataset = {
  version: "test-v1",
  clubs: [
    {
      slug: "alpha",
      universityName: "Alpha University",
      clubName: "Alpha Tennis",
      displayName: "가나다",
    },
    {
      slug: "beta",
      universityName: "Beta University",
      clubName: "Beta Tennis",
      displayName: "나다라",
    },
  ],
  aliases: [],
  tournaments: [
    { slug: "national", name: "National", scope: "national", scopeFactor: 1 },
    { slug: "regional", name: "Regional", scope: "regional", scopeFactor: 0.85 },
  ],
  editions: [
    {
      key: "national-men-2025",
      tournamentSlug: "national",
      year: 2025,
      gender: "men",
      actualEntrants: 32,
      sourceStatus: "verified",
      sourceRefs: ["national-men-2025.pdf"],
    },
    {
      key: "regional-men-2025",
      tournamentSlug: "regional",
      year: 2025,
      gender: "men",
      actualEntrants: 32,
      sourceStatus: "verified",
      sourceRefs: ["regional-men-2025.pdf"],
    },
    {
      key: "national-women-2025",
      tournamentSlug: "national",
      year: 2025,
      gender: "women",
      actualEntrants: 32,
      sourceStatus: "verified",
      sourceRefs: ["national-women-2025.pdf"],
    },
    {
      key: "regional-women-2025",
      tournamentSlug: "regional",
      year: 2025,
      gender: "women",
      actualEntrants: 32,
      sourceStatus: "verified",
      sourceRefs: ["regional-women-2025.pdf"],
    },
    {
      key: "national-women-2025-unresolved",
      tournamentSlug: "national",
      year: 2025,
      gender: "women",
      actualEntrants: 32,
      sourceStatus: "unresolved",
      sourceRefs: ["national-women-2025-unresolved.pdf"],
    },
  ],
  results: [
    {
      editionKey: "national-men-2025",
      clubSlug: "alpha",
      sourceTeamName: "Alpha A",
      teamLabel: "A",
      stage: "champion",
      qualityStatus: "verified",
      sourceRef: "national-men-2025.pdf#alpha-a",
      note: "",
    },
    {
      editionKey: "national-men-2025",
      clubSlug: "alpha",
      sourceTeamName: "Alpha B",
      teamLabel: "B",
      stage: "runner_up",
      qualityStatus: "verified",
      sourceRef: "national-men-2025.pdf#alpha-b",
      note: "",
    },
    {
      editionKey: "regional-men-2025",
      clubSlug: "alpha",
      sourceTeamName: "Alpha A",
      teamLabel: "A",
      stage: "semifinal",
      qualityStatus: "verified",
      sourceRef: "regional-men-2025.pdf#alpha-a",
      note: "",
    },
    {
      editionKey: "national-women-2025",
      clubSlug: "alpha",
      sourceTeamName: "Alpha Women",
      teamLabel: "",
      stage: "runner_up",
      qualityStatus: "verified",
      sourceRef: "national-women-2025.pdf#alpha",
      note: "",
    },
    {
      editionKey: "national-men-2025",
      clubSlug: "beta",
      sourceTeamName: "Beta Men",
      teamLabel: "",
      stage: "runner_up",
      qualityStatus: "verified",
      sourceRef: "national-men-2025.pdf#beta",
      note: "",
    },
    {
      editionKey: "national-women-2025",
      clubSlug: "beta",
      sourceTeamName: "Beta Women",
      teamLabel: "",
      stage: "champion",
      qualityStatus: "verified",
      sourceRef: "national-women-2025.pdf#beta",
      note: "",
    },
    {
      editionKey: "national-women-2025-unresolved",
      clubSlug: "beta",
      sourceTeamName: "Beta Unverified Edition",
      teamLabel: "",
      stage: "champion",
      qualityStatus: "verified",
      sourceRef: "national-women-2025-unresolved.pdf#beta",
      note: "",
    },
    {
      editionKey: "national-men-2025",
      clubSlug: "unmapped",
      sourceTeamName: "Unmapped Team",
      teamLabel: "",
      stage: "champion",
      qualityStatus: "unresolved",
      sourceRef: "national-men-2025.pdf#unmapped",
      note: "",
    },
  ],
} satisfies NationalRankingDataset;

function createTieDataset() {
  const clubs = [
    ["total", "하나"],
    ["latest", "둘"],
    ["largest", "셋"],
    ["championships", "넷"],
    ["runner-ups", "다섯"],
    ["korean-a", "가나"],
    ["korean-b", "나다"],
  ].map(([slug, displayName]) => ({
    slug,
    universityName: `${slug} University`,
    clubName: `${slug} Tennis`,
    displayName,
  }));
  const tournaments: Array<{
    slug: string;
    name: string;
    scope: "national";
    scopeFactor: number;
  }> = [];
  const editions: Array<{
    key: string;
    tournamentSlug: string;
    year: number;
    gender: "men";
    actualEntrants: number;
    sourceStatus: "verified";
    sourceRefs: string[];
  }> = [];
  const results: Array<{
    editionKey: string;
    clubSlug: string;
    sourceTeamName: string;
    teamLabel: string;
    stage:
      | "champion"
      | "runner_up"
      | "semifinal"
      | "first_match_loss";
    qualityStatus: "verified";
    sourceRef: string;
    note: string;
  }> = [];

  function addContribution(
    clubSlug: string,
    stage: "champion" | "runner_up" | "semifinal",
    points: number,
    isLatest: boolean
  ) {
    const tournamentSlug = `tournament-${tournaments.length}`;
    const stagePoints = { champion: 100, runner_up: 65, semifinal: 40 }[stage];
    const recencyFactor = isLatest ? 1 : 0.6;
    const editionYear = isLatest ? 2025 : 2024;

    tournaments.push({
      slug: tournamentSlug,
      name: tournamentSlug,
      scope: "national",
      scopeFactor: points / (stagePoints * recencyFactor),
    });
    editions.push({
      key: `${tournamentSlug}-2025`,
      tournamentSlug,
      year: 2025,
      gender: "men",
      actualEntrants: 32,
      sourceStatus: "verified",
      sourceRefs: [],
    });
    results.push({
      editionKey: `${tournamentSlug}-${editionYear}`,
      clubSlug,
      sourceTeamName: `${clubSlug}-${tournamentSlug}`,
      teamLabel: "",
      stage,
      qualityStatus: "verified",
      sourceRef: `${tournamentSlug}.pdf`,
      note: "",
    });

    if (!isLatest) {
      editions.push({
        key: `${tournamentSlug}-2024`,
        tournamentSlug,
        year: 2024,
        gender: "men",
        actualEntrants: 32,
        sourceStatus: "verified",
        sourceRefs: [],
      });
    }
  }

  addContribution("total", "champion", 101, true);
  addContribution("latest", "champion", 80, true);
  addContribution("latest", "champion", 20, false);
  addContribution("largest", "champion", 49, true);
  addContribution("largest", "semifinal", 11, true);
  addContribution("largest", "champion", 39, false);
  addContribution("championships", "champion", 30, true);
  addContribution("championships", "champion", 30, true);
  addContribution("championships", "champion", 39, false);
  addContribution("runner-ups", "champion", 39, true);
  addContribution("runner-ups", "runner_up", 21, true);
  addContribution("runner-ups", "runner_up", 39, false);
  addContribution("korean-a", "champion", 39, true);
  addContribution("korean-a", "semifinal", 21, true);
  addContribution("korean-a", "runner_up", 39, false);
  addContribution("korean-b", "champion", 39, true);
  addContribution("korean-b", "semifinal", 21, true);
  addContribution("korean-b", "runner_up", 39, false);

  return {
    version: "tie-test-v1",
    clubs,
    aliases: [],
    tournaments,
    editions,
    results,
  };
}

describe("calculateNationalRankings", () => {
  it("uses the approved integer-only v3 formula by default", () => {
    const v3Dataset = {
      version: "integer-v3-test",
      clubs: [dataset.clubs[0]],
      aliases: [],
      tournaments: [
        {
          slug: "yanggu",
          name: "양구",
          scope: "national" as const,
          scopeFactor: 1,
        },
      ],
      editions: [
        {
          ...dataset.editions[0],
          key: "yanggu-men-2025",
          tournamentSlug: "yanggu",
          actualEntrants: 64,
        },
      ],
      results: [
        {
          ...dataset.results[0],
          editionKey: "yanggu-men-2025",
        },
      ],
    } satisfies NationalRankingDataset;

    const result = calculateRankings(v3Dataset);
    const alphaMen = result.rows.find(
      (row) => row.clubSlug === "alpha" && row.gender === "men"
    );

    expect(result.formulaVersion).toBe("national-club-v3");
    expect(alphaMen?.totalPoints).toBe(756);
    expect(alphaMen?.contributions[0]).toMatchObject({
      tournamentUnits: 3,
      fieldSizeUnits: 4,
      recencyUnits: 3,
      points: 756,
    });
    expect(result.rows.every((row) => Number.isInteger(row.totalPoints))).toBe(
      true
    );
  });

  it("uses only the best verified team per club, gender, tournament, and edition", () => {
    const result = calculateNationalRankings(dataset);
    const alphaMen = result.rows.find(
      (row) => row.clubSlug === "alpha" && row.gender === "men"
    );

    expect(result.formulaVersion).toBe("national-club-v1");
    expect(alphaMen?.contributions).toHaveLength(2);
    expect(alphaMen?.championships).toBe(1);
    expect(alphaMen?.contributions.some((item) => item.sourceTeamName === "Alpha B")).toBe(false);
    expect(result.rows.some((row) => row.clubSlug === "unmapped")).toBe(false);
  });

  it("keeps men and women independent and combines their totals for every configured club", () => {
    const result = calculateNationalRankings(dataset);
    const alphaMen = result.rows.find(
      (row) => row.clubSlug === "alpha" && row.gender === "men"
    );
    const alphaWomen = result.rows.find(
      (row) => row.clubSlug === "alpha" && row.gender === "women"
    );
    const alphaCombined = result.rows.find(
      (row) => row.clubSlug === "alpha" && row.gender === "combined"
    );

    expect(alphaMen?.totalPoints).toBeCloseTo(134);
    expect(alphaWomen?.totalPoints).toBeCloseTo(65);
    expect(alphaCombined?.totalPoints).toBeCloseTo(199);
    expect(alphaCombined?.contributions).toHaveLength(3);
    expect(result.rows.filter((row) => row.gender === "combined")).toHaveLength(2);
  });

  it("keeps a configured club in the combined ranking when one gender has no contribution", () => {
    const result = calculateNationalRankings({
      ...dataset,
      clubs: [
        ...dataset.clubs,
        {
          slug: "gamma",
          universityName: "Gamma University",
          clubName: "Gamma Tennis",
          displayName: "라마바사",
        },
      ],
      results: [
        ...dataset.results,
        {
          ...dataset.results[0],
          clubSlug: "gamma",
          sourceTeamName: "Gamma Men",
          sourceRef: "national-men-2025.pdf#gamma",
          stage: "runner_up",
        },
      ],
    });
    const gammaCombined = result.rows.find(
      (row) => row.clubSlug === "gamma" && row.gender === "combined"
    );

    expect(gammaCombined?.totalPoints).toBeCloseTo(65);
    expect(gammaCombined?.contributions).toHaveLength(1);
  });

  it("omits clubs without scoreable results but ranks a verified current zero-point loss", () => {
    const result = calculateNationalRankings({
      ...dataset,
      clubs: [
        ...dataset.clubs,
        {
          slug: "gamma",
          universityName: "Gamma University",
          clubName: "Gamma Tennis",
          displayName: "라마바사",
        },
        {
          slug: "delta",
          universityName: "Delta University",
          clubName: "Delta Tennis",
          displayName: "다라마바사",
        },
      ],
      results: [
        ...dataset.results,
        {
          ...dataset.results[0],
          clubSlug: "delta",
          sourceTeamName: "Delta Men",
          sourceRef: "national-men-2025.pdf#delta",
          stage: "first_match_loss",
        },
      ],
    });

    expect(result.rows.some((row) => row.clubSlug === "gamma")).toBe(false);
    expect(
      result.rows.some(
        (row) => row.clubSlug === "delta" && row.gender === "women"
      )
    ).toBe(false);
    expect(
      result.rows.find(
        (row) => row.clubSlug === "delta" && row.gender === "men"
      )
    ).toMatchObject({ totalPoints: 0, championships: 0, runnerUps: 0 });
    expect(
      result.rows.find(
        (row) => row.clubSlug === "delta" && row.gender === "combined"
      )
    ).toMatchObject({ totalPoints: 0, championships: 0, runnerUps: 0 });
  });

  it("excludes expired editions from contributions and stage-count tie-breakers", () => {
    const result = calculateNationalRankings({
      version: "expired-tie-test-v1",
      clubs: [dataset.clubs[0], dataset.clubs[1]],
      aliases: [],
      tournaments: [dataset.tournaments[0]],
      editions: [
        {
          ...dataset.editions[0],
          key: "national-men-2023",
          year: 2023,
        },
        {
          ...dataset.editions[0],
          key: "national-men-2026",
          year: 2026,
        },
      ],
      results: [
        {
          ...dataset.results[0],
          editionKey: "national-men-2023",
          clubSlug: "beta",
          sourceTeamName: "Beta 2023",
          sourceRef: "national-men-2025.pdf#beta-2023",
          stage: "champion",
        },
        {
          ...dataset.results[0],
          editionKey: "national-men-2026",
          clubSlug: "alpha",
          sourceTeamName: "Alpha 2026",
          sourceRef: "national-men-2025.pdf#alpha-2026",
          stage: "first_match_loss",
        },
        {
          ...dataset.results[0],
          editionKey: "national-men-2026",
          clubSlug: "beta",
          sourceTeamName: "Beta 2026",
          sourceRef: "national-men-2025.pdf#beta-2026",
          stage: "first_match_loss",
        },
      ],
    });
    const men = result.rows.filter((row) => row.gender === "men");
    const beta = men.find((row) => row.clubSlug === "beta");

    expect(men.map((row) => row.clubSlug)).toEqual(["alpha", "beta"]);
    expect(beta?.championships).toBe(0);
    expect(beta?.contributions.map((item) => item.editionYear)).toEqual([2026]);
  });

  it("does not let unresolved or missing future editions decay verified scores", () => {
    const result = calculateNationalRankings({
      version: "unverified-future-edition-test-v1",
      clubs: [dataset.clubs[0]],
      aliases: [],
      tournaments: [dataset.tournaments[0]],
      editions: [
        dataset.editions[0],
        {
          ...dataset.editions[0],
          key: "national-men-2026-unresolved",
          year: 2026,
          sourceStatus: "unresolved",
        },
        {
          ...dataset.editions[0],
          key: "national-men-2027-missing",
          year: 2027,
          sourceStatus: "missing",
        },
      ],
      results: [dataset.results[0]],
    });
    const alphaMen = result.rows.find(
      (row) => row.clubSlug === "alpha" && row.gender === "men"
    );

    expect(alphaMen?.totalPoints).toBeCloseTo(100);
    expect(alphaMen?.latestEditionPoints).toBeCloseTo(100);
    expect(alphaMen?.contributions[0]).toMatchObject({
      editionYear: 2025,
      latestEditionYear: 2025,
    });
  });

  it("excludes results that are unresolved or belong to unverified editions", () => {
    const result = calculateNationalRankings(dataset);
    const betaWomen = result.rows.find(
      (row) => row.clubSlug === "beta" && row.gender === "women"
    );

    expect(betaWomen?.totalPoints).toBeCloseTo(100);
    expect(betaWomen?.contributions).toHaveLength(1);
  });

  it("fails closed when a verified result has no terminal stage", () => {
    expect(() =>
      calculateNationalRankings({
        ...dataset,
        results: [
          {
            ...dataset.results[0],
            stage: null as unknown as "champion",
            sourceRef: "results.csv:16",
          },
        ],
      })
    ).toThrow(/results\.csv:16.*terminal stage/i);
  });

  it("reports source-qualified errors for verified results with unknown joins", () => {
    expect(() =>
      calculateNationalRankings({
        ...dataset,
        results: [
          ...dataset.results,
          {
            ...dataset.results[0],
            editionKey: "unknown-edition",
            sourceRef: "results.csv:11",
          },
        ],
      })
    ).toThrow(/results\.csv:11.*unknown edition/i);

    expect(() =>
      calculateNationalRankings({
        ...dataset,
        editions: [
          ...dataset.editions,
          {
            ...dataset.editions[0],
            key: "unknown-tournament-edition",
            tournamentSlug: "unknown-tournament",
          },
        ],
        results: [
          {
            ...dataset.results[0],
            editionKey: "unknown-tournament-edition",
            sourceRef: "results.csv:12",
          },
        ],
      })
    ).toThrow(/results\.csv:12.*unknown tournament/i);

    expect(() =>
      calculateNationalRankings({
        ...dataset,
        results: [
          {
            ...dataset.results[0],
            clubSlug: "unknown-club",
            sourceRef: "results.csv:13",
          },
        ],
      })
    ).toThrow(/results\.csv:13.*unknown club/i);
  });

  it("validates tournament and club joins before excluding an unverified edition", () => {
    expect(() =>
      calculateNationalRankings({
        ...dataset,
        editions: [
          ...dataset.editions,
          {
            ...dataset.editions[0],
            key: "unverified-unknown-tournament",
            tournamentSlug: "unknown-tournament",
            sourceStatus: "unresolved",
          },
        ],
        results: [
          {
            ...dataset.results[0],
            editionKey: "unverified-unknown-tournament",
            sourceRef: "results.csv:14",
          },
        ],
      })
    ).toThrow(/results\.csv:14.*unknown tournament/i);

    expect(() =>
      calculateNationalRankings({
        ...dataset,
        editions: [
          ...dataset.editions,
          {
            ...dataset.editions[0],
            key: "unverified-known-tournament",
            sourceStatus: "unresolved",
          },
        ],
        results: [
          {
            ...dataset.results[0],
            editionKey: "unverified-known-tournament",
            clubSlug: "unknown-club",
            sourceRef: "results.csv:15",
          },
        ],
      })
    ).toThrow(/results\.csv:15.*unknown club/i);
  });

  it("adds gender totals directly for combined rows", () => {
    const result = calculateNationalRankings({
      ...dataset,
      tournaments: [
        {
          slug: "men-large",
          name: "Men Large",
          scope: "national",
          scopeFactor: 1e14,
        },
        {
          slug: "women-small-one",
          name: "Women Small One",
          scope: "national",
          scopeFactor: 0.01,
        },
        {
          slug: "women-small-two",
          name: "Women Small Two",
          scope: "national",
          scopeFactor: 0.01,
        },
      ],
      editions: [
        {
          ...dataset.editions[0],
          key: "men-large-2025",
          tournamentSlug: "men-large",
        },
        {
          ...dataset.editions[2],
          key: "women-small-one-2025",
          tournamentSlug: "women-small-one",
        },
        {
          ...dataset.editions[2],
          key: "women-small-two-2025",
          tournamentSlug: "women-small-two",
        },
      ],
      results: [
        {
          ...dataset.results[0],
          editionKey: "men-large-2025",
          stage: "champion",
        },
        {
          ...dataset.results[3],
          editionKey: "women-small-one-2025",
          stage: "champion",
        },
        {
          ...dataset.results[3],
          editionKey: "women-small-two-2025",
          stage: "champion",
        },
      ],
    });
    const menRow = result.rows.find(
      (row) => row.clubSlug === "alpha" && row.gender === "men"
    );
    const womenRow = result.rows.find(
      (row) => row.clubSlug === "alpha" && row.gender === "women"
    );
    const combinedRow = result.rows.find(
      (row) => row.clubSlug === "alpha" && row.gender === "combined"
    );

    expect(combinedRow?.totalPoints).toBe(
      menRow!.totalPoints + womenRow!.totalPoints
    );
  });

  it("applies the full approved tie-break order", () => {
    const men = calculateNationalRankings(createTieDataset()).rows.filter(
      (row) => row.gender === "men"
    );

    expect(men.map((row) => row.clubSlug)).toEqual([
      "total",
      "latest",
      "largest",
      "championships",
      "runner-ups",
      "korean-a",
      "korean-b",
    ]);
    expect(men.map((row) => row.rank)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("applies the approved prestige order independently of national or regional scope", () => {
    const tournaments = [
      { slug: "yanggu", name: "양구", scope: "national", scopeFactor: 1 },
      { slug: "gyeongin", name: "경인지구", scope: "regional", scopeFactor: 0.85 },
      { slug: "chuncheon", name: "춘천", scope: "national", scopeFactor: 1 },
      { slug: "wemix", name: "위믹스", scope: "national", scopeFactor: 1 },
      { slug: "inje", name: "인제", scope: "national", scopeFactor: 1 },
    ] as const;
    const clubs = tournaments.map((tournament) => ({
      slug: tournament.slug,
      universityName: `${tournament.name} 대학교`,
      clubName: `${tournament.name} 테니스`,
      displayName: tournament.name,
    }));
    const prestigeDataset = {
      version: "prestige-test-v2",
      clubs,
      aliases: [],
      tournaments: [...tournaments],
      editions: tournaments.map((tournament) => ({
        key: `${tournament.slug}-men-2025`,
        tournamentSlug: tournament.slug,
        year: 2025,
        gender: "men" as const,
        actualEntrants: 32,
        sourceStatus: "verified" as const,
        sourceRefs: [`${tournament.slug}.pdf`],
      })),
      results: tournaments.map((tournament) => ({
        editionKey: `${tournament.slug}-men-2025`,
        clubSlug: tournament.slug,
        sourceTeamName: tournament.name,
        teamLabel: "A",
        stage: "champion" as const,
        qualityStatus: "verified" as const,
        sourceRef: `${tournament.slug}.pdf#champion`,
        note: "",
      })),
    } satisfies NationalRankingDataset;

    const result = calculateRankings(prestigeDataset, NATIONAL_FORMULA_V2);
    const pointsByClub = Object.fromEntries(
      result.rows
        .filter((row) => row.gender === "men")
        .map((row) => [row.clubSlug, row.totalPoints])
    );

    expect(result.formulaVersion).toBe("national-club-v2");
    expect(pointsByClub).toEqual({
      yanggu: 100,
      gyeongin: 90,
      chuncheon: 90,
      wemix: 80,
      inje: 80,
    });
  });

  it("fails before scoring when a configured tournament has no v2 prestige weight", () => {
    expect(() =>
      calculateRankings(
        {
          version: "missing-prestige-test-v2",
          clubs: [],
          aliases: [],
          tournaments: [
            {
              slug: "unknown-tournament",
              name: "Unknown Tournament",
              scope: "national",
              scopeFactor: 1,
            },
          ],
          editions: [],
          results: [],
        },
        NATIONAL_FORMULA_V2
      )
    ).toThrow(/prestige factor is missing.*unknown-tournament/i);
  });
});
