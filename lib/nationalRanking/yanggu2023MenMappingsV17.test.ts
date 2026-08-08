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
    clubSlug: "korea-kutc",
    sourceTeamNames: [
      "Kutc E [Q]",
      "Kutc B [Q]",
      "Kutc A [Q]",
      "Kutc D [Q]",
      "Kutc C [Q]",
    ],
  },
  {
    clubSlug: "hanyang-hytc",
    sourceTeamNames: ["Hytc 개나리 [Q]", "Hytc 블루 [Q]"],
  },
  {
    clubSlug: "gangwon-shot",
    sourceTeamNames: ["Shot [Q]"],
  },
  {
    clubSlug: "hanyang-erica-hitec",
    sourceTeamNames: ["에리카 B [Q]"],
  },
  {
    clubSlug: "hufs-ace",
    sourceTeamNames: ["Ace [3]"],
  },
  {
    clubSlug: "dongguk-dutc",
    sourceTeamNames: ["Dutc C [Q]", "Dutc B [Q]"],
  },
  {
    clubSlug: "yonsei-yutt",
    sourceTeamNames: ["연세대 사랑 [Q]", "연세대 믿음 [Q]"],
  },
  {
    clubSlug: "kyunghee-kuta-lovice",
    sourceTeamNames: ["경희 C [Q]", "경희 B [Q]"],
  },
  {
    clubSlug: "inu-uitc",
    sourceTeamNames: ["Uitc 여포 [Q]", "Uitc 제갈량 [Q]"],
  },
  {
    clubSlug: "yongin-ace",
    sourceTeamNames: ["용인대 Ace [Q]"],
  },
  {
    clubSlug: "kyunghee-engineering-impact",
    sourceTeamNames: ["경희 I [Q]"],
  },
  {
    clubSlug: "dankook-jukjeon-dkutc",
    sourceTeamNames: ["Dkuct 2 [Q]"],
  },
  {
    clubSlug: "namseoul-winning-shot",
    sourceTeamNames: ["위닝샷 [Q]"],
  },
  {
    clubSlug: "hanbat-masters",
    sourceTeamNames: ["마스터즈 A [Q]", "마스터즈 B [Q]"],
  },
  {
    clubSlug: "suwon-ace",
    sourceTeamNames: ["Ace M [Q]"],
  },
  {
    clubSlug: "sangmyung-tesla",
    sourceTeamNames: ["테슬라 [Q]"],
  },
] as const;

describe("2023 Yanggu men's administrator-provided university mapping", () => {
  it.each(confirmedMappings)(
    "maps $sourceTeamNames to $clubSlug",
    async ({ clubSlug, sourceTeamNames }) => {
      const dataset = await loadDataset();
      const rows = dataset.results.filter(
        (result) =>
          result.editionKey === "yanggu-2023-men" &&
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

  it("registers Yongin University ACE from the supplied bracket mapping", async () => {
    const dataset = await loadDataset();

    expect(dataset.clubs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "yongin-ace",
          universityName: "용인대학교",
          clubName: "ACE",
          displayName: "용인대학교 ACE",
        }),
      ])
    );
  });

  it("removes every 2023 Yanggu men's entrant from unresolved review", async () => {
    const dataset = await loadDataset();
    const unresolved = dataset.results.filter(
      (result) =>
        result.editionKey === "yanggu-2023-men" &&
        result.qualityStatus === "unresolved"
    );

    expect(unresolved).toEqual([]);
  });

  it("bumps the managed dataset version after applying the mapping", async () => {
    const dataset = await loadDataset();

    expect(dataset.version).toBe("sources-2026-08-08-v19");
  });
});
