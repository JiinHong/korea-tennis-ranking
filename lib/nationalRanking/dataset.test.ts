import { describe, expect, it } from "vitest";

import { calculateNationalRankings } from "@/lib/nationalRanking/calculate";
import {
  loadNationalRankingDataset,
  parseNationalRankingDataset,
} from "@/lib/nationalRanking/dataset";

function createValidDataset() {
  return {
    version: "sources-test-v1",
    clubs: [
      {
        slug: "alpha-tennis",
        universityName: "Alpha University",
        clubName: "Alpha Tennis",
        displayName: "Alpha Tennis",
      },
      {
        slug: "beta-tennis",
        universityName: "Beta University",
        clubName: "Beta Tennis",
        displayName: "Beta Tennis",
      },
    ],
    aliases: [
      {
        clubSlug: "alpha-tennis",
        normalizedAlias: "alpha tennis",
        sourceLabel: "Alpha Tennis Club",
      },
    ],
    tournaments: [
      {
        slug: "national-open",
        name: "National Open",
        scope: "national",
        scopeFactor: 1,
      },
      {
        slug: "regional-open",
        name: "Regional Open",
        scope: "regional",
        scopeFactor: 0.85,
      },
    ],
    editions: [
      {
        key: "national-open-2025-men",
        tournamentSlug: "national-open",
        year: 2025,
        gender: "men",
        actualEntrants: 32,
        sourceStatus: "verified",
        sourceRefs: ["national/2025/men.pdf"],
      },
      {
        key: "regional-open-2025-women",
        tournamentSlug: "regional-open",
        year: 2025,
        gender: "women",
        actualEntrants: 16,
        sourceStatus: "unresolved",
        sourceRefs: ["regional/2025/women.pdf"],
      },
    ],
    results: [
      {
        editionKey: "national-open-2025-men",
        clubSlug: "alpha-tennis",
        sourceTeamName: "Alpha Tennis A",
        teamLabel: "A",
        stage: "champion",
        qualityStatus: "verified",
        sourceRef: "national/2025/men.pdf#page=1",
        note: "",
      },
      {
        editionKey: "regional-open-2025-women",
        clubSlug: null,
        sourceTeamName: "Unresolved Team",
        teamLabel: "",
        stage: "runner_up",
        qualityStatus: "unresolved",
        sourceRef: "regional/2025/women.pdf#page=2",
        note: "Club identity is ambiguous.",
      },
    ],
  };
}

