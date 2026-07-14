import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260712120000_create_national_rankings.sql"
);
const migrationDirectory = join(process.cwd(), "supabase/migrations");

function readMigration(): string | null {
  return existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : null;
}

function readMigrationEndingWith(suffix: string): string | null {
  const migration = readdirSync(migrationDirectory).find((file) =>
    file.endsWith(suffix)
  );

  return migration
    ? readFileSync(join(migrationDirectory, migration), "utf8")
    : null;
}

const nationalTables = [
  "national_clubs",
  "national_club_aliases",
  "national_tournaments",
  "national_tournament_editions",
  "national_team_results",
  "national_formula_versions",
  "national_ranking_snapshots",
  "national_ranking_rows",
] as const;

const anonSelectTargets = [
  "public.national_clubs",
  "public.national_tournaments",
  "public.national_formula_versions",
  "public.national_ranking_snapshots",
  "public.national_ranking_rows",
  "public.latest_national_rankings",
] as const;

const privateAnonTargets = [
  "public.national_club_aliases",
  "public.national_tournament_editions",
  "public.national_team_results",
] as const;

const latestViewPattern =
  /\bcreate\s+or\s+replace\s+view\s+public\.latest_national_rankings\s+with\s*\(\s*security_invoker\s*=\s*true\s*\)\s+as\b/i;

