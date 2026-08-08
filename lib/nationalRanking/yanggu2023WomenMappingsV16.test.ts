import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { NationalRankingDataset } from "./types";

const datasetPath = resolve(
  process.cwd(),
  "data/national-ranking/v1/dataset.json"
);

async function loadDataset(): Promise<NationalRankingDataset> {
  return JSON.parse(
    await readFile(datasetPath, "utf8")
  ) as NationalRankingDataset;
}

const confirmedMappings = [
  {
    clubSlug: "kyunghee-kuta-lovice",
    sourceTeamNames: ["경희 B [Q]", "경희 C [Q]"],
  },
  {
    clubSlug: "kyunghee-engineering-impact",
    sourceTeamNames: ["경희 I [Q]"],
  },
  {
    clubSlug: "hanbat-masters",
    sourceTeamNames: ["꿀복숭아 [Q]", "햇감자 [Q]", "박고구마 [Q]"],
  },
  {
    clubSlug: "hufs-ace",
    sourceTeamNames: ["Ace A [Q]", "Ace B [Q]"],
  },
  {
    clubSlug: "suwon-ace",
    sourceTeamNames: ["Ace W [Q]"],
  },
  {
    clubSlug: "ewha-tennis",
    sourceTeamNames: [
      "이대 1화 [Q]",
      "이대 2화 [Q]",
      "이대 3화 [Q]",
      "이대 4화 [Q]",
      "이대 5화 [Q]",
    ],
  },
  {
    clubSlug: "hanyang-women-hytc",
    sourceTeamNames: ["Hytc 사자 [Q]", "Hytc 피스 [Q]"],
  },
  {
    clubSlug: "hanyang-hytc",
    sourceTeamNames: ["Hytc 개나리 [Q]", "Hytc 블루"],
  },
  {
    clubSlug: "hanyang-erica-hitec",
    sourceTeamNames: ["에리카 A [Q]", "에리카 B [Q]"],
  },
  {
    clubSlug: "yonsei-yutt",
    sourceTeamNames: ["연세대 사랑 [Q]"],
  },
  {
    clubSlug: "yonsei-kookdas",
    sourceTeamNames: ["쿠크다스 [Q]"],
  },
  {
    clubSlug: "dongguk-dutc",
    sourceTeamNames: ["Dutc A [Q]", "Dutc B [Q]", "Dutc C [Q]"],
  },
  {
    clubSlug: "korea-kutc",
    sourceTeamNames: ["Kutc A [Q]", "Kutc B [Q]", "Kutc C [Q]"],
  },
  {
    clubSlug: "dankook-jukjeon-dkutc",
    sourceTeamNames: ["Dkuct 2 [Q]", "Dkuct 3 [Q]"],
  },
  {
    clubSlug: "dankook-cheonan-dkutc",
    sourceTeamNames: ["Dkuct 1 [Q]"],
  },
  {
    clubSlug: "inu-uitc",
    sourceTeamNames: ["Uitc 초선 [Q]"],
  },
] as const;

describe("2023 Yanggu women's administrator-provided university mapping", () => {
  it.each(confirmedMappings)(
    "maps $sourceTeamNames to $clubSlug",
    async ({ clubSlug, sourceTeamNames }) => {
      const dataset = await loadDataset();
      const rows = dataset.results.filter(
        (result) =>
          result.editionKey === "yanggu-2023-women" &&
          sourceTeamNames.includes(
            result.sourceTeamName as (typeof sourceTeamNames)[number]
          )
      );

      expect(rows).toHaveLength(sourceTeamNames.length);
      expect(rows.every((result) => result.clubSlug === clubSlug)).toBe(true);
      expect(rows.every((result) => result.qualityStatus === "verified")).toBe(
        true
      );

      for (const sourceTeamName of sourceTeamNames) {
        expect(dataset.aliases).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              clubSlug,
              sourceLabel: sourceTeamName,
            }),
          ])
        );
      }
    }
  );

  it("removes every 2023 Yanggu women's entrant from unresolved review", async () => {
    const dataset = await loadDataset();
    const unresolved = dataset.results.filter(
      (result) =>
        result.editionKey === "yanggu-2023-women" &&
        result.qualityStatus === "unresolved"
    );

    expect(unresolved).toEqual([]);
  });

  it("bumps the managed dataset version after applying the mapping", async () => {
    const dataset = await loadDataset();

    expect(dataset.version).toBe("sources-2026-08-08-v19");
  });
});
