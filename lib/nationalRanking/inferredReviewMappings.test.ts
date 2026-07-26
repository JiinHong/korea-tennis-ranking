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

function compactSourceName(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\[[^\]]+\]/gu, "")
    .replace(/[\s·._()[\]-]+/gu, "");
}

const inferredFamilies = [
  {
    clubSlug: "sogang-sgtc",
    sourcePattern: /^sgtc[a-e]?$/u,
  },
  {
    clubSlug: "hongik-hitc",
    sourcePattern: /^hitc$/u,
  },
  {
    clubSlug: "gachon-tiebreak",
    sourcePattern: /^(?:타이브레이크[a-c]?|tiebreak무한이)$/u,
  },
  {
    clubSlug: "gyeongsang-ktc-jtc",
    sourcePattern: /^ktcxjtc$/u,
  },
  {
    clubSlug: "knue-tennis",
    sourcePattern: /^(?:한국교원대|교원대테니스부)$/u,
  },
  {
    clubSlug: "korea-petc",
    sourcePattern: /^petc(?:[a-cs])?$/u,
  },
  {
    clubSlug: "yonsei-yutt",
    sourcePattern: /^연세대(?:자유|정의|진리|평화)$/u,
  },
  {
    clubSlug: "ajou-tennis",
    sourcePattern: /^atc[a-b]?$/u,
  },
  {
    clubSlug: "inha-rapum",
    sourcePattern: /^라중$/u,
  },
  {
    clubSlug: "kyunghee-kuta-lovice",
    sourcePattern: /^kuta(?:[a-c]|남b|서울a)$/u,
  },
] as const;

function resultsForFamily(
  results: readonly TeamResultInput[],
  sourcePattern: RegExp
): TeamResultInput[] {
  return results.filter((result) =>
    sourcePattern.test(compactSourceName(result.sourceTeamName))
  );
}

describe("review-note and repeated-label inference", () => {
  it.each(inferredFamilies)(
    "maps every $clubSlug family result to its confirmed club",
    async ({ clubSlug, sourcePattern }) => {
      const dataset = await loadDataset();
      const results = resultsForFamily(dataset.results, sourcePattern);

      expect(results.length).toBeGreaterThan(0);
      expect(
        results.every(
          (result) =>
            result.clubSlug === clubSlug &&
            result.qualityStatus === "verified"
        )
      ).toBe(true);
    }
  );

  it("keeps HITC and HiTEC as different clubs", async () => {
    const dataset = await loadDataset();
    const hitcResults = dataset.results.filter((result) =>
      /^hitc$/u.test(compactSourceName(result.sourceTeamName))
    );
    const hitecResults = dataset.results.filter((result) =>
      /^(?:hitec|하이텍)[a-b]?$/u.test(
        compactSourceName(result.sourceTeamName)
      )
    );

    expect(hitcResults.length).toBeGreaterThan(0);
    expect(hitecResults.length).toBeGreaterThan(0);
    expect(
      hitcResults.every((result) => result.clubSlug === "hongik-hitc")
    ).toBe(true);
    expect(
      hitecResults.every(
        (result) => result.clubSlug === "hanyang-erica-hitec"
      )
    ).toBe(true);
  });

  it("stores reusable aliases for the newly inferred source spellings", async () => {
    const dataset = await loadDataset();
    const aliasesBySourceLabel = new Map(
      dataset.aliases.map((alias) => [alias.sourceLabel, alias.clubSlug])
    );

    expect(
      dataset.aliases.some(
        (alias) =>
          compactSourceName(alias.sourceLabel) === "sgtc" &&
          alias.clubSlug === "sogang-sgtc"
      )
    ).toBe(true);
    expect(aliasesBySourceLabel.get("Hitc [Q]")).toBe("hongik-hitc");
    expect(aliasesBySourceLabel.get("타이브레이크 A [Q]")).toBe(
      "gachon-tiebreak"
    );
    expect(aliasesBySourceLabel.get("Atc A [Q]")).toBe("ajou-tennis");
    expect(aliasesBySourceLabel.get("Ktc X Jtc [Q]")).toBe(
      "gyeongsang-ktc-jtc"
    );
    expect(aliasesBySourceLabel.get("라중")).toBe("inha-rapum");
  });

  it("bumps the managed dataset version after applying the inference", async () => {
    const dataset = await loadDataset();

    expect(dataset.version).toBe("sources-2026-07-26-v15");
  });
});
