import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type {
  NationalRankingDataset,
  TeamResultInput,
} from "./types";

const datasetPath = resolve(
  process.cwd(),
  "data/national-ranking/v1/dataset.json"
);

async function loadDataset(): Promise<NationalRankingDataset> {
  return JSON.parse(
    await readFile(datasetPath, "utf8")
  ) as NationalRankingDataset;
}

const reviewedMappings = [
  {
    clubSlug: "yonsei-yutt",
    reviewKeys: [
      "yanggu-2025-men::연세대 자유",
      "yanggu-2025-men::연세대 평화",
      "yanggu-2025-men::연세대 진리",
      "yanggu-2025-men::연세대 정의",
      "yanggu-2025-women::연세대 자유",
      "yanggu-2025-women::연세대 평화",
      "yanggu-2025-women::연세대 진리",
      "yanggu-2025-women::연세대 정의",
    ],
    expectedCount: 8,
  },
  {
    clubSlug: "hanyang-hytc",
    reviewKeys: [
      "yanggu-2025-men::한양대 A [3]",
      "yanggu-2025-men::한양대 B",
      "yanggu-2025-men::한양대 C",
      "yanggu-2025-men::한양대 D",
      "yanggu-2025-women::한양대 A",
      "yanggu-2025-women::한양대 B",
    ],
    expectedCount: 6,
  },
  {
    clubSlug: "jeonbuk-ace",
    reviewKeys: [
      "yanggu-2024-men::전북대 A [2]",
      "yanggu-2024-men::전북대 B",
      "yanggu-2024-women::전북대 A",
      "yanggu-2024-women::전북대 B",
      "yanggu-2025-men::전북대 B",
      "yanggu-2025-women::전북대 A",
    ],
    expectedCount: 6,
  },
  {
    clubSlug: "gyeonggi-ktf",
    reviewKeys: [
      "yanggu-2025-men::Ktf A",
      "yanggu-2025-men::Ktf B",
      "yanggu-2025-men::Ktf C",
    ],
    expectedCount: 3,
  },
  {
    clubSlug: "kyunghee-seoul-kuta",
    reviewKeys: [
      "yanggu-2023-men::Kuta A [Q]",
      "yanggu-2025-women::경희대 Kuta",
    ],
    expectedCount: 2,
  },
  {
    clubSlug: "kyunghee-global-luvis",
    reviewKeys: [
      "yanggu-2024-men::경희대 국제 A",
      "yanggu-2024-men::경희대 국제 B",
      "yanggu-2024-men::경희대 국제 C",
      "yanggu-2024-women::경희대 국제 B",
      "yanggu-2024-women::경희대 국제 C",
      "yanggu-2025-women::경희대 국제 A [2]",
      "yanggu-2025-women::경희대 국제 B",
      "yanggu-2025-women::경희대 국제 C",
      "yanggu-2025-women::경희대 국제 D",
    ],
    expectedCount: 9,
  },
  {
    clubSlug: "suwon-ace",
    reviewKeys: [
      "yanggu-2025-men::수원대 A",
      "yanggu-2025-women::수원대 W",
    ],
    expectedCount: 2,
  },
  {
    clubSlug: "knue-tennis",
    reviewKeys: [
      "yanggu-2024-men::교원대 테니스부",
      "yanggu-2024-women::교원대 테니스부",
      "yanggu-2025-men::한국교원대",
      "yanggu-2025-women::한국교원대",
    ],
    expectedCount: 4,
  },
] as const;

function isYangguResult(result: TeamResultInput): boolean {
  return result.editionKey.startsWith("yanggu-");
}

describe("administrator-reviewed Yanggu mappings", () => {
  it("contains the two newly confirmed clubs", async () => {
    const dataset = await loadDataset();

    expect(dataset.clubs).toEqual(
      expect.arrayContaining([
        {
          slug: "suwon-ace",
          universityName: "수원대학교",
          clubName: "ACE",
          displayName: "수원대학교 ACE",
        },
        {
          slug: "knue-tennis",
          universityName: "한국교원대학교",
          clubName: "테니스부",
          displayName: "한국교원대학교 테니스부",
        },
      ])
    );
  });

  it.each(reviewedMappings)(
    "maps $expectedCount reviewed Yanggu rows to $clubSlug",
    async ({ clubSlug, reviewKeys, expectedCount }) => {
      const dataset = await loadDataset();
      const rows = dataset.results.filter(
        (result) =>
          reviewKeys.includes(
            `${result.editionKey}::${result.sourceTeamName}` as (typeof reviewKeys)[number]
          )
      );

      expect(rows).toHaveLength(expectedCount);
      expect(rows.every((result) => result.clubSlug === clubSlug)).toBe(true);
      expect(rows.every((result) => result.qualityStatus === "verified")).toBe(
        true
      );
    }
  );

  it("keeps the explicitly deferred Jeonbuk Topspin row unresolved", async () => {
    const dataset = await loadDataset();
    const deferred = dataset.results.filter(
      (result) =>
        isYangguResult(result) && result.sourceTeamName === "전북대 탑스핀"
    );

    expect(deferred).toHaveLength(1);
    expect(deferred[0]).toMatchObject({
      clubSlug: null,
      qualityStatus: "unresolved",
    });
  });

  it("bumps the managed dataset version after applying the review", async () => {
    const dataset = await loadDataset();

    expect(dataset.version).toBe("sources-2026-07-24-v10");
  });
});
