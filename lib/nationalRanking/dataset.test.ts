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
        actualEntrants: 32,
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
    Object.assign(dataset.results[0], { sourceEntryId: "slot-35" });
    dataset.results.push({
      ...dataset.results[0],
      sourceEntryId: "slot-46",
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
      resultCount: 47,
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
      sourceStatus: "unresolved",
    },
    "wemix-2025-women": {
      actualEntrants: 12,
      resultCount: 12,
      sourceStatus: "unresolved",
    },
  } as const;

  it("loads the complete 26-edition source manifest", () => {
    const dataset = loadNationalRankingDataset();
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

    expect(dataset.clubs).toHaveLength(90);
    expect(dataset.aliases).toHaveLength(274);
    expect(dataset.results).toHaveLength(1_115);
    expect(
      dataset.results.filter((result) => result.qualityStatus === "verified")
    ).toHaveLength(434);
    expect(
      dataset.results.filter((result) => result.qualityStatus === "unresolved")
    ).toHaveLength(681);

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
    // Generated from 27cb77b; this detects content or ordering drift without a fixture copy.
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(approvedTask4))
      .digest("hex");

    expect(approvedTask4.clubs).toHaveLength(53);
    expect(approvedTask4.aliases).toHaveLength(151);
    expect(approvedTask4.editions).toHaveLength(12);
    expect(approvedTask4.results).toHaveLength(608);
    expect(fingerprint).toBe(
      "32877ab82dc7a3a625077d9b80985c435de7c52ef96e3fc872a0d78fe6d47131"
    );

    for (const [editionKey, expectedCount] of Object.entries(priorExpectedCounts)) {
      expect(
        dataset.results.filter((result) => result.editionKey === editionKey),
        editionKey
      ).toHaveLength(expectedCount);
    }
  });

  it("keeps unresolved source conflicts out of scoring", () => {
    const dataset = loadNationalRankingDataset();
    const unresolvedEditionKeys = new Set([
      "gyeongin-2024-men",
      "wemix-2025-men",
      "wemix-2025-women",
    ]);
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
      dataset.results.some(
        (result) =>
          result.editionKey === "gyeongin-2024-men" &&
          result.sourceTeamName === "DUTC A팀"
      )
    ).toBe(false);
    expect(
      dataset.results.find(
        (result) =>
          result.editionKey === "wemix-2025-men" &&
          result.stage === "champion"
      )
    ).toMatchObject({
      sourceTeamName: "서울대학교",
      clubSlug: null,
      qualityStatus: "unresolved",
    });
    expect(
      dataset.results.find(
        (result) =>
          result.editionKey === "wemix-2025-women" &&
          result.stage === "champion"
      )
    ).toMatchObject({
      sourceTeamName: "과기대 느티나무 (1차우...",
      clubSlug: null,
      qualityStatus: "unresolved",
    });
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
    const koreaClubSlugs = new Set(
      dataset.clubs
        .filter((club) => club.universityName === "고려대학교")
        .map((club) => club.slug)
    );

    expect(koreaClubSlugs).toEqual(
      new Set(["korea-kutc", "korea-petc", "korea-kmtc"])
    );
    expect(
      dataset.results.find(
        (result) =>
          result.editionKey === "chuncheon-2023-men" &&
          result.sourceTeamName === "고려대 KMTC"
      )?.clubSlug
    ).toBe("korea-kmtc");
  });

  it("keeps 경기대학교 Kft distinct from incumbent KTF", () => {
    const dataset = loadNationalRankingDataset();
    const clubSlugs = new Set(dataset.clubs.map((club) => club.slug));
    const ktfAliases = dataset.aliases
      .filter((alias) => alias.clubSlug === "gyeonggi-ktf")
      .map(({ normalizedAlias, clubSlug }) => ({ normalizedAlias, clubSlug }));
    const kftAliases = dataset.aliases
      .filter((alias) => alias.normalizedAlias.startsWith("경기대학교 kft "))
      .map(({ normalizedAlias, clubSlug }) => ({ normalizedAlias, clubSlug }));
    const ktfResults = dataset.results
      .filter((result) => result.clubSlug === "gyeonggi-ktf")
      .map(({ sourceTeamName, clubSlug }) => ({ sourceTeamName, clubSlug }))
      .sort((left, right) => left.sourceTeamName.localeCompare(right.sourceTeamName));
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
    expect(ktfAliases).toEqual(
      expect.arrayContaining([
        { normalizedAlias: "경기대학교 경기대 ktf", clubSlug: "gyeonggi-ktf" },
        { normalizedAlias: "경기대학교 ktf 여", clubSlug: "gyeonggi-ktf" },
        { normalizedAlias: "경기대학교 ktf 정", clubSlug: "gyeonggi-ktf" },
        { normalizedAlias: "경기대학교 ktf 진", clubSlug: "gyeonggi-ktf" },
      ])
    );
    expect(ktfResults).toEqual(
      expect.arrayContaining([
        { sourceTeamName: "Ktf 여", clubSlug: "gyeonggi-ktf" },
        { sourceTeamName: "Ktf 정", clubSlug: "gyeonggi-ktf" },
        { sourceTeamName: "Ktf 진", clubSlug: "gyeonggi-ktf" },
        { sourceTeamName: "경기대 Ktf", clubSlug: "gyeonggi-ktf" },
      ])
    );
    expect(kftAliases).toEqual([
      { normalizedAlias: "경기대학교 kft a", clubSlug: "gyeonggi-kft" },
      { normalizedAlias: "경기대학교 kft b", clubSlug: "gyeonggi-kft" },
    ]);
    expect(kftResults).toEqual([
      { sourceTeamName: "Kft A", clubSlug: "gyeonggi-kft" },
      { sourceTeamName: "Kft B", clubSlug: "gyeonggi-kft" },
    ]);
  });

  it("keeps 연세대학교 쿠크리스 distinct from incumbent 쿠크다스", () => {
    const dataset = loadNationalRankingDataset();
    const clubSlugs = new Set(dataset.clubs.map((club) => club.slug));
    const kookdasAliases = dataset.aliases
      .filter((alias) => alias.clubSlug === "yonsei-kookdas")
      .map(({ normalizedAlias, clubSlug }) => ({ normalizedAlias, clubSlug }));
    const kookrisAliases = dataset.aliases
      .filter((alias) => alias.normalizedAlias.startsWith("연세대학교 쿠크리스 "))
      .map(({ normalizedAlias, clubSlug }) => ({ normalizedAlias, clubSlug }));
    const kookdasResults = dataset.results
      .filter((result) => result.clubSlug === "yonsei-kookdas")
      .map(({ sourceTeamName, clubSlug }) => ({ sourceTeamName, clubSlug }))
      .sort((left, right) => left.sourceTeamName.localeCompare(right.sourceTeamName));
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
    expect(kookdasAliases).toEqual(
      expect.arrayContaining([
        {
          normalizedAlias: "연세대학교 연세대 쿠크다스 a",
          clubSlug: "yonsei-kookdas",
        },
        {
          normalizedAlias: "연세대학교 연세대 쿠크다스 b",
          clubSlug: "yonsei-kookdas",
        },
        { normalizedAlias: "연세대학교 쿠크다스 a", clubSlug: "yonsei-kookdas" },
        { normalizedAlias: "연세대학교 쿠크다스 b", clubSlug: "yonsei-kookdas" },
      ])
    );
    expect(kookdasResults).toEqual(
      expect.arrayContaining([
        { sourceTeamName: "연세대 쿠크다스 A", clubSlug: "yonsei-kookdas" },
        { sourceTeamName: "연세대 쿠크다스 A", clubSlug: "yonsei-kookdas" },
        { sourceTeamName: "연세대 쿠크다스 B", clubSlug: "yonsei-kookdas" },
        { sourceTeamName: "쿠크다스 A", clubSlug: "yonsei-kookdas" },
        { sourceTeamName: "쿠크다스 B", clubSlug: "yonsei-kookdas" },
      ])
    );
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
