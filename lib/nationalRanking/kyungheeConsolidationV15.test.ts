import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { NationalRankingDataset } from "./types";

const DATASET_PATH = resolve(
  process.cwd(),
  "data/national-ranking/v1/dataset.json"
);
const KYUNGHEE_SLUG = "kyunghee-kuta-lovice";
const KYUNGHEE_ENGINEERING_SLUG = "kyunghee-engineering-impact";
const REMAINING_GENERAL_KYUNGHEE_RESULTS = new Set([
  "inje-2023-men::경희대",
  "gyeongin-2023-men::경희대 B",
  "gyeongin-2023-men::경희대 D",
  "gyeongin-2023-women::경희대 쿠웅이",
  "gyeongin-2024-men::경희대학교 B",
  "gyeongin-2024-men::경희대학교 C",
  "gyeongin-2024-women::경희대 s",
  "chuncheon-2023-men::경희대 국제 C",
  "chuncheon-2023-men::경희대 국제 B",
  "chuncheon-2023-men::경희대 국제 A",
  "chuncheon-2023-women::경희대 국제 C",
  "chuncheon-2023-women::경희대서울2팀",
  "chuncheon-2023-women::경희대 국제 B",
  "chuncheon-2023-women::경희대 서울1팀",
  "chuncheon-2024-men::경희대A",
  "chuncheon-2024-women::경희대 국제B",
  "chuncheon-2025-women::경희대 국제A",
]);
const RETIRED_KYUNGHEE_SLUGS = new Set([
  "kyunghee-global-impact",
  "kyunghee-global-kuta",
  "kyunghee-global-luvis",
  "kyunghee-seoul-kuta",
  "kyunghee-impact",
  "kyunghee-kuta",
  "kyunghee-luvis",
  "kyunghee-shuttle",
]);

async function loadDataset(): Promise<NationalRankingDataset> {
  return JSON.parse(
    await readFile(DATASET_PATH, "utf8")
  ) as NationalRankingDataset;
}

describe("경희대학교 대회 결과 통합", () => {
  it("경희대학교를 KUTA·LOVICE와 공과대학 IMPACT 두 항목으로만 관리한다", async () => {
    const dataset = await loadDataset();
    const kyungheeClubs = dataset.clubs.filter((club) =>
      club.universityName.startsWith("경희대학교")
    );

    expect(kyungheeClubs).toEqual([
      {
        slug: KYUNGHEE_SLUG,
        universityName: "경희대학교",
        clubName: "KUTA·LOVICE",
        displayName: "경희대학교 KUTA·LOVICE",
      },
      {
        slug: KYUNGHEE_ENGINEERING_SLUG,
        universityName: "경희대학교 공과대학",
        clubName: "IMPACT",
        displayName: "경희대학교 공과대학 IMPACT",
      },
    ]);
  });

  it("일반 경희대 87건과 IMPACT 16건을 각각 통합한다", async () => {
    const dataset = await loadDataset();
    const generalResults = dataset.results.filter(
      (result) => result.clubSlug === KYUNGHEE_SLUG
    );
    const impactResults = dataset.results.filter(
      (result) => result.clubSlug === KYUNGHEE_ENGINEERING_SLUG
    );

    expect(generalResults).toHaveLength(87);
    expect(impactResults).toHaveLength(16);
    expect(
      [...generalResults, ...impactResults].every(
        (result) => result.qualityStatus === "verified"
      )
    ).toBe(true);
    expect(
      generalResults.find(
        (result) =>
          result.editionKey === "gyeongin-2023-men" &&
          result.sourceTeamName === "러비스 A"
      )
    ).toMatchObject({
      stage: "runner_up",
      qualityStatus: "verified",
    });
  });

  it("남아 있던 일반 경희대 원문 17건도 KUTA·LOVICE로 확정한다", async () => {
    const dataset = await loadDataset();
    const resolvedResults = dataset.results.filter((result) =>
      REMAINING_GENERAL_KYUNGHEE_RESULTS.has(
        `${result.editionKey}::${result.sourceTeamName}`
      )
    );

    expect(resolvedResults).toHaveLength(REMAINING_GENERAL_KYUNGHEE_RESULTS.size);
    expect(
      resolvedResults.every(
        (result) =>
          result.clubSlug === KYUNGHEE_SLUG &&
          result.qualityStatus === "verified"
      )
    ).toBe(true);
    expect(
      dataset.results.filter(
        (result) =>
          result.qualityStatus === "unresolved" &&
          result.sourceTeamName.includes("경희")
      )
    ).toEqual([]);
  });

  it("폐기한 경희대학교 항목을 어느 데이터에서도 참조하지 않는다", async () => {
    const dataset = await loadDataset();

    expect(
      dataset.clubs.some((club) => RETIRED_KYUNGHEE_SLUGS.has(club.slug))
    ).toBe(false);
    expect(
      dataset.aliases.some((alias) =>
        RETIRED_KYUNGHEE_SLUGS.has(alias.clubSlug)
      )
    ).toBe(false);
    expect(
      dataset.results.some(
        (result) =>
          result.clubSlug !== null &&
          RETIRED_KYUNGHEE_SLUGS.has(result.clubSlug)
      )
    ).toBe(false);
  });

  it("KUTA·LOVICE·IMPACT와 과거 원문 표기를 별칭으로 보존한다", async () => {
    const dataset = await loadDataset();
    const generalLabels = new Set(
      dataset.aliases
        .filter((alias) => alias.clubSlug === KYUNGHEE_SLUG)
        .map((alias) => alias.sourceLabel)
    );
    const impactLabels = new Set(
      dataset.aliases
        .filter((alias) => alias.clubSlug === KYUNGHEE_ENGINEERING_SLUG)
        .map((alias) => alias.sourceLabel)
    );

    for (const sourceLabel of [
      "KUTA",
      "LOVICE",
      "러비스",
      "경희대 셔틀",
    ]) {
      expect(generalLabels, sourceLabel).toContain(sourceLabel);
    }
    for (const sourceLabel of ["IMPACT", "임팩트", "경희대 국제 임팩트"]) {
      expect(impactLabels, sourceLabel).toContain(sourceLabel);
    }
  });

  it("통합 결과를 새 데이터 버전으로 관리한다", async () => {
    const dataset = await loadDataset();

    expect(dataset.version).toBe("sources-2026-08-20-v20");
  });
});
