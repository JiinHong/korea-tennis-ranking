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

  it("LOVICE 준우승을 포함한 일반 경희대 51건과 IMPACT 12건을 각각 통합한다", async () => {
    const dataset = await loadDataset();
    const generalResults = dataset.results.filter(
      (result) => result.clubSlug === KYUNGHEE_SLUG
    );
    const impactResults = dataset.results.filter(
      (result) => result.clubSlug === KYUNGHEE_ENGINEERING_SLUG
    );

    expect(generalResults).toHaveLength(51);
    expect(impactResults).toHaveLength(12);
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

    expect(dataset.version).toBe("sources-2026-07-26-v17");
  });
});
