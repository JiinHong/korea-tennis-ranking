import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readMigration(): string | null {
  const directory = join(process.cwd(), "supabase/migrations");
  const filename = readdirSync(directory).find((entry) =>
    entry.endsWith("_adjust_admin_player_rank.sql")
  );

  return filename ? readFileSync(join(directory, filename), "utf8") : null;
}

describe("admin rank adjustment migration", () => {
  it("wraps the existing player RPC with a backward-compatible rank parameter", () => {
    const sql = readMigration();

    expect(sql).not.toBeNull();
    expect(sql).toContain(
      "alter function public.manage_admin_player_with_secret("
    );
    expect(sql).toContain("rename to manage_admin_player_base_with_secret");
    expect(sql).toContain("set schema private");
    expect(sql).toContain(
      "create function public.manage_admin_player_with_secret("
    );
    expect(sql).toContain("p_target_rank integer default null");
    expect(sql).toContain("p_action not in ('add', 'rename', 'status', 'rank')");
    expect(sql).toContain("private.manage_admin_player_base_with_secret(");
    expect(sql).not.toContain("adjust_admin_player_rank_with_secret");
  });

  it("locks and validates the current non-left roster before moving ranks", () => {
    const sql = readMigration();

    expect(sql).toContain("order by season_player.current_rank");
    expect(sql).toContain("for update");
    expect(sql).toContain("v_old_status = 'left'");
    expect(sql).toContain("season_player.status <> 'left'");
    expect(sql).toContain("p_target_rank > v_ranked_player_count");
    expect(sql).toContain("p_target_rank = v_old_rank");
    expect(sql).toContain("현재 순위와 다른 목표 순위를 선택해주세요.");
  });

  it("uses an offset before applying both upward and downward rank shifts", () => {
    const sql = readMigration();

    expect(sql).toContain("v_rank_offset integer");
    expect(sql).toContain("set current_rank = current_rank + v_rank_offset");
    expect(sql).toContain("p_target_rank < v_old_rank");
    expect(sql).toContain("p_target_rank > v_old_rank");
    expect(sql).toContain("original_rank + 1");
    expect(sql).toContain("original_rank - 1");
    expect(sql).toContain("jsonb_agg");
  });

  it("records the manual correction in ranking and admin audit logs", () => {
    const sql = readMigration();

    expect(sql).toContain("'admin_rank_adjusted'");
    expect(sql).toContain("'change_rank'");
    expect(sql).toContain("insert into public.ranking_events");
    expect(sql).toContain("insert into public.admin_action_logs");
    expect(sql).toContain("'oldRank'");
    expect(sql).toContain("'rank'");
    expect(sql).toContain("'changes'");
  });

  it("retains the secret guard and explicit function privileges", () => {
    const sql = readMigration();

    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("where app_secret.name = 'admin_write'");
    expect(sql).toContain("extensions.crypt(p_admin_secret, v_secret_hash)");
    expect(sql).toContain(
      "revoke execute on function public.manage_admin_player_with_secret"
    );
    expect(sql).toContain("from public, authenticated, anon");
    expect(sql).toContain("to anon, service_role");
  });
});