describe("parseNationalRankingDataset", () => {
  it("accepts a valid dataset and returns newly constructed records", () => {
    const input = createValidDataset();
    const dataset = parseNationalRankingDataset(input);

    expect(dataset).toEqual(input);
    expect(dataset).not.toBe(input);
    expect(dataset.clubs).not.toBe(input.clubs);
    expect(dataset.editions[0]).not.toBe(input.editions[0]);
  });

  it("requires a non-empty version", () => {
    const dataset = createValidDataset();
    dataset.version = "";

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "dataset.version must be a non-empty string"
    );
  });

  it("requires every top-level collection to be an array", () => {
    const dataset = createValidDataset();
    dataset.clubs = {} as never;

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "dataset.clubs must be an array"
    );
  });

  it("rejects duplicate club and tournament slugs", () => {
    const duplicateClub = createValidDataset();
    duplicateClub.clubs.push({ ...duplicateClub.clubs[0] });

    expect(() => parseNationalRankingDataset(duplicateClub)).toThrow(
      "duplicate club slug"
    );

    const duplicateTournament = createValidDataset();
    duplicateTournament.tournaments.push({ ...duplicateTournament.tournaments[0] });

    expect(() => parseNationalRankingDataset(duplicateTournament)).toThrow(
      "duplicate tournament slug"
    );
  });

  it("validates every club string field", () => {
    const dataset = createValidDataset();
    dataset.clubs[0].displayName = " ";

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "dataset.clubs[0].displayName must be a non-empty string"
    );
  });

  it("requires aliases to be unique and reference known clubs", () => {
    const duplicateAlias = createValidDataset();
    duplicateAlias.aliases.push({
      ...duplicateAlias.aliases[0],
      clubSlug: "beta-tennis",
    });

    expect(() => parseNationalRankingDataset(duplicateAlias)).toThrow(
      "duplicate normalized alias"
    );

    const unknownClub = createValidDataset();
    unknownClub.aliases[0].clubSlug = "unknown-club";

    expect(() => parseNationalRankingDataset(unknownClub)).toThrow(
      "alias references an unknown club"
    );
  });

  it("validates every alias string field", () => {
    const dataset = createValidDataset();
    dataset.aliases[0].sourceLabel = "";

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "dataset.aliases[0].sourceLabel must be a non-empty string"
    );
  });

  it("allows only known tournament scopes", () => {
    const dataset = createValidDataset();
    dataset.tournaments[0].scope = "international";

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "dataset.tournaments[0].scope must be one of: national, regional"
    );
  });

  it("requires a scope factor that is both allowed and coherent with its scope", () => {
    const invalidFactor = createValidDataset();
    invalidFactor.tournaments[0].scopeFactor = 0.9;

    expect(() => parseNationalRankingDataset(invalidFactor)).toThrow(
      "scopeFactor must be exactly 1 or 0.85"
    );

    const incoherentFactor = createValidDataset();
    incoherentFactor.tournaments[0].scopeFactor = 0.85;

    expect(() => parseNationalRankingDataset(incoherentFactor)).toThrow(
      "national scope requires scopeFactor 1"
    );
  });

  it("rejects duplicate edition keys and tournament-year-gender identities", () => {
    const duplicateKey = createValidDataset();
    duplicateKey.editions.push({ ...duplicateKey.editions[0] });

    expect(() => parseNationalRankingDataset(duplicateKey)).toThrow(
      "duplicate edition key"
    );

    const duplicateNaturalKey = createValidDataset();
    duplicateNaturalKey.editions.push({
      ...duplicateNaturalKey.editions[0],
      key: "another-national-open-2025-men",
    });

    expect(() => parseNationalRankingDataset(duplicateNaturalKey)).toThrow(
      "duplicate tournament/year/gender edition"
    );
  });

  it("requires editions to reference known tournaments", () => {
    const dataset = createValidDataset();
    dataset.editions[0].tournamentSlug = "unknown-tournament";

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "edition references an unknown tournament"
    );
  });

  it("requires edition years and entrant counts to be positive integers", () => {
    const invalidYear = createValidDataset();
    invalidYear.editions[0].year = 2025.5;

    expect(() => parseNationalRankingDataset(invalidYear)).toThrow(
      "dataset.editions[0].year must be a positive integer"
    );

    const invalidEntrants = createValidDataset();
    invalidEntrants.editions[0].actualEntrants = 0;

    expect(() => parseNationalRankingDataset(invalidEntrants)).toThrow(
      "actualEntrants must be a positive integer"
    );
  });

  it.each([
    ["gender", "other", "dataset.editions[0].gender must be one of: men, women"],
    [
      "sourceStatus",
      "pending",
      "dataset.editions[0].sourceStatus must be one of: verified, unresolved, missing",
    ],
  ])("validates the edition %s union", (field, value, message) => {
    const dataset = createValidDataset();
    Object.assign(dataset.editions[0], { [field]: value });

    expect(() => parseNationalRankingDataset(dataset)).toThrow(message);
  });

  it("requires unique non-empty edition source references", () => {
    const emptyReference = createValidDataset();
    emptyReference.editions[0].sourceRefs = [""];

    expect(() => parseNationalRankingDataset(emptyReference)).toThrow(
      "dataset.editions[0].sourceRefs[0] must be a non-empty string"
    );

    const duplicateReference = createValidDataset();
    duplicateReference.editions[0].sourceRefs.push(
      duplicateReference.editions[0].sourceRefs[0]
    );

    expect(() => parseNationalRankingDataset(duplicateReference)).toThrow(
      "duplicate source reference"
    );
  });

  it("requires each result to reference a known edition", () => {
    const dataset = createValidDataset();
    dataset.results[0].editionKey = "unknown-edition";

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "result references an unknown edition"
    );
  });

  it("requires every non-null result club to be known", () => {
    const dataset = createValidDataset();
    dataset.results[1].clubSlug = "unknown-club";

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "result references an unknown club"
    );
  });

  it("requires verified results to reference a known non-null club", () => {
    const dataset = createValidDataset();
    dataset.results[0].clubSlug = null;

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "verified result must reference a known club"
    );
  });

  it.each([
    ["stage", "finalist", "dataset.results[0].stage must be one of:"],
    [
      "qualityStatus",
      "pending",
      "dataset.results[0].qualityStatus must be one of: verified, unresolved, missing, did_not_enter",
    ],
  ])("validates the result %s union", (field, value, message) => {
    const dataset = createValidDataset();
    Object.assign(dataset.results[0], { [field]: value });

    expect(() => parseNationalRankingDataset(dataset)).toThrow(message);
  });

  it("validates result strings while permitting empty team labels and notes", () => {
    const dataset = createValidDataset();
    dataset.results[0].sourceTeamName = "";

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "dataset.results[0].sourceTeamName must be a non-empty string"
    );
  });

  it("requires every result source reference to belong to its edition", () => {
    const dataset = createValidDataset();
    dataset.results[0].sourceRef = "unrelated/2025/men.pdf#page=1";

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "result sourceRef is not listed by its edition"
    );
  });

  it("rejects duplicate result natural identities", () => {
    const dataset = createValidDataset();
    dataset.results.push({ ...dataset.results[0] });

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "duplicate result identity"
    );
  });
});