function normalizeSql(sql: string | null): string {
  return (sql ?? "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function policyPattern(
  table: string,
  operation: "all" | "select",
  role: "anon" | "service_role",
  bodyPattern: string
): RegExp {
  return new RegExp(
    `\\bcreate\\s+policy\\s+(?:"[^"]+"|[a-z_][a-z0-9_]*)` +
      `\\s+on\\s+public\\.${escapeRegExp(table)}` +
      `\\s+for\\s+${operation}\\s+to\\s+${role}` +
      `\\s+${bodyPattern}\\s*;`,
    "i"
  );
}

function createPolicyBlocks(sql: string): string[] {
  return [...normalizeSql(sql).matchAll(/\bcreate\s+policy\b[^;]*;/g)].map(
    (match) => match[0]
  );
}

function policyForRolePattern(table: string, role: "anon" | "service_role"): RegExp {
  return new RegExp(
    `\\bcreate\\s+policy\\s+(?:"[^"]+"|[a-z_][a-z0-9_]*)` +
      `\\s+on\\s+public\\.${escapeRegExp(table)}[^;]*` +
      `\\bto\\s+[^;]*\\b${role}\\b[^;]*;`,
    "i"
  );
}

type SqlGrant = {
  privileges: string[];
  targets: string[];
  roles: string[];
};

function parseGrants(sql: string): SqlGrant[] {
  const grantPattern =
    /\bgrant\s+([^;]+?)\s+on\s+(?:table\s+)?([^;]+?)\s+to\s+([^;]+?)\s*;/gi;

  return [...normalizeSql(sql).matchAll(grantPattern)].map((match) => ({
    privileges: match[1]!.split(",").map((value) => value.trim().toLowerCase()),
    targets: match[2]!.split(",").map((value) => value.trim().toLowerCase()),
    roles: match[3]!
      .replace(/\s+with\s+grant\s+option$/i, "")
      .split(",")
      .map((value) => value.trim().toLowerCase()),
  }));
}

describe("national ranking migration", () => {
  it("adds best historical results to the secure public ranking view", () => {
    const migration = readMigrationEndingWith(
      "_add_national_ranking_best_results.sql"
    );
    const sql = normalizeSql(migration);

    expect(migration).not.toBeNull();
    expect(sql).toContain(
      "add column if not exists best_results jsonb not null default '[]'::jsonb"
    );
    expect(sql).toContain("check (jsonb_typeof(best_results) = 'array')");
    expect(sql).toMatch(latestViewPattern);
    expect(sql).toContain("ranking_row.best_results");
    expect(sql).toContain("ranking_row.honors");
    expect(sql).toContain(
      "ranking_row.honors, ranking_row.best_results"
    );
    expect(sql).toContain(
      "grant select on public.latest_national_rankings to anon"
    );
    expect(sql).not.toContain("security definer");
  });

  it("adds all-time honors to the secure public ranking view", () => {
    const migration = readMigrationEndingWith(
      "_add_national_ranking_honors.sql"
    );
    const sql = normalizeSql(migration);

    expect(migration).not.toBeNull();
    expect(sql).toContain(
      "add column if not exists honors jsonb not null default '[]'::jsonb"
    );
    expect(sql).toContain("check (jsonb_typeof(honors) = 'array')");
    expect(sql).toMatch(latestViewPattern);
    expect(sql).toContain("ranking_row.honors");
    expect(sql).toContain(
      "grant select on public.latest_national_rankings to anon"
    );
    expect(sql).not.toContain("security definer");
  });

  it("creates the national ranking tables and latest view", () => {
    const sql = readMigration();
    const normalizedSql = normalizeSql(sql);

    expect(sql).not.toBeNull();
    expect(sql).toContain('create extension if not exists "pgcrypto"');
    expect(sql).toContain("create table if not exists public.national_clubs");
    expect(sql).toContain(
      "create table if not exists public.national_club_aliases"
    );
    expect(sql).toContain(
      "create table if not exists public.national_tournaments"
    );
    expect(sql).toContain(
      "create table if not exists public.national_tournament_editions"
    );
    expect(sql).toContain(
      "create table if not exists public.national_team_results"
    );
    expect(sql).toContain(
      "create table if not exists public.national_formula_versions"
    );
    expect(sql).toContain(
      "create table if not exists public.national_ranking_snapshots"
    );
    expect(sql).toContain(
      "create table if not exists public.national_ranking_rows"
    );
    expect(normalizedSql).toMatch(latestViewPattern);
  });

  it("preserves source dataset identities and quality constraints", () => {
    const sql = readMigration() ?? "";

    expect(sql).toContain("unique (university_name, club_name)");
    expect(sql).toContain("scope text not null check (scope in ('national', 'regional'))");
    expect(sql).toContain("scope_factor numeric not null check (scope_factor in (1.00, 0.85))");
    expect(sql).toContain("unique (tournament_id, edition_year, gender)");
    expect(sql).toContain("source_status text not null check (source_status in ('verified', 'unresolved', 'missing'))");
    expect(sql).toContain("quality_status text not null check (quality_status in ('verified', 'unresolved', 'missing', 'did_not_enter'))");
    expect(sql).toContain("team_label text not null default ''");
    expect(sql).toContain("source_entry_id text not null default ''");
    expect(sql).toContain("source_entry_id = '' or btrim(source_entry_id) <> ''");
    expect(sql).toContain(
      "unique (edition_id, source_team_name, team_label, source_entry_id)"
    );
    expect(sql).not.toContain("unique (edition_id, source_team_name)");
    expect(sql).toContain(
      "quality_status <> 'verified' or club_id is not null"
    );
  });

  it("retains an unknown stage only for a non-verified source result", () => {
    const initialMigration = normalizeSql(readMigration());
    const migration = readMigrationEndingWith(
      "_allow_unresolved_national_result_stage.sql"
    );
    const sql = normalizeSql(migration);

    expect(migration).not.toBeNull();
    expect(initialMigration).toContain("stage text not null check");
    expect(initialMigration).not.toContain(
      "quality_status <> 'verified' or stage is not null"
    );
    expect(sql).toContain(
      "alter table public.national_team_results alter column stage drop not null"
    );
    expect(sql).toContain(
      "check (quality_status <> 'verified' or stage is not null)"
    );
  });

  it("stores formula versions, immutable snapshots, and precise ranking rows", () => {
    const sql = readMigration() ?? "";

    expect(sql).toContain("version text primary key");
    expect(sql).toContain("config jsonb not null");
    expect(sql).toContain("effective_on date not null");
    expect(sql).toContain("source_references jsonb not null");
    expect(sql).toContain("is_active boolean not null default false");
    expect(sql).toContain("national_formula_versions_one_active_idx");
    expect(sql).toContain(
      "formula_version text not null references public.national_formula_versions(version)"
    );
    expect(sql).toContain("source_revision text not null");
    expect(sql).toContain("unique (formula_version, source_revision)");
    expect(sql).toContain("national_ranking_snapshots_one_published_idx");
    expect(sql).toContain("where is_published");
    expect(sql).toContain("gender text not null check (gender in ('men', 'women', 'combined'))");
    expect(sql).toContain("rank integer not null check (rank > 0)");
    expect(sql).toContain("total_points numeric not null check (total_points >= 0)");
    expect(sql).toContain("latest_edition_points numeric not null check (latest_edition_points >= 0)");
    expect(sql).toContain("max_contribution numeric not null check (max_contribution >= 0)");
    expect(sql).toContain("contributions jsonb not null default '[]'::jsonb");
    expect(sql).toContain("unique (snapshot_id, gender, club_id)");
    expect(sql).toContain("unique (snapshot_id, gender, rank)");
  });

  it("exposes formula and snapshot audit fields required by readers", () => {
    const sql = readMigration() ?? "";
    const normalizedSql = normalizeSql(sql);

    expect(normalizedSql).toContain("effective_on date not null");
    expect(normalizedSql).toContain("formula.effective_on");
    expect(normalizedSql).toContain("snapshot.created_at as calculated_at");
    expect(normalizedSql).toContain("snapshot.published_at");
  });

  it("indexes every foreign key and the public ranking order", () => {
    const sql = readMigration() ?? "";

    expect(sql).toContain("national_club_aliases_club_id_idx");
    expect(sql).toContain("on public.national_club_aliases (club_id)");
    expect(sql).toContain("national_tournament_editions_tournament_id_idx");
    expect(sql).toContain("on public.national_tournament_editions (tournament_id)");
    expect(sql).toContain("national_team_results_edition_id_idx");
    expect(sql).toContain("on public.national_team_results (edition_id)");
    expect(sql).toContain("national_team_results_club_id_idx");
    expect(sql).toContain("on public.national_team_results (club_id)");
    expect(sql).toContain("national_ranking_snapshots_formula_version_idx");
    expect(sql).toContain("on public.national_ranking_snapshots (formula_version)");
    expect(sql).toContain("national_ranking_rows_snapshot_id_idx");
    expect(sql).toContain("on public.national_ranking_rows (snapshot_id)");
    expect(sql).toContain("national_ranking_rows_club_id_idx");
    expect(sql).toContain("on public.national_ranking_rows (club_id)");
    expect(sql).toContain("national_ranking_rows_snapshot_gender_rank_idx");
    expect(sql).toContain("on public.national_ranking_rows (snapshot_id, gender, rank)");
  });

  it("enables RLS and grants only the intended public surface", () => {
    const sql = readMigration() ?? "";
    const normalizedSql = normalizeSql(sql);
    const policyBlocks = createPolicyBlocks(sql);
    const serviceRolePolicyBlocks = policyBlocks.filter((block) =>
      /\bto\s+service_role\b/.test(block)
    );

    expect(serviceRolePolicyBlocks).toHaveLength(nationalTables.length);

    for (const table of nationalTables) {
      expect(normalizedSql).toMatch(
        new RegExp(
          `\\balter\\s+table\\s+public\\.${escapeRegExp(table)}` +
            `\\s+enable\\s+row\\s+level\\s+security\\s*;`,
          "i"
        )
      );
      expect(normalizedSql).toMatch(
        policyPattern(
          table,
          "all",
          "service_role",
          "using\\s*\\(\\s*true\\s*\\)\\s+with\\s+check\\s*\\(\\s*true\\s*\\)"
        )
      );
      expect(
        serviceRolePolicyBlocks.some((block) =>
          policyPattern(
            table,
            "all",
            "service_role",
            "using\\s*\\(\\s*true\\s*\\)\\s+with\\s+check\\s*\\(\\s*true\\s*\\)"
          ).test(block)
        )
      ).toBe(true);
    }

    for (const table of [
      "national_clubs",
      "national_tournaments",
      "national_formula_versions",
    ]) {
      expect(normalizedSql).toMatch(
        policyPattern(
          table,
          "select",
          "anon",
          "using\\s*\\(\\s*is_active\\s*=\\s*true\\s*\\)"
        )
      );
    }

    expect(normalizedSql).toMatch(
      policyPattern(
        "national_ranking_snapshots",
        "select",
        "anon",
        "using\\s*\\(\\s*is_published\\s*=\\s*true\\s*\\)"
      )
    );
    expect(normalizedSql).toMatch(
      policyPattern(
        "national_ranking_rows",
        "select",
        "anon",
        "using\\s*\\(\\s*exists\\s*\\([^;]*snapshot\\.is_published\\s*=\\s*true[^;]*\\)\\s*\\)"
      )
    );

    const anonGrants = parseGrants(sql).filter((grant) => grant.roles.includes("anon"));
    const actualAnonSelectTargets = anonGrants.flatMap((grant) => grant.targets);

    expect(
      anonGrants.every(
        (grant) => grant.privileges.length === 1 && grant.privileges[0] === "select"
      )
    ).toBe(true);
    expect([...actualAnonSelectTargets].sort()).toEqual([...anonSelectTargets].sort());

    for (const target of privateAnonTargets) {
      expect(actualAnonSelectTargets).not.toContain(target);
      expect(normalizedSql).not.toMatch(
        policyForRolePattern(target.replace(/^public\./, ""), "anon")
      );
    }

    expect(normalizedSql).toMatch(
      /\bgrant\s+usage\s*,\s*select\s+on\s+all\s+sequences\s+in\s+schema\s+public\s+to\s+service_role\s*;/i
    );
    expect(normalizedSql).not.toMatch(/\bauth\s*\.\s*role\s*\(\s*\)/i);
    expect(normalizedSql).not.toMatch(/\bsecurity\s+definer\b/i);
  });
});
