import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { loadNationalRankingDataset } from "@/lib/nationalRanking/dataset";
import { buildNationalRankingSeedPlan } from "@/lib/nationalRanking/seedPlan";
import { buildNationalRankingSeedSql } from "@/lib/nationalRanking/seedSql";
import type { NationalRankingDataset } from "@/lib/nationalRanking/types";
import { runNationalRankingSeedSqlCli } from "../../scripts/build-national-ranking-seed-sql";

const dataset = {
  version: "seed-sql-test-v1",
  clubs: [
    {
      slug: "alpha",
      universityName: "Alpha University",
      clubName: "Alpha's Tennis",
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
      sourceLabel: "Alpha's Tennis Club",
    },
  ],
  tournaments: [
    { slug: "yanggu", name: "National", scope: "national", scopeFactor: 1 },
    { slug: "gyeongin", name: "Regional", scope: "regional", scopeFactor: 0.85 },
  ],
  editions: [
    {
      key: "national-2025-men",
      tournamentSlug: "yanggu",
      year: 2025,
      gender: "men",
      actualEntrants: 32,
      sourceStatus: "verified",
      sourceRefs: ["national-2025-men.pdf"],
    },
    {
      key: "regional-2025-women",
      tournamentSlug: "gyeongin",
      year: 2025,
      gender: "women",
      actualEntrants: 16,
      sourceStatus: "verified",
      sourceRefs: ["regional-2025-women.pdf"],
    },
  ],
  results: [
    {
      editionKey: "national-2025-men",
      clubSlug: "alpha",
      sourceTeamName: "Alpha's A",
      teamLabel: "A",
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
      sourceEntryId: "draw-row-9",
      stage: "runner_up",
      qualityStatus: "verified",
      sourceRef: "regional-2025-women.pdf#beta",
      note: "",
    },
    {
      editionKey: "national-2025-men",
      clubSlug: null,
      sourceTeamName: "Can't Resolve",
      teamLabel: "",
      stage: "semifinal",
      qualityStatus: "unresolved",
      sourceRef: "national-2025-men.pdf#unknown",
      note: "Club can't be mapped safely.",
    },
  ],
} satisfies NationalRankingDataset;

const cliPath = "scripts/build-national-ranking-seed-sql.ts";
const packageScriptCommand =
  "node --import tsx scripts/build-national-ranking-seed-sql.ts";

function buildSql(): string {
  return buildNationalRankingSeedSql(
    buildNationalRankingSeedPlan(dataset, "revision-abc")
  );
}

function normalizedSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

function dangerousDollarQuoteDataset(): NationalRankingDataset {
  const dangerousText =
    "Alpha $$ $national_seed_assertion$ women's source";

  return {
    ...dataset,
    clubs: [
      {
        ...dataset.clubs[0]!,
        clubName: dangerousText,
      },
      dataset.clubs[1]!,
    ],
    aliases: [
      {
        ...dataset.aliases[0]!,
        sourceLabel: dangerousText,
      },
    ],
    editions: [
      {
        ...dataset.editions[0]!,
        sourceRefs: [dangerousText],
      },
      dataset.editions[1]!,
    ],
    results: [
      {
        ...dataset.results[0]!,
        sourceTeamName: dangerousText,
        sourceRef: dangerousText,
        note: dangerousText,
      },
      dataset.results[1]!,
      {
        ...dataset.results[2]!,
        sourceRef: dangerousText,
      },
    ],
  };
}

