import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readAdminMatchMigration(): string | null {
  const directory = join(process.cwd(), "supabase/migrations");
  const filename = readdirSync(directory).find((entry) =>
    entry.endsWith("_manage_admin_matches.sql")
  );

  return filename ? readFileSync(join(directory, filename), "utf8") : null;
}

describe("admin match migration", () => {
  it("adds a stable per-season match sequence", () => {
    const sql = readAdminMatchMigration();

    expect(sql).not.toBeNull();
    expect(sql).toContain("add column if not exists sequence_no bigint");
    expect(sql).toContain("matches_season_sequence_no_idx");
    expect(sql).toContain("private.assign_match_sequence");
    expect(sql).toContain("before insert on public.matches");
  });

  it("reconstructs the imported season baseline before enabling replay", () => {
    const sql = readAdminMatchMigration();

    expect(sql).toContain("create temporary table match_rank_baseline");
    expect(sql).toContain("order by match_row.played_on desc");
    expect(sql).toContain("set initial_rank = baseline.working_rank");
    expect(sql).toContain("순위 기준점 복원 검증에 실패했습니다.");
  });

  it("replays only confirmed matches in deterministic order", () => {
    const sql = readAdminMatchMigration();

    expect(sql).toContain("create or replace function private.recalculate_season_rankings");
    expect(sql).toContain("match_row.status = 'confirmed'");
    expect(sql).toContain("order by match_row.played_on, match_row.sequence_no");
    expect(sql).toContain("challenger_rank_before");
    expect(sql).toContain("defender_rank_before");
  });

  it("guards edit, void, and restore with the private admin secret", () => {
    const sql = readAdminMatchMigration();

    expect(sql).toContain("create or replace function public.manage_admin_match_with_secret");
    expect(sql).toContain("p_action not in ('edit', 'void', 'restore')");
    expect(sql).toContain("where app_secret.name = 'admin_write'");
    expect(sql).toContain("extensions.crypt(p_admin_secret, v_secret_hash)");
    expect(sql).toContain("perform private.recalculate_season_rankings(v_season_id)");
  });

  it("keeps mutations auditable and grants only the guarded RPC", () => {
    const sql = readAdminMatchMigration();

    expect(sql).toContain("insert into public.ranking_events");
    expect(sql).toContain("insert into public.admin_action_logs");
    expect(sql).toContain("revoke execute on function public.manage_admin_match_with_secret");
    expect(sql).toContain("from public, authenticated, anon");
    expect(sql).toContain("to anon, service_role");
  });
});
