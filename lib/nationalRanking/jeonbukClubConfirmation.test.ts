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

describe("Jeonbuk National University club confirmation", () => {
  it("keeps ACE and Topspin as separate clubs", async () => {
    const dataset = await loadDataset();

    expect(dataset.clubs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "jeonbuk-ace",
          displayName: "전북대학교 ACE",
        }),
        expect.objectContaining({
          slug: "jeonbuk-topspin",
          displayName: "전북대학교 탑스핀",
        }),
      ])
    );
  });

  it("maps every generic Jeonbuk result to ACE", async () => {
    const dataset = await loadDataset();
    const genericJeonbukResults = dataset.results.filter(
      (result) =>
        result.sourceTeamName.includes("전북") &&
        !result.sourceTeamName.includes("탑스핀")
    );

    expect(genericJeonbukResults.length).toBeGreaterThan(0);
    expect(
      genericJeonbukResults.every(
        (result) =>
          result.clubSlug === "jeonbuk-ace" &&
          result.qualityStatus === "verified"
      )
    ).toBe(true);
  });

  it("maps every explicitly named Topspin result only to Topspin", async () => {
    const dataset = await loadDataset();
    const explicitTopspinResults = dataset.results.filter((result) =>
      result.sourceTeamName.includes("탑스핀")
    );

    expect(explicitTopspinResults.length).toBeGreaterThan(0);
    expect(
      explicitTopspinResults.every(
        (result) =>
          result.clubSlug === "jeonbuk-topspin" &&
          result.qualityStatus === "verified"
      )
    ).toBe(true);
  });

  it("stores reusable aliases for future generic and explicit source labels", async () => {
    const dataset = await loadDataset();
    const aliasesBySourceLabel = new Map(
      dataset.aliases.map((alias) => [alias.sourceLabel, alias.clubSlug])
    );

    expect(aliasesBySourceLabel.get("전북대")).toBe("jeonbuk-ace");
    expect(aliasesBySourceLabel.get("전북대 A")).toBe("jeonbuk-ace");
    expect(aliasesBySourceLabel.get("전북대 B")).toBe("jeonbuk-ace");
    expect(aliasesBySourceLabel.get("전북대 C")).toBe("jeonbuk-ace");
    expect(aliasesBySourceLabel.get("전북대 탑스핀")).toBe(
      "jeonbuk-topspin"
    );
  });

  it("bumps the managed dataset version after applying the DM confirmation", async () => {
    const dataset = await loadDataset();

    expect(dataset.version).toBe("sources-2026-07-26-v16");
  });
});