describe("loadNationalRankingDataset", () => {
  const expectedCounts = {
    "yanggu-2023-men": 98,
    "yanggu-2023-women": 91,
    "yanggu-2024-men": 89,
    "yanggu-2024-women": 73,
    "yanggu-2025-men": 94,
    "yanggu-2025-women": 73,
    "inje-2023-men": 18,
    "inje-2023-women": 10,
    "inje-2024-men": 20,
    "inje-2024-women": 10,
    "inje-2025-men": 20,
    "inje-2025-women": 12,
  } as const;

  it("loads the verified Yanggu and Inje source manifest", () => {
    const dataset = loadNationalRankingDataset();
    const selected = dataset.editions.filter((edition) =>
      ["yanggu", "inje"].includes(edition.tournamentSlug)
    );
    const clubs = new Set(dataset.clubs.map((club) => club.slug));

    expect(dataset.version).toBe("sources-2026-07-12-v1");
    expect(dataset.tournaments).toEqual([
      { slug: "yanggu", name: "국토정중앙배(양구)", scope: "national", scopeFactor: 1 },
      { slug: "gyeongin", name: "경인지구 연맹전", scope: "regional", scopeFactor: 0.85 },
      { slug: "inje", name: "하늘내린인제", scope: "national", scopeFactor: 1 },
      { slug: "chuncheon", name: "춘천소양강배", scope: "national", scopeFactor: 1 },
      { slug: "wemix", name: "WEMIX OPEN", scope: "national", scopeFactor: 1 },
    ]);
    expect(dataset.editions.map((edition) => edition.key).sort()).toEqual(
      Object.keys(expectedCounts).sort()
    );
    expect(selected).toHaveLength(12);
    expect(new Set(selected.map((edition) => edition.gender))).toEqual(
      new Set(["men", "women"])
    );
    expect(selected.every((edition) => edition.sourceRefs.length > 0)).toBe(true);

    for (const [editionKey, expectedCount] of Object.entries(expectedCounts)) {
      const edition = selected.find(({ key }) => key === editionKey);
      const results = dataset.results.filter(
        (result) => result.editionKey === editionKey
      );

      expect(edition?.actualEntrants, editionKey).toBe(expectedCount);
      expect(results, editionKey).toHaveLength(expectedCount);
    }

    expect(dataset.results).toHaveLength(608);
    expect(
      dataset.editions.flatMap((edition) => edition.sourceRefs).every(
        (sourceRef) => !sourceRef.startsWith("/") && !sourceRef.includes(":\\")
      )
    ).toBe(true);
    expect(JSON.stringify(dataset)).not.toMatch(/\/Users\/|[A-Za-z]:\\\\/);
    const unanchoredPdfRefs = {
      editions: dataset.editions.flatMap((edition) =>
        edition.sourceRefs.filter(
          (sourceRef) => sourceRef.includes(".pdf") && !/#page=\d+$/.test(sourceRef)
        )
      ),
      results: dataset.results
        .map((result) => result.sourceRef)
        .filter(
          (sourceRef) => sourceRef.includes(".pdf") && !/#page=\d+$/.test(sourceRef)
        ),
    };

    expect(unanchoredPdfRefs).toEqual({ editions: [], results: [] });
    expect(
      dataset.results.every((result) =>
        result.qualityStatus === "verified"
          ? result.clubSlug !== null && clubs.has(result.clubSlug)
          : result.clubSlug === null
      )
    ).toBe(true);
    expect(() => parseNationalRankingDataset(dataset)).not.toThrow();
    expect(() => calculateNationalRankings(dataset)).not.toThrow();
  });

  it("keeps 경기대학교 Kft distinct from KTF", () => {
    const dataset = loadNationalRankingDataset();
    const clubSlugs = new Set(dataset.clubs.map((club) => club.slug));
    const kftAliases = dataset.aliases
      .filter((alias) => alias.normalizedAlias.startsWith("경기대학교 kft "))
      .map(({ normalizedAlias, clubSlug }) => ({ normalizedAlias, clubSlug }));
    const kftResults = dataset.results
      .filter(
        (result) =>
          result.editionKey === "yanggu-2024-women" &&
          ["Kft A", "Kft B"].includes(result.sourceTeamName)
      )
      .map(({ sourceTeamName, clubSlug }) => ({ sourceTeamName, clubSlug }))
      .sort((left, right) => left.sourceTeamName.localeCompare(right.sourceTeamName));

    expect(
      ["gyeonggi-ktf", "gyeonggi-kft"].filter((slug) => !clubSlugs.has(slug))
    ).toEqual([]);
    expect(kftAliases).toEqual([
      { normalizedAlias: "경기대학교 kft a", clubSlug: "gyeonggi-kft" },
      { normalizedAlias: "경기대학교 kft b", clubSlug: "gyeonggi-kft" },
    ]);
    expect(kftResults).toEqual([
      { sourceTeamName: "Kft A", clubSlug: "gyeonggi-kft" },
      { sourceTeamName: "Kft B", clubSlug: "gyeonggi-kft" },
    ]);
  });

  it("keeps 연세대학교 쿠크리스 distinct from 쿠크다스", () => {
    const dataset = loadNationalRankingDataset();
    const clubSlugs = new Set(dataset.clubs.map((club) => club.slug));
    const kookrisAliases = dataset.aliases
      .filter((alias) => alias.normalizedAlias.startsWith("연세대학교 쿠크리스 "))
      .map(({ normalizedAlias, clubSlug }) => ({ normalizedAlias, clubSlug }));
    const kookrisResults = dataset.results
      .filter(
        (result) =>
          result.editionKey === "yanggu-2024-women" &&
          ["쿠크리스 A", "쿠크리스 B"].includes(result.sourceTeamName)
      )
      .map(({ sourceTeamName, clubSlug }) => ({ sourceTeamName, clubSlug }))
      .sort((left, right) => left.sourceTeamName.localeCompare(right.sourceTeamName));

    expect(
      ["yonsei-kookdas", "yonsei-kookris"].filter((slug) => !clubSlugs.has(slug))
    ).toEqual([]);
    expect(kookrisAliases).toEqual([
      { normalizedAlias: "연세대학교 쿠크리스 a", clubSlug: "yonsei-kookris" },
      { normalizedAlias: "연세대학교 쿠크리스 b", clubSlug: "yonsei-kookris" },
    ]);
    expect(kookrisResults).toEqual([
      { sourceTeamName: "쿠크리스 A", clubSlug: "yonsei-kookris" },
      { sourceTeamName: "쿠크리스 B", clubSlug: "yonsei-kookris" },
    ]);
  });
});