describe("buildNationalRankingSeedSql", () => {
  it("wraps one escaped transaction without credentials or grants", () => {
    const sql = buildSql();

    expect(sql.startsWith("begin;\n")).toBe(true);
    expect(sql.endsWith("\ncommit;")).toBe(true);
    expect(sql).toContain("Alpha''s Tennis");
    expect(sql).toContain("Alpha''s A");
    expect(sql).toContain("can''t be mapped");
    expect(sql).not.toMatch(/\bgrant\b/i);
    expect(sql).not.toMatch(
      /process\.env|service[_-]?role|supabase[_-]?(?:key|url|secret)|password|api[_-]?key/i
    );
  });

  it("chooses assertion dollar tags that cannot be closed by source data", () => {
    const sql = buildNationalRankingSeedSql(
      buildNationalRankingSeedPlan(dangerousDollarQuoteDataset(), "revision-abc")
    );
    const assertionTags = [
      ...sql.matchAll(/\bdo\s+(\$national_seed_assertion(?:_\d+)?\$)\s*\nbegin/g),
    ].map((match) => match[1]!);

    expect(sql).not.toContain("do $$");
    expect(assertionTags).toHaveLength(7);
    expect(new Set(assertionTags)).toEqual(
      new Set(["$national_seed_assertion$", "$national_seed_assertion_1$"])
    );
    for (const tag of assertionTags) {
      expect(sql).toContain(`do ${tag}\nbegin`);
      expect(sql).toContain(`end\n${tag};`);
    }
    expect(sql).toContain("women''s source");
    expect(sql).toContain("$$ $national_seed_assertion$");
  });

  it("reconciles canonical source rows as a fully managed dataset", () => {
    const sql = buildSql().toLowerCase();
    const normalized = normalizedSql(sql);
    const clubUpsertIndex = normalized.indexOf("insert into public.national_clubs");
    const staleClubIndex = normalized.indexOf(
      "update public.national_clubs clubs set is_active = false"
    );
    const tournamentUpsertIndex = normalized.indexOf(
      "insert into public.national_tournaments"
    );
    const staleTournamentIndex = normalized.indexOf(
      "update public.national_tournaments tournaments set is_active = false"
    );
    const staleAliasIndex = normalized.indexOf(
      "delete from public.national_club_aliases aliases"
    );
    const aliasInsertIndex = normalized.indexOf(
      "insert into public.national_club_aliases"
    );
    const staleEditionIndex = normalized.indexOf(
      "delete from public.national_tournament_editions editions"
    );
    const currentResultDeleteIndex = normalized.indexOf(
      "delete from public.national_team_results results using imported_edition"
    );

    expect(sql).toContain("-- current clubs are upserted active before stale clubs are deactivated.");
    expect(sql).toContain("-- aliases are fully replaced from the managed source manifest.");
    expect(sql).toContain("-- stale editions are deleted before current edition results are refreshed.");
    expect(normalized).toContain("where not exists ( select 1 from club_input");
    expect(normalized).toContain("where not exists ( select 1 from tournament_input");
    expect(normalized).toContain("where not exists ( select 1 from alias_input");
    expect(normalized).toContain("where not exists ( select 1 from edition_input");
    expect(normalized).toContain("set is_active = true");
    expect(normalized).toContain("set is_active = false");
    expect(clubUpsertIndex).toBeGreaterThan(-1);
    expect(staleClubIndex).toBeGreaterThan(clubUpsertIndex);
    expect(tournamentUpsertIndex).toBeGreaterThan(-1);
    expect(staleTournamentIndex).toBeGreaterThan(tournamentUpsertIndex);
    expect(staleAliasIndex).toBeGreaterThan(-1);
    expect(aliasInsertIndex).toBeGreaterThan(staleAliasIndex);
    expect(staleEditionIndex).toBeGreaterThan(-1);
    expect(currentResultDeleteIndex).toBeGreaterThan(staleEditionIndex);
  });

  it("upserts source rows by natural keys and preserves source entry identity", () => {
    const sql = normalizedSql(buildSql());

    expect(sql).toContain("insert into public.national_clubs");
    expect(sql).toContain("on conflict (slug) do update");
    expect(sql).toContain("insert into public.national_club_aliases");
    expect(sql).toContain("on conflict (normalized_alias) do update");
    expect(sql).toContain("insert into public.national_tournaments");
    expect(sql).toContain("insert into public.national_tournament_editions");
    expect(sql).toContain("on conflict (tournament_id, edition_year, gender) do update");
    expect(sql).toContain("coalesce(result_input.\"sourceentryid\", '')");
    expect(sql).toContain("source_entry_id");
    expect(sql).toContain("draw-row-9");
  });

  it("replaces imported results per edition without silently dropping missing parents", () => {
    const sql = normalizedSql(buildSql());
    const editionInsertIndex = sql.indexOf(
      "insert into public.national_tournament_editions"
    );
    const resultAssertionIndex = sql.indexOf(
      "'national ranking seed result references a missing edition or club'"
    );

    expect(sql).toContain("delete from public.national_team_results");
    expect(sql).toContain("using imported_edition");
    expect(sql).toContain("insert into public.national_team_results");
    expect(sql).toContain("left join public.national_clubs clubs");
    expect(sql).toContain("result_input.\"clubslug\" is null");
    expect(sql).toContain("result_input.\"qualitystatus\" = 'verified'");
    expect(sql).toContain("raise exception");
    expect(editionInsertIndex).toBeGreaterThan(-1);
    expect(resultAssertionIndex).toBeGreaterThan(-1);
    expect(editionInsertIndex).toBeLessThan(resultAssertionIndex);
  });

  it("keeps formula versions and snapshots immutable while exact reseeds stay idempotent", () => {
    const sql = normalizedSql(buildSql());
    const unpublishIndex = sql.indexOf("set is_published = false");
    const publishIndex = sql.indexOf("set is_published = true");

    expect(sql).toContain("update public.national_formula_versions");
    expect(sql).toContain("set is_active = false");
    expect(sql).toContain("insert into public.national_formula_versions");
    expect(sql).toContain("display_name");
    expect(sql).toContain("effective_on");
    expect(sql).toContain("source_references");
    expect(sql).toContain("insert into public.national_ranking_snapshots");
    expect(sql).toContain("on conflict (version) do nothing");
    expect(sql).toContain(
      "on conflict (formula_version, source_revision) do nothing"
    );
    expect(sql).not.toContain("delete from public.national_ranking_rows");
    expect(sql).not.toContain("published_at = null");
    expect(sql).toContain("insert into public.national_ranking_rows");
    expect(sql).toContain(
      "national ranking seed formula version conflicts with immutable configuration"
    );
    expect(sql).toContain(
      "national ranking seed snapshot conflicts with immutable source summary"
    );
    expect(sql).toContain(
      "national ranking seed snapshot conflicts with immutable ranking rows"
    );
    expect(sql).toContain("inserted_snapshot as (");
    expect(sql).toContain("returning id");
    expect(sql).toContain("cross join inserted_snapshot");
    expect(sql).toContain("source_summary");
    expect(sql).toContain("seed-sql-test-v1");
    expect(sql).not.toContain(process.cwd());
    expect(unpublishIndex).toBeGreaterThan(-1);
    expect(publishIndex).toBeGreaterThan(-1);
    expect(unpublishIndex).toBeLessThan(publishIndex);
  });

  it("persists all-time honors and includes them in immutable row comparison", () => {
    const sql = buildSql();
    const normalized = normalizedSql(sql);

    expect(sql).toContain('"honors":[{');
    expect(normalized).toContain("honors jsonb");
    expect(normalized).toContain(
      "runner_ups, contributions, best_results, honors"
    );
    expect(normalized).toContain("row_input.honors");
    expect(normalized).toContain("ranking_rows.honors");
  });

  it("persists best results and includes them in immutable row comparison", () => {
    const sql = buildSql();
    const normalized = normalizedSql(sql);

    expect(sql).toContain('"bestResults":[{');
    expect(normalized).toContain('"bestresults" jsonb');
    expect(normalized).toContain(
      "runner_ups, contributions, best_results, honors"
    );
    expect(normalized).toContain('row_input."bestresults" as best_results');
    expect(normalized).toContain("ranking_rows.best_results");
  });

  it("publishes only contributions from verified editions, verified results, and known clubs", () => {
    const plan = buildNationalRankingSeedPlan(dataset, "revision-abc");
    const verifiedEditions = new Set(
      plan.editions
        .filter((edition) => edition.sourceStatus === "verified")
        .map((edition) => edition.key)
    );
    const knownClubs = new Set(plan.clubs.map((club) => club.slug));
    const verifiedResults = new Set(
      plan.results
        .filter(
          (result) =>
            result.qualityStatus === "verified" &&
            result.clubSlug !== null &&
            knownClubs.has(result.clubSlug) &&
            verifiedEditions.has(result.editionKey)
        )
        .map((result) =>
          JSON.stringify([
            result.editionKey,
            result.clubSlug,
            result.sourceTeamName,
          ])
        )
    );

    for (const contribution of plan.rows.flatMap((row) => row.contributions)) {
      expect(verifiedEditions.has(contribution.editionKey)).toBe(true);
      expect(knownClubs.has(contribution.clubSlug)).toBe(true);
      expect(
        verifiedResults.has(
          JSON.stringify([
            contribution.editionKey,
            contribution.clubSlug,
            contribution.sourceTeamName,
          ])
        )
      ).toBe(true);
      expect(contribution).not.toHaveProperty("note");
      expect(contribution).not.toHaveProperty("sourceRef");
      expect(contribution).not.toHaveProperty("qualityStatus");
    }

    const sql = buildSql();

    expect(sql).toContain("contributions");
    expect(sql).toContain("Club can''t be mapped safely.");
  });

  it("keeps the real dataset's published contributions inside the verified source boundary", () => {
    const plan = buildNationalRankingSeedPlan(
      loadNationalRankingDataset(),
      "real-revision"
    );
    const verifiedEditions = new Set(
      plan.editions
        .filter((edition) => edition.sourceStatus === "verified")
        .map((edition) => edition.key)
    );
    const knownClubs = new Set(plan.clubs.map((club) => club.slug));
    const verifiedResults = new Set(
      plan.results
        .filter(
          (result) =>
            result.qualityStatus === "verified" &&
            result.clubSlug !== null &&
            knownClubs.has(result.clubSlug) &&
            verifiedEditions.has(result.editionKey)
        )
        .map((result) =>
          JSON.stringify([
            result.editionKey,
            result.clubSlug,
            result.sourceTeamName,
          ])
        )
    );

    for (const contribution of plan.rows.flatMap((row) => row.contributions)) {
      expect(verifiedEditions.has(contribution.editionKey)).toBe(true);
      expect(knownClubs.has(contribution.clubSlug)).toBe(true);
      expect(
        verifiedResults.has(
          JSON.stringify([
            contribution.editionKey,
            contribution.clubSlug,
            contribution.sourceTeamName,
          ])
        )
      ).toBe(true);
      expect(contribution).not.toHaveProperty("note");
      expect(contribution).not.toHaveProperty("sourceRef");
      expect(contribution).not.toHaveProperty("qualityStatus");
    }
  });

  it("exposes a package script and rejects --out without a following path", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    let stderr = "";

    try {
      execFileSync(process.execPath, ["--import", "tsx", cliPath, "--out"], {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      stderr = String((error as { stderr?: string }).stderr ?? "");
    }

    expect(packageJson.scripts["seed:national:sql"]).toBe(packageScriptCommand);
    expect(stderr).toContain("--out requires a following path");
  });

  it("validates malformed --out arguments before dataset loading or SQL generation", () => {
    const loadDataset = vi.fn(() => {
      throw new Error("dataset should not load for malformed --out");
    });

    expect(() =>
      runNationalRankingSeedSqlCli(["node", cliPath, "--out", "--flag"], {
        loadDataset,
      })
    ).toThrow("--out requires a following path");
    expect(() =>
      runNationalRankingSeedSqlCli(["node", cliPath, "--out", ""], {
        loadDataset,
      })
    ).toThrow("--out requires a non-empty path");
    expect(() =>
      runNationalRankingSeedSqlCli(
        ["node", cliPath, "--out", "first.sql", "--out"],
        { loadDataset }
      )
    ).toThrow("--out may only be provided once");
    expect(loadDataset).not.toHaveBeenCalled();
    expect(readFileSync(cliPath, "utf8")).toContain(
      "Source revision is SHA-256(JSON.stringify(validated dataset)): order-preserving validated-manifest serialization."
    );
  });

  it("writes exactly the requested output file with the validated dataset hash", () => {
    const dataset = loadNationalRankingDataset();
    const expectedRevision = createHash("sha256")
      .update(JSON.stringify(dataset))
      .digest("hex");
    const tempDir = mkdtempSync(join(tmpdir(), "national-seed-"));
    const outPath = join(tempDir, "seed.sql");

    try {
      execFileSync(process.execPath, ["--import", "tsx", cliPath, "--out", outPath], {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });

      const sql = readFileSync(outPath, "utf8");

      expect(readdirSync(tempDir)).toEqual(["seed.sql"]);
      expect(existsSync(outPath)).toBe(true);
      expect(sql.startsWith("begin;\n")).toBe(true);
      expect(sql.endsWith("\ncommit;")).toBe(true);
      expect(sql).toContain(expectedRevision);
      expect(sql).not.toMatch(/process\.env|service[_-]?role|password|api[_-]?key/i);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
