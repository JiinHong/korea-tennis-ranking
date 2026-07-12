import { describe, expect, it } from "vitest";

import {
  PRIMARY_METHODOLOGY_REFERENCES,
  buildNationalRankingSeedPlan,
} from "@/lib/nationalRanking/seedPlan";
import type { NationalRankingDataset } from "@/lib/nationalRanking/types";

const dataset = {
  version: "seed-plan-test-v1",
  clubs: [
    {
      slug: "alpha",
      universityName: "Alpha University",
      clubName: "Alpha Tennis",
      displayName: "Alpha",
    },
    {
      slug: "beta",
      universityName: "Beta University",
      clubName: "Beta Tennis",
      displayName: "Beta",
    },
  ],
  aliases: [
    {
      clubSlug: "alpha",
      normalizedAlias: "alpha tennis",
      sourceLabel: "Alpha Tennis Club",
    },
  ],
  tournaments: [
    { slug: "national", name: "National", scope: "national", scopeFactor: 1 },
    { slug: "regional", name: "Regional", scope: "regional", scopeFactor: 0.85 },
  ],
  editions: [
    {
      key: "national-2025-men",
      tournamentSlug: "national",
      year: 2025,
      gender: "men",
      actualEntrants: 32,
      sourceStatus: "verified",
      sourceRefs: ["national-2025-men.pdf"],
    },
    {
      key: "regional-2025-women",
      tournamentSlug: "regional",
      year: 2025,
      gender: "women",
      actualEntrants: 16,
      sourceStatus: "verified",
      sourceRefs: ["regional-2025-women.pdf"],
    },
    {
      key: "national-2024-men-unresolved",
      tournamentSlug: "national",
      year: 2024,
      gender: "men",
      actualEntrants: 24,
      sourceStatus: "unresolved",
      sourceRefs: ["national-2024-men.pdf"],
    },
  ],
  results: [
    {
      editionKey: "national-2025-men",
      clubSlug: "alpha",
      sourceTeamName: "Alpha A",
      teamLabel: "A",
      sourceEntryId: "entry-1",
      stage: "champion",
      qualityStatus: "verified",
      sourceRef: "national-2025-men.pdf#alpha-a",
      note: "",
    },
    {
      editionKey: "regional-2025-women",
      clubSlug: "beta",
      sourceTeamName: "Beta Women",
      teamLabel: "",
      stage: "runner_up",
      qualityStatus: "verified",
      sourceRef: "regional-2025-women.pdf#beta",
      note: "",
    },
    {
      editionKey: "national-2025-men",
      clubSlug: null,
      sourceTeamName: "Unresolved Men",
      teamLabel: "",
      stage: "semifinal",
      qualityStatus: "unresolved",
      sourceRef: "national-2025-men.pdf#unknown",
      note: "Source team cannot be mapped safely.",
    },
    {
      editionKey: "national-2024-men-unresolved",
      clubSlug: "alpha",
      sourceTeamName: "Alpha Unverified Edition",
      teamLabel: "",
      stage: "runner_up",
      qualityStatus: "verified",
      sourceRef: "national-2024-men.pdf#alpha",
      note: "",
    },
  ],
} satisfies NationalRankingDataset;

describe("buildNationalRankingSeedPlan", () => {
  it("preserves source data and produces audited ranking rows", () => {
    const plan = buildNationalRankingSeedPlan(dataset, "revision-123");

    expect(plan.sourceRevision).toBe("revision-123");
    expect(plan.formula).toMatchObject({
      version: "national-club-v1",
      displayName: "National Club Ranking v1",
      effectiveOn: "2026-07-12",
    });
    expect(plan.formula.config.version).toBe("national-club-v1");
    expect(plan.formula.sourceReferences).toEqual(PRIMARY_METHODOLOGY_REFERENCES);
    expect(
      plan.formula.sourceReferences.every(
        (reference) =>
          reference.url.startsWith("https://") &&
          !reference.url.includes("docs/") &&
          !reference.url.includes("data/")
      )
    ).toBe(true);
    expect(plan.clubs).toEqual(dataset.clubs);
    expect(plan.aliases).toEqual(dataset.aliases);
    expect(plan.tournaments).toEqual(dataset.tournaments);
    expect(plan.editions).toEqual(dataset.editions);
    expect(plan.results).toEqual(dataset.results);

    expect(plan.rows.map((row) => row.gender).sort()).toEqual([
      "combined",
      "combined",
      "men",
      "women",
    ]);
    expect(plan.results).toContainEqual(
      expect.objectContaining({
        sourceTeamName: "Unresolved Men",
        qualityStatus: "unresolved",
      })
    );

    const contributions = plan.rows.flatMap((row) => row.contributions);

    expect(contributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clubSlug: "alpha",
          editionKey: "national-2025-men",
          sourceTeamName: "Alpha A",
        }),
        expect.objectContaining({
          clubSlug: "beta",
          editionKey: "regional-2025-women",
          sourceTeamName: "Beta Women",
        }),
      ])
    );
    expect(contributions).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceTeamName: "Unresolved Men" }),
        expect.objectContaining({ editionKey: "national-2024-men-unresolved" }),
      ])
    );
  });
});
