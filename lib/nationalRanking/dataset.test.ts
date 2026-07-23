import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

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
        actualEntrants: 2,
        sourceStatus: "verified",
        sourceRefs: ["national/2025/men.pdf#page=1"],
      },
      {
        key: "regional-open-2025-women",
        tournamentSlug: "regional-open",
        year: 2025,
        gender: "women",
        actualEntrants: 16,
        sourceStatus: "unresolved",
        sourceRefs: ["regional/2025/women.pdf#page=2"],
      },
    ],
    results: [
      {
        editionKey: "national-open-2025-men",
        clubSlug: "alpha-tennis",
        sourceTeamName: "Alpha Tennis A",
        teamLabel: "A",
        sourceEntryId: undefined as string | undefined,
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
        sourceEntryId: undefined as string | undefined,
        stage: "runner_up",
        qualityStatus: "unresolved",
        sourceRef: "regional/2025/women.pdf#page=2",
        note: "Club identity is ambiguous.",
      },
      {
        editionKey: "national-open-2025-men",
        clubSlug: "beta-tennis",
        sourceTeamName: "Beta Tennis A",
        teamLabel: "A",
        sourceEntryId: undefined as string | undefined,
        stage: "runner_up",
        qualityStatus: "verified",
        sourceRef: "national/2025/men.pdf#page=1",
        note: "",
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

  it("allows an empty club name when the university team has no separate club name", () => {
    const input = createValidDataset();
    input.clubs[0] = {
      ...input.clubs[0],
      clubName: "",
      displayName: "Alpha University",
    };

    const dataset = parseNationalRankingDataset(input);

    expect(dataset.clubs[0]).toMatchObject({
      universityName: "Alpha University",
      clubName: "",
      displayName: "Alpha University",
    });
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

  it("requires verified edition entrant counts to match imported participants", () => {
    const dataset = createValidDataset();
    dataset.editions[0].actualEntrants = 3;

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "verified edition actualEntrants must match imported participant rows"
    );
  });

  it("requires exactly one champion and runner-up in every verified edition", () => {
    const dataset = createValidDataset();
    dataset.results[2].stage = "champion";

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "verified edition must contain exactly one champion and one runner-up"
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

  it("retains an unresolved source row whose terminal stage is unknown", () => {
    const dataset = createValidDataset();
    Object.assign(dataset.results[1], { stage: null });

    expect(parseNationalRankingDataset(dataset).results[1]?.stage).toBeNull();
  });

  it("requires a terminal stage before a result can be verified", () => {
    const dataset = createValidDataset();
    Object.assign(dataset.results[0], { stage: null });

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "dataset.results[0].stage: verified result must include a terminal stage"
    );
  });

  it("validates result strings while permitting empty team labels and notes", () => {
    const dataset = createValidDataset();
    dataset.results[0].sourceTeamName = "";

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "dataset.results[0].sourceTeamName must be a non-empty string"
    );
  });

  it("requires every result source reference to exactly match its edition", () => {
    const dataset = createValidDataset();
    dataset.results[0].sourceRef = "unrelated/2025/men.pdf#page=1";

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "result sourceRef is not listed by its edition"
    );
  });

  it("rejects a result page that only shares an edition source-ref prefix", () => {
    const dataset = createValidDataset();
    dataset.results[0].sourceRef = "national/2025/men.pdf#page=10";

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      'national/2025/men.pdf#page=10: result sourceRef is not listed by its edition "national-open-2025-men"'
    );
  });

  it("rejects identical result labels without distinct source entry IDs", () => {
    const dataset = createValidDataset();
    dataset.results.push({ ...dataset.results[0] });

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "duplicate result identity"
    );
  });

  it("accepts identical result labels with distinct source entry IDs", () => {
    const dataset = createValidDataset();
    dataset.editions[0].actualEntrants = 3;
    Object.assign(dataset.results[0], {
      sourceEntryId: "slot-35",
      stage: "semifinal",
    });
    dataset.results.push({
      ...dataset.results[0],
      sourceEntryId: "slot-46",
      stage: "champion",
    });

    expect(() => parseNationalRankingDataset(dataset)).not.toThrow();
  });

  it("rejects identical result labels when one source entry ID is missing", () => {
    const dataset = createValidDataset();
    dataset.results.push({
      ...dataset.results[0],
      sourceEntryId: "slot-46",
    });

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "repeated visible result identity requires unique sourceEntryId values"
    );
  });

  it("rejects duplicate source entry IDs for identical result labels", () => {
    const dataset = createValidDataset();
    Object.assign(dataset.results[0], { sourceEntryId: "slot-35" });
    dataset.results.push({
      ...dataset.results[0],
      sourceEntryId: "slot-35",
    });

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "duplicate result identity"
    );
  });

  it("requires source entry IDs to be non-empty when present", () => {
    const dataset = createValidDataset();
    Object.assign(dataset.results[0], { sourceEntryId: "" });

    expect(() => parseNationalRankingDataset(dataset)).toThrow(
      "dataset.results[0].sourceEntryId must be a non-empty string"
    );
  });
});

