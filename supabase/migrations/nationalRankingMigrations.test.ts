import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260712120000_create_national_rankings.sql"
);

function readMigration(): string | null {
  return existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : null;
}

describe("national ranking migration", () => {
  it("creates the national ranking tables and latest view", () => {
    const sql = readMigration();

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
    expect(sql).toContain("with (security_invoker = true)");
    expect(sql).toContain("create view public.latest_national_rankings");
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

  it("stores formula versions, immutable snapshots, and precise ranking rows", () => {
    const sql = readMigration() ?? "";

    expect(sql).toContain("version text primary key");
    expect(sql).toContain("config jsonb not null");
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

    for (const table of [
      "national_clubs",
      "national_club_aliases",
      "national_tournaments",
      "national_tournament_editions",
      "national_team_results",
      "national_formula_versions",
      "national_ranking_snapshots",
      "national_ranking_rows",
    ]) {
      expect(sql).toContain(
        `alter table public.${table} enable row level security`
      );
      expect(sql).toContain(`on public.${table} to service_role`);
    }

    expect(sql).toContain("create policy \"Public can read active national clubs\"");
    expect(sql).toContain("using (is_active = true)");
    expect(sql).toContain(
      "create policy \"Public can read active national tournaments\""
    );
    expect(sql).toContain(
      "create policy \"Public can read active national formula versions\""
    );
    expect(sql).toContain(
      "create policy \"Public can read published national ranking snapshots\""
    );
    expect(sql).toContain(
      "create policy \"Public can read published national ranking rows\""
    );
    expect(sql).toContain("to anon");
    expect(sql).toContain("to service_role");
    expect(sql).toContain("grant select on public.national_clubs to anon");
    expect(sql).toContain("grant select on public.national_tournaments to anon");
    expect(sql).toContain(
      "grant select on public.national_formula_versions to anon"
    );
    expect(sql).toContain(
      "grant select on public.national_ranking_snapshots to anon"
    );
    expect(sql).toContain(
      "grant select on public.national_ranking_rows to anon"
    );
    expect(sql).not.toContain("grant select on public.national_club_aliases to anon");
    expect(sql).not.toContain(
      "grant select on public.national_tournament_editions to anon"
    );
    expect(sql).not.toContain("grant select on public.national_team_results to anon");
    expect(sql).toContain("grant usage, select on all sequences in schema public to service_role");
    expect(sql).not.toContain("auth.role()");
    expect(sql).not.toContain("security definer");
  });
});
