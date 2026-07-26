import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { NationalRankingDataset } from "./types";

const DATASET_PATH = resolve(
  process.cwd(),
  "data/national-ranking/v1/dataset.json"
);
const MYONGJI_SLUG = "myongji-mjta-mtc";
const RETIRED_MYONGJI_SLUGS = new Set([
  "myongji-rushand",
  "myongji-tesarang",
  "myongji-tshot",
]);

const REVIEW_MEMO_MAPPINGS = [
  ["inje-2023-men", "고려대 C", "korea-kutc"],
  ["inje-2023-men", "고려대", "korea-kutc"],
  ["inje-2025-women", "이화여대 A", "ewha-tennis"],
  ["gyeongin-2023-men", "STC", "sungkyunkwan-stc"],
  ["gyeongin-2023-men", "UITC B", "inu-uitc"],
  ["gyeongin-2023-men", "Uitc 남 A", "inu-uitc"],
  ["gyeongin-2023-men", "한양대 블루", "hanyang-hytc"],
  ["gyeongin-2023-men", "UOSTC A", "uos-approach"],
  ["gyeongin-2023-women", "이화여대 B", "ewha-tennis"],
  ["gyeongin-2023-women", "이화여대 A", "ewha-tennis"],
  ["gyeongin-2023-women", "A", "uos-approach"],
  ["gyeongin-2024-men", "명지대A", MYONGJI_SLUG],
  ["gyeongin-2024-women", "이화여대B", "ewha-tennis"],
  ["gyeongin-2024-women", "단국대 A", "dankook-cheonan-dkutc"],
  ["gyeongin-2024-women", "UITC A", "inu-uitc"],
  ["gyeongin-2025-women", "단국대", "dankook-cheonan-dkutc"],
  ["gyeongin-2025-women", "한양대학교 A", "hanyang-hytc"],
  ["gyeongin-2025-women", "이화여대A", "ewha-tennis"],
  ["chuncheon-2023-men", "강원대학교 A", "gangneung-wonju-love"],
  ["chuncheon-2023-men", "강원대학교B", "gangneung-wonju-love"],
  ["chuncheon-2024-men", "명지대A", MYONGJI_SLUG],
  ["chuncheon-2024-women", "단국대A", "dankook-cheonan-dkutc"],
  ["chuncheon-2024-women", "이화여대A", "ewha-tennis"],
  ["chuncheon-2024-women", "한양대A", "hanyang-hytc"],
  ["chuncheon-2025-men", "한기대 A", "koreatech-tennis"],
] as const;

async function loadDataset(): Promise<NationalRankingDataset> {
  return JSON.parse(
    await readFile(DATASET_PATH, "utf8")
  ) as NationalRankingDataset;
}

describe("검수 메모 반영과 명지대학교 결과 통합", () => {
  it.each(REVIEW_MEMO_MAPPINGS)(
    "%s의 %s를 %s로 확정한다",
    async (editionKey, sourceTeamName, clubSlug) => {
      const dataset = await loadDataset();
      const result = dataset.results.find(
        (candidate) =>
          candidate.editionKey === editionKey &&
          candidate.sourceTeamName === sourceTeamName
      );

      expect(result).toMatchObject({
        clubSlug,
        qualityStatus: "verified",
      });
      expect(result?.stage).not.toBeNull();
    }
  );

  it("명지대학교의 모든 과거 결과를 MJTA·MTC 단일 항목으로 합친다", async () => {
    const dataset = await loadDataset();
    const myongjiClubs = dataset.clubs.filter(
      (club) => club.universityName === "명지대학교"
    );
    const myongjiResults = dataset.results.filter(
      (result) =>
        result.sourceTeamName.includes("명지") ||
        result.clubSlug === MYONGJI_SLUG ||
        (result.clubSlug !== null &&
          RETIRED_MYONGJI_SLUGS.has(result.clubSlug))
    );

    expect(myongjiClubs).toEqual([
      {
        slug: MYONGJI_SLUG,
        universityName: "명지대학교",
        clubName: "MJTA·MTC",
        displayName: "명지대학교 MJTA·MTC",
      },
    ]);
    expect(myongjiResults).toHaveLength(10);
    expect(
      myongjiResults.every(
        (result) =>
          result.clubSlug === MYONGJI_SLUG &&
          result.qualityStatus === "verified"
      )
    ).toBe(true);
  });

  it("폐기한 명지대학교 항목을 어느 데이터에서도 참조하지 않는다", async () => {
    const dataset = await loadDataset();

    expect(
      dataset.clubs.some((club) => RETIRED_MYONGJI_SLUGS.has(club.slug))
    ).toBe(false);
    expect(
      dataset.aliases.some((alias) =>
        RETIRED_MYONGJI_SLUGS.has(alias.clubSlug)
      )
    ).toBe(false);
    expect(
      dataset.results.some(
        (result) =>
          result.clubSlug !== null &&
          RETIRED_MYONGJI_SLUGS.has(result.clubSlug)
      )
    ).toBe(false);
  });

  it("명지대학교 과거 표기와 현재 두 동아리명을 재사용 가능한 별칭으로 보관한다", async () => {
    const dataset = await loadDataset();
    const sourceLabels = new Set(
      dataset.aliases
        .filter((alias) => alias.clubSlug === MYONGJI_SLUG)
        .map((alias) => alias.sourceLabel)
    );

    for (const sourceLabel of [
      "MJTA",
      "MTC",
      "러시앤",
      "명지대 테사랑",
      "티샷",
      "명지대 A [Q]",
      "명지대 B [Q]",
      "명지대A",
    ]) {
      expect(sourceLabels, sourceLabel).toContain(sourceLabel);
    }
  });

  it("한국기술교육대학교 항목과 새 데이터 버전을 보관한다", async () => {
    const dataset = await loadDataset();

    expect(dataset.version).toBe("sources-2026-07-26-v16");
    expect(
      dataset.clubs.find((club) => club.slug === "koreatech-tennis")
    ).toEqual({
      slug: "koreatech-tennis",
      universityName: "한국기술교육대학교",
      clubName: "테니스부",
      displayName: "한국기술교육대학교 테니스부",
    });
  });
});