describe("loadNationalRankingDataset", () => {
  const priorExpectedCounts = {
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

  const expectedEditions = {
    ...Object.fromEntries(
      Object.entries(priorExpectedCounts).map(([key, actualEntrants]) => [
        key,
        { actualEntrants, resultCount: actualEntrants, sourceStatus: "verified" },
      ])
    ),
    "gyeongin-2023-men": {
      actualEntrants: 42,
      resultCount: 42,
      sourceStatus: "verified",
    },
    "gyeongin-2023-women": {
      actualEntrants: 32,
      resultCount: 32,
      sourceStatus: "verified",
    },
    "gyeongin-2024-men": {
      actualEntrants: 48,
      resultCount: 48,
      sourceStatus: "unresolved",
    },
    "gyeongin-2024-women": {
      actualEntrants: 38,
      resultCount: 38,
      sourceStatus: "verified",
    },
    "gyeongin-2025-men": {
      actualEntrants: 22,
      resultCount: 22,
      sourceStatus: "verified",
    },
    "gyeongin-2025-women": {
      actualEntrants: 26,
      resultCount: 26,
      sourceStatus: "verified",
    },
    "chuncheon-2023-men": {
      actualEntrants: 50,
      resultCount: 50,
      sourceStatus: "verified",
    },
    "chuncheon-2023-women": {
      actualEntrants: 42,
      resultCount: 42,
      sourceStatus: "verified",
    },
    "chuncheon-2024-men": {
      actualEntrants: 68,
      resultCount: 68,
      sourceStatus: "verified",
    },
    "chuncheon-2024-women": {
      actualEntrants: 34,
      resultCount: 34,
      sourceStatus: "verified",
    },
    "chuncheon-2025-men": {
      actualEntrants: 58,
      resultCount: 58,
      sourceStatus: "verified",
    },
    "chuncheon-2025-women": {
      actualEntrants: 28,
      resultCount: 28,
      sourceStatus: "verified",
    },
    "wemix-2025-men": {
      actualEntrants: 8,
      resultCount: 8,
      sourceStatus: "verified",
    },
    "wemix-2025-women": {
      actualEntrants: 12,
      resultCount: 12,
      sourceStatus: "verified",
    },
  } as const;

  it("loads the complete 26-edition source manifest", () => {
    const dataset = loadNationalRankingDataset();
    const clubs = new Set(dataset.clubs.map((club) => club.slug));

    expect(dataset.version).toBe("sources-2026-07-23-v6");
    expect(dataset.tournaments).toEqual([
      { slug: "yanggu", name: "국토정중앙배(양구)", scope: "national", scopeFactor: 1 },
      { slug: "gyeongin", name: "경인지구 연맹전", scope: "regional", scopeFactor: 0.85 },
      { slug: "inje", name: "하늘내린인제", scope: "national", scopeFactor: 1 },
      { slug: "chuncheon", name: "춘천소양강배", scope: "national", scopeFactor: 1 },
      { slug: "wemix", name: "WEMIX OPEN", scope: "national", scopeFactor: 1 },
    ]);
    expect(dataset.editions.map((edition) => edition.key).sort()).toEqual(
      Object.keys(expectedEditions).sort()
    );
    expect(dataset.editions).toHaveLength(26);
    expect(
      dataset.editions.some((edition) => edition.tournamentSlug === "yeongwol")
    ).toBe(false);
    const wemixEditions = dataset.editions.filter(
      (edition) => edition.tournamentSlug === "wemix"
    );
    expect(wemixEditions).toHaveLength(2);
    expect(wemixEditions.every((edition) => edition.year === 2025)).toBe(true);
    expect(new Set(dataset.editions.map((edition) => edition.gender))).toEqual(
      new Set(["men", "women"])
    );
    expect(dataset.editions.every((edition) => edition.sourceRefs.length > 0)).toBe(
      true
    );

    for (const [editionKey, expected] of Object.entries(expectedEditions)) {
      const edition = dataset.editions.find(({ key }) => key === editionKey);
      const results = dataset.results.filter(
        (result) => result.editionKey === editionKey
      );

      expect(edition?.actualEntrants, editionKey).toBe(expected.actualEntrants);
      expect(edition?.sourceStatus, editionKey).toBe(expected.sourceStatus);
      expect(results, editionKey).toHaveLength(expected.resultCount);
    }

    expect(dataset.clubs).toHaveLength(63);
    expect(dataset.aliases).toHaveLength(274);
    expect(dataset.results).toHaveLength(1_116);
    expect(
      dataset.results.filter((result) => result.qualityStatus === "verified")
    ).toHaveLength(537);
    expect(
      dataset.results.filter((result) => result.qualityStatus === "unresolved")
    ).toHaveLength(579);

    expect(
      dataset.results.find(
        (result) =>
          result.editionKey === "gyeongin-2024-men" &&
          result.sourceTeamName === "DUTC A팀"
      )
    ).toMatchObject({
      clubSlug: null,
      stage: null,
      qualityStatus: "unresolved",
    });

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
      dataset.results.every(
        (result) => result.clubSlug === null || clubs.has(result.clubSlug)
      )
    ).toBe(true);
    expect(
      dataset.results
        .filter((result) => result.qualityStatus === "verified")
        .every((result) => result.clubSlug !== null)
    ).toBe(true);
    expect(() => parseNationalRankingDataset(dataset)).not.toThrow();
    expect(() => calculateNationalRankings(dataset)).not.toThrow();
  });

  it("preserves the exact approved Task 4 ordered content", () => {
    const dataset = loadNationalRankingDataset();
    const priorEditionKeys = new Set(Object.keys(priorExpectedCounts));
    const approvedTask4 = {
      clubs: dataset.clubs.slice(0, 53),
      aliases: dataset.aliases.slice(0, 151),
      editions: dataset.editions.filter((edition) =>
        priorEditionKeys.has(edition.key)
      ),
      results: dataset.results.filter((result) =>
        priorEditionKeys.has(result.editionKey)
      ),
    };
    // Re-baselined after applying the affiliation audit's confirmed official labels.
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(approvedTask4))
      .digest("hex");

    expect(approvedTask4.clubs).toHaveLength(53);
    expect(approvedTask4.aliases).toHaveLength(151);
    expect(approvedTask4.editions).toHaveLength(12);
    expect(approvedTask4.results).toHaveLength(608);
    expect(fingerprint).toBe(
      "3c4a3cf81faf806fceea2e819591d784bd6e2d5c002128d2f367807e5fd651cf"
    );

    for (const [editionKey, expectedCount] of Object.entries(priorExpectedCounts)) {
      expect(
        dataset.results.filter((result) => result.editionKey === editionKey),
        editionKey
      ).toHaveLength(expectedCount);
    }
  });

  it("keeps the remaining unresolved source conflict out of scoring", () => {
    const dataset = loadNationalRankingDataset();
    const unresolvedEditionKeys = new Set(["gyeongin-2024-men"]);
    const rankings = calculateNationalRankings(dataset);

    expect(
      dataset.editions
        .filter((edition) => unresolvedEditionKeys.has(edition.key))
        .every((edition) => edition.sourceStatus === "unresolved")
    ).toBe(true);
    expect(
      rankings.rows
        .flatMap((row) => row.contributions)
        .some((contribution) =>
          unresolvedEditionKeys.has(contribution.editionKey)
        )
    ).toBe(false);
    expect(
      dataset.results.find(
        (result) =>
          result.editionKey === "gyeongin-2024-men" &&
          result.sourceTeamName === "DUTC A팀"
      )
    ).toMatchObject({
      stage: null,
      qualityStatus: "unresolved",
    });
  });

  it("verifies every WEMIX result against the supplied 8-team and 12-team draws", () => {
    const dataset = loadNationalRankingDataset();
    const wemixResults = dataset.results.filter((result) =>
      result.editionKey.startsWith("wemix-2025-")
    );

    expect(wemixResults).toHaveLength(20);
    expect(
      wemixResults.every(
        (result) =>
          result.clubSlug !== null && result.qualityStatus === "verified"
      )
    ).toBe(true);
    expect(
      wemixResults.find(
        (result) =>
          result.editionKey === "wemix-2025-men" &&
          result.stage === "champion"
      )
    ).toMatchObject({
      sourceTeamName: "서울대학교",
      clubSlug: "seoul-university",
    });
    expect(
      wemixResults.find(
        (result) =>
          result.editionKey === "wemix-2025-women" &&
          result.stage === "champion"
      )
    ).toMatchObject({
      sourceTeamName: "과기대 느티나무 (1차우...",
      clubSlug: "seoultech-neutinamu",
    });
  });

  it("maps the KtcJtc source team to Gyeongsang National University's joint team", () => {
    const dataset = loadNationalRankingDataset();

    expect(dataset.clubs).toContainEqual({
      slug: "gyeongsang-ktc-jtc",
      universityName: "경상국립대학교",
      clubName: "가좌 KTC·칠암 JTC 연합팀",
      displayName: "경상국립대학교 가좌 KTC·칠암 JTC 연합팀",
    });
    expect(
      dataset.aliases.find((alias) => alias.sourceLabel === "KtcJtc")
    ).toMatchObject({
      clubSlug: "gyeongsang-ktc-jtc",
      normalizedAlias: "경상국립대학교 ktc jtc",
    });
    expect(
      dataset.results.find((result) => result.sourceTeamName === "KtcJtc")
    ).toMatchObject({
      editionKey: "yanggu-2024-men",
      clubSlug: "gyeongsang-ktc-jtc",
    });
    expect(
      dataset.clubs.some((club) => club.slug === "gangneung-ktcjtc")
    ).toBe(false);
  });

  it("uses every confirmed campus, college, department, and official club name", () => {
    const dataset = loadNationalRankingDataset();
    const clubsBySlug = new Map(
      dataset.clubs.map((club) => [club.slug, club])
    );
    const confirmedLabels = {
      "catholic-courtrang": [
        "가톨릭대학교 성심교정",
        "코트랑",
        "가톨릭대학교 성심교정 코트랑",
      ],
      "chungang-love4t": [
        "중앙대학교 서울캠퍼스",
        "LOVE4T",
        "중앙대학교 서울캠퍼스 LOVE4T",
      ],
      "dongguk-dutc": [
        "동국대학교 서울캠퍼스",
        "DUTC",
        "동국대학교 서울캠퍼스 DUTC",
      ],
      "ewha-smash": [
        "이화여자대학교 체육과학부",
        "SMASH",
        "이화여자대학교 체육과학부 SMASH",
      ],
      "gachon-tiebreak": [
        "가천대학교 글로벌캠퍼스",
        "타이브레이크",
        "가천대학교 글로벌캠퍼스 타이브레이크",
      ],
      "gyeongsang-ktc-jtc": [
        "경상국립대학교",
        "가좌 KTC·칠암 JTC 연합팀",
        "경상국립대학교 가좌 KTC·칠암 JTC 연합팀",
      ],
      "gangwon-shot": [
        "강원대학교 삼척캠퍼스",
        "SHOT",
        "강원대학교 삼척캠퍼스 SHOT",
      ],
      "gyeonggi-ktf": [
        "경기대학교 수원캠퍼스",
        "KTF",
        "경기대학교 수원캠퍼스 KTF",
      ],
      "hanbat-masters": [
        "국립한밭대학교",
        "마스터즈",
        "국립한밭대학교 마스터즈",
      ],
      "hanyang-erica-hitec": [
        "한양대학교 ERICA캠퍼스",
        "HiTEC",
        "한양대학교 ERICA캠퍼스 HiTEC",
      ],
      "hanyang-hytc": [
        "한양대학교 서울캠퍼스",
        "HYTC",
        "한양대학교 서울캠퍼스 HYTC",
      ],
      "hongik-hitc": [
        "홍익대학교 서울캠퍼스",
        "HITC",
        "홍익대학교 서울캠퍼스 HITC",
      ],
      "inha-rapum": [
        "인하대학교 중앙동아리",
        "라품",
        "인하대학교 중앙동아리 라품",
      ],
      "knsu-alley": [
        "한국체육대학교 사회체육학과",
        "ALLEY",
        "한국체육대학교 사회체육학과 ALLEY",
      ],
      "kaist-stroke": [
        "KAIST 학부",
        "STROKE",
        "KAIST 학부 STROKE",
      ],
      "konkuk-ktc": [
        "건국대학교 서울캠퍼스",
        "KTC",
        "건국대학교 서울캠퍼스 KTC",
      ],
      "korea-kutc": ["고려대학교", "KUTC", "고려대학교 KUTC"],
      "korea-petc": [
        "고려대학교 체육교육과",
        "PETC",
        "고려대학교 체육교육과 PETC",
      ],
      "kyunghee-global-impact": [
        "경희대학교 국제캠퍼스 공과대학",
        "IMPACT",
        "경희대학교 국제캠퍼스 공과대학 IMPACT",
      ],
      "kyunghee-global-luvis": [
        "경희대학교 국제캠퍼스",
        "LOVICE(러비스)",
        "경희대학교 국제캠퍼스 LOVICE(러비스)",
      ],
      "uos-approach": [
        "서울시립대학교",
        "UOSTC(어프로치)",
        "서울시립대학교 UOSTC(어프로치)",
      ],
      "yonsei-kookdas": [
        "연세대학교 상경·경영대학",
        "쿠크다스",
        "연세대학교 상경·경영대학 쿠크다스",
      ],
      "yonsei-yutt": [
        "연세대학교 신촌캠퍼스",
        "YUTT",
        "연세대학교 신촌캠퍼스 YUTT",
      ],
      "chungbuk-ace": ["충북대학교", "ACE", "충북대학교 ACE"],
      "dankook-ace": [
        "단국대학교 천안캠퍼스 치과대학",
        "ACE",
        "단국대학교 천안캠퍼스 치과대학 ACE",
      ],
      "gangneung-wonju-love": [
        "강원대학교 강릉캠퍼스",
        "LOVE",
        "강원대학교 강릉캠퍼스 LOVE",
      ],
      "korea-kmtc": [
        "고려대학교 의과대학",
        "KMTC",
        "고려대학교 의과대학 KMTC",
      ],
      "kumoh-kotc": [
        "국립금오공과대학교",
        "KOTC",
        "국립금오공과대학교 KOTC",
      ],
      "namseoul-winning-shot": [
        "남서울대학교 스포츠건강관리학과",
        "위닝샷",
        "남서울대학교 스포츠건강관리학과 위닝샷",
      ],
      "sangmyung-tesla": [
        "상명대학교 서울캠퍼스",
        "TESLA",
        "상명대학교 서울캠퍼스 TESLA",
      ],
      "seoul-university": [
        "서울대학교 운동부",
        "테니스부",
        "서울대학교 운동부 테니스부",
      ],
      "seoul-tnt": [
        "서울대학교 경영대학",
        "TNT",
        "서울대학교 경영대학 TNT",
      ],
      "ajou-tennis": ["아주대학교", "ATC", "아주대학교 ATC"],
    } as const;

    for (const [slug, [universityName, clubName, displayName]] of Object.entries(
      confirmedLabels
    )) {
      expect(clubsBySlug.get(slug), slug).toEqual({
        slug,
        universityName,
        clubName,
        displayName,
      });
    }
  });

  it("uses source entry IDs only for the independently slotted clipped entries", () => {
    const dataset = loadNationalRankingDataset();

    expect(
      dataset.results
        .filter((result) => result.sourceEntryId !== undefined)
        .map((result) => ({
          editionKey: result.editionKey,
          sourceTeamName: result.sourceTeamName,
          teamLabel: result.teamLabel,
          sourceEntryId: result.sourceEntryId,
        }))
    ).toEqual([
      {
        editionKey: "gyeongin-2024-men",
        sourceTeamName: "한국항공대학교 ACE...",
        teamLabel: "",
        sourceEntryId: "slot-35",
      },
      {
        editionKey: "gyeongin-2024-men",
        sourceTeamName: "한국항공대학교 ACE...",
        teamLabel: "",
        sourceEntryId: "slot-46",
      },
    ]);
  });

  it("has exactly one champion and runner-up record in every verified edition", () => {
    const dataset = loadNationalRankingDataset();

    for (const edition of dataset.editions.filter(
      ({ sourceStatus }) => sourceStatus === "verified"
    )) {
      const results = dataset.results.filter(
        (result) => result.editionKey === edition.key
      );

      expect(
        results.filter((result) => result.stage === "champion"),
        `${edition.key} champion`
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.stage === "runner_up"),
        `${edition.key} runner-up`
      ).toHaveLength(1);
    }
  });

  it("uses exact relative source refs listed by each edition", () => {
    const dataset = loadNationalRankingDataset();
    const editionsByKey = new Map(
      dataset.editions.map((edition) => [edition.key, edition])
    );

    for (const result of dataset.results) {
      expect(
        editionsByKey.get(result.editionKey)?.sourceRefs,
        `${result.editionKey}: ${result.sourceRef}`
      ).toContain(result.sourceRef);
    }

    for (const sourceRef of dataset.editions.flatMap(
      (edition) => edition.sourceRefs
    )) {
      for (const referencePart of sourceRef.split("; ")) {
        const relativePath = referencePart.split("#", 1)[0];

        expect(relativePath.startsWith("/"), sourceRef).toBe(false);
        expect(relativePath.includes(":\\"), sourceRef).toBe(false);
      }
    }
  });

  it.skipIf(!process.env.NATIONAL_RANKING_SOURCE_ROOT)(
    "resolves every source file when NATIONAL_RANKING_SOURCE_ROOT is set",
    () => {
      const sourceRoot = process.env.NATIONAL_RANKING_SOURCE_ROOT;
      if (!sourceRoot) throw new Error("NATIONAL_RANKING_SOURCE_ROOT is required");
      const dataset = loadNationalRankingDataset();

      for (const sourceRef of dataset.editions.flatMap(
        (edition) => edition.sourceRefs
      )) {
        for (const referencePart of sourceRef.split("; ")) {
          const relativePath = referencePart.split("#", 1)[0];

          expect(existsSync(resolve(sourceRoot, relativePath)), sourceRef).toBe(
            true
          );
        }
      }
    }
  );

  it("keeps 고려대학교 KUTC, PETC, and KMTC distinct", () => {
    const dataset = loadNationalRankingDataset();
    const koreaClubs = dataset.clubs.filter((club) =>
      ["korea-kutc", "korea-petc", "korea-kmtc"].includes(club.slug)
    );

    expect(koreaClubs).toEqual([
      {
        slug: "korea-kutc",
        universityName: "고려대학교",
        clubName: "KUTC",
        displayName: "고려대학교 KUTC",
      },
      {
        slug: "korea-petc",
        universityName: "고려대학교 체육교육과",
        clubName: "PETC",
        displayName: "고려대학교 체육교육과 PETC",
      },
      {
        slug: "korea-kmtc",
        universityName: "고려대학교 의과대학",
        clubName: "KMTC",
        displayName: "고려대학교 의과대학 KMTC",
      },
    ]);
    expect(
      dataset.results.find(
        (result) =>
          result.editionKey === "chuncheon-2023-men" &&
          result.sourceTeamName === "고려대 KMTC"
      )?.clubSlug
    ).toBe("korea-kmtc");
  });

  it("merges every administrator-confirmed club alias into its canonical club", () => {
    const dataset = loadNationalRankingDataset();
    const clubSlugs = new Set(dataset.clubs.map((club) => club.slug));
    const canonicalMerges = new Map([
      ["gyeonggi-kft", "gyeonggi-ktf"],
      ["gyeonggi-tetonam", "gyeonggi-ktf"],
      ["dankook-cheonan-hodu", "dankook-cheonan-dkutc"],
      ["dankook-jukjeon-danwoong", "dankook-jukjeon-dkutc"],
      ["dankook-jukjeon-woongbi", "dankook-jukjeon-dkutc"],
      ["sungkyunkwan-gongja", "sungkyunkwan-stc"],
      ["sungkyunkwan-mengja", "sungkyunkwan-stc"],
      ["sungkyunkwan-sit", "sungkyunkwan-stc"],
      ["sungkyunkwan-soonja", "sungkyunkwan-stc"],
      ["yonsei-kookris", "yonsei-kookdas"],
      ["yonsei-freedom", "yonsei-yutt"],
      ["yonsei-justice", "yonsei-yutt"],
      ["yonsei-the-true-truth", "yonsei-yutt"],
      ["yonsei-truth", "yonsei-yutt"],
      ["inha-rakoon", "inha-rapum"],
      ["inha-biryong", "inha-rapum"],
      ["chungang-puangi", "chungang-love4t"],
      ["chungang-pureongi", "chungang-love4t"],
      ["kau-songgolmae", "kau-ace"],
      ["hanyang-blue", "hanyang-hytc"],
      ["hanyang-lion", "hanyang-hytc"],
      ["hongik-hongilboy", "hongik-hitc"],
      ["chungnam-kotshot", "chungnam-goodshot"],
      ["catholic-badboys", "catholic-courtrang"],
      ["sogang-brg", "sogang-sgtc"],
      ["sogang-fa", "sogang-sgtc"],
      ["soongsil-dickhorse", "soongsil-sstc"],
      ["jeonbuk-ace-korean", "jeonbuk-ace"],
    ]);

    expect(
      [...canonicalMerges.keys()].filter((slug) => clubSlugs.has(slug))
    ).toEqual([]);
    expect(
      dataset.aliases.some((alias) => canonicalMerges.has(alias.clubSlug))
    ).toBe(false);
    expect(
      dataset.results.some(
        (result) =>
          result.clubSlug !== null && canonicalMerges.has(result.clubSlug)
      )
    ).toBe(false);

    const representativeResults = [
      ["Kft A", "gyeonggi-ktf"],
      ["경기대 테토남", "gyeonggi-ktf"],
      ["단국대 호두", "dankook-cheonan-dkutc"],
      ["단국대 단웅팀", "dankook-jukjeon-dkutc"],
      ["성균관대학교 공자", "sungkyunkwan-stc"],
      ["쿠크리스 A", "yonsei-kookdas"],
      ["연세대자유", "yonsei-yutt"],
      ["라쿤", "inha-rapum"],
      ["중앙대 푸앙이", "chungang-love4t"],
      ["한국항공대 송골매", "kau-ace"],
      ["한양대 블루", "hanyang-hytc"],
      ["홍익대 홍일보이", "hongik-hitc"],
      ["충남대콧샷 A", "chungnam-goodshot"],
      ["가톨릭대 Badboys", "catholic-courtrang"],
      ["서강대 Brg", "sogang-sgtc"],
      ["숭실대 디크호스", "soongsil-sstc"],
      ["전북대 에이스", "jeonbuk-ace"],
    ] as const;

    for (const [sourceTeamName, canonicalSlug] of representativeResults) {
      expect(
        dataset.results.some(
          (result) =>
            result.sourceTeamName === sourceTeamName &&
            result.clubSlug === canonicalSlug
        ),
        sourceTeamName
      ).toBe(true);
    }
  });

  it("keeps Dankook DKUTC split by campus and freezes legacy rows by gender", () => {
    const dataset = loadNationalRankingDataset();
    const editionsByKey = new Map(
      dataset.editions.map((edition) => [edition.key, edition])
    );

    expect(dataset.clubs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "dankook-cheonan-dkutc",
          universityName: "단국대학교 천안캠퍼스",
        }),
        expect.objectContaining({
          slug: "dankook-jukjeon-dkutc",
          universityName: "단국대학교 죽전캠퍼스",
        }),
      ])
    );
    expect(dataset.clubs.some((club) => club.slug === "dankook-dkutc")).toBe(
      false
    );

    const legacyRows = dataset.results.filter((result) =>
      ["Dkutc A", "Dkutc B", "단국대학교 DKUTC", "단국대 DKUTC", "단국대 DKUTC C"].includes(
        result.sourceTeamName
      )
    );

    for (const result of legacyRows) {
      const gender = editionsByKey.get(result.editionKey)?.gender;
      expect(result.clubSlug).toBe(
        gender === "women"
          ? "dankook-cheonan-dkutc"
          : "dankook-jukjeon-dkutc"
      );
    }
  });

  it("keeps Seoul National University and TNT as separate clubs", () => {
    const dataset = loadNationalRankingDataset();

    expect(dataset.clubs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "seoul-university",
          universityName: "서울대학교 운동부",
          clubName: "테니스부",
          displayName: "서울대학교 운동부 테니스부",
        }),
        expect.objectContaining({
          slug: "seoul-tnt",
          universityName: "서울대학교 경영대학",
          clubName: "TNT",
          displayName: "서울대학교 경영대학 TNT",
        }),
      ])
    );

    const seoulResults = dataset.results.filter((result) =>
      /^(서울대|서울대학교)/.test(result.sourceTeamName)
    );

    expect(seoulResults.length).toBeGreaterThan(0);

    for (const result of seoulResults) {
      expect(result.clubSlug, result.sourceRef).toBe(
        /TNT/i.test(result.sourceTeamName)
          ? "seoul-tnt"
          : "seoul-university"
      );
      expect(result.qualityStatus, result.sourceRef).toBe("verified");
    }

    const menRows = calculateNationalRankings(dataset).rows.filter(
      (row) => row.gender === "men"
    );
    const universityRow = menRows.find(
      (row) => row.clubSlug === "seoul-university"
    );
    const tntRow = menRows.find((row) => row.clubSlug === "seoul-tnt");

    expect(universityRow?.contributions).not.toHaveLength(0);
    expect(
      universityRow?.contributions.every(
        (contribution) => !/TNT/i.test(contribution.sourceTeamName)
      )
    ).toBe(true);
    expect(tntRow?.contributions).not.toHaveLength(0);
    expect(
      tntRow?.contributions.every((contribution) =>
        /TNT/i.test(contribution.sourceTeamName)
      )
    ).toBe(true);
  });

  it("maps the reviewed 2023 Yanggu men's Round-of-16 field to canonical clubs", () => {
    const dataset = loadNationalRankingDataset();
    const expectedAssignments = new Map([
      ["경희 A [1]", "kyunghee-seoul-kuta"],
      ["연세대 진리 [Q]", "yonsei-yutt"],
      ["에리카 A [Q]", "hanyang-erica-hitec"],
      ["서울과기대 A [Q]", "seoultech-neutinamu"],
      ["가톨릭대 A [Q]", "catholic-courtrang"],
      ["서울시립대 장 [Q]", "uos-approach"],
      ["Hytc 피스 [Q]", "hanyang-hytc"],
      ["영남대a [Q]", "yeungnam-yuta"],
      ["카이스트 T [Q]", "kaist-stroke"],
      ["Dkuct 1 [Q]", "dankook-cheonan-dkutc"],
      ["쿠크다스 [Q]", "yonsei-kookdas"],
      ["전북대 A [3]", "jeonbuk-ace"],
      ["Dutc A [Q]", "dongguk-dutc"],
      ["세종대 A [Q]", "sejong-stc"],
      ["숭실대 A [Q]", "soongsil-sstc"],
      ["카이스트 S [Q]", "kaist-stroke"],
    ]);

    const reviewedResults = dataset.results.filter(
      (result) =>
        result.editionKey === "yanggu-2023-men" &&
        expectedAssignments.has(result.sourceTeamName)
    );

    expect(reviewedResults).toHaveLength(expectedAssignments.size);

    for (const result of reviewedResults) {
      expect(result.clubSlug, result.sourceTeamName).toBe(
        expectedAssignments.get(result.sourceTeamName)
      );
      expect(result.qualityStatus, result.sourceTeamName).toBe("verified");
    }
  });

  it("freezes every school-qualified final to the pre-assignment gender leader", () => {
    const dataset = loadNationalRankingDataset();
    const expectedAssignments = new Map([
      ["yanggu-2023-men|연세대 진리 [Q]", "yonsei-yutt"],
      ["yanggu-2023-men|전북대 A [3]", "jeonbuk-ace"],
      ["yanggu-2023-women|경희 A [1]", "kyunghee-luvis"],
      ["yanggu-2023-women|Sgtc A [2]", "sogang-sgtc"],
      ["yanggu-2024-women|경희대 국제 A [1]", "kyunghee-global-impact"],
      ["yanggu-2025-men|전북대 A", "jeonbuk-ace"],
      ["yanggu-2025-women|단국대 A", "dankook-cheonan-dkutc"],
      ["inje-2023-men|전북대", "jeonbuk-ace"],
      ["inje-2023-men|서울시립대", "uos-approach"],
      ["inje-2023-women|서울과기대 A [Q]", "seoultech-neutinamu"],
      ["inje-2023-women|서울대 [Q]", "seoul-university"],
      ["inje-2024-women|서울대 테니스부", "seoul-university"],
      ["inje-2025-men|전북대a", "jeonbuk-ace"],
      ["inje-2025-women|서울과학기술대 A", "seoultech-neutinamu"],
      ["inje-2025-women|카이스트 A", "kaist-stroke"],
      ["gyeongin-2023-men|서울대 A", "seoul-university"],
      ["gyeongin-2023-women|경희대s", "kyunghee-luvis"],
      ["gyeongin-2024-men|서울대학교 A", "seoul-university"],
      ["gyeongin-2024-men|아주대 A", "ajou-tennis"],
      ["gyeongin-2024-women|서울시립대A", "uos-approach"],
      ["gyeongin-2025-women|서울시립대A", "uos-approach"],
      ["gyeongin-2025-women|서울과기대A", "seoultech-neutinamu"],
      ["gyeongin-2025-men|서울대학교 테니스부 A", "seoul-university"],
      ["gyeongin-2025-men|서강대", "sogang-sgtc"],
      ["chuncheon-2023-men|서울대 A", "seoul-university"],
      ["chuncheon-2023-women|경희대 국제 A", "kyunghee-global-impact"],
      ["chuncheon-2023-women|숭실대 A", "soongsil-sstc"],
      ["chuncheon-2024-men|전북대A", "jeonbuk-ace"],
      ["chuncheon-2024-women|경희대 국제 A", "kyunghee-global-impact"],
      ["chuncheon-2025-men|서울시립대 장", "uos-approach"],
      ["chuncheon-2025-women|서강대A", "sogang-sgtc"],
    ]);

    for (const result of dataset.results) {
      const expectedClubSlug = expectedAssignments.get(
        `${result.editionKey}|${result.sourceTeamName}`
      );
      if (!expectedClubSlug) continue;

      expect(result.clubSlug, result.sourceRef).toBe(expectedClubSlug);
      expect(result.note, result.sourceRef).toMatch(/pre-assignment/i);
    }

    const unassignedFinals = dataset.results
      .filter(
        (result) =>
          result.clubSlug === null &&
          (result.stage === "champion" || result.stage === "runner_up")
      )
      .map((result) => result.sourceTeamName)
      .sort((left, right) => left.localeCompare(right, "ko"));

    expect(unassignedFinals).toEqual(["러비스 A", "A"]);
    expect(dataset.clubs).toContainEqual(
      expect.objectContaining({
        slug: "ajou-tennis",
        universityName: "아주대학교",
      })
    );
  });
});
