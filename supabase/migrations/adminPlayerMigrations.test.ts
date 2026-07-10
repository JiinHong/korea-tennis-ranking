import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readAdminPlayerMigration(): string | null {
  const directory = join(process.cwd(), "supabase/migrations");
  const filename = readdirSync(directory).find((entry) =>
    entry.endsWith("_manage_admin_players.sql")
  );

  return filename ? readFileSync(join(directory, filename), "utf8") : null;
}

describe("admin player migration", () => {
  it("guards the mutation RPC with the private admin secret", () => {
    const sql = readAdminPlayerMigration();

    expect(sql).not.toBeNull();
    expect(sql).toContain("create or replace function public.manage_admin_player_with_secret");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = ''");
    expect(sql).toContain("where app_secret.name = 'admin_write'");
    expect(sql).toContain("extensions.crypt(p_admin_secret, v_secret_hash)");
    expect(sql).toContain("p_action not in ('add', 'rename', 'status')");
  });

  it("normalizes ranks and records both ranking and admin audit events", () => {
    const sql = readAdminPlayerMigration();

    expect(sql).toContain("create or replace function private.normalize_season_ranks");
    expect(sql).toContain("row_number() over");
    expect(sql).toContain("insert into public.ranking_events");
    expect(sql).toContain("insert into public.admin_action_logs");
    expect(sql).toContain("'player_added'");
    expect(sql).toContain("'player_renamed'");
    expect(sql).toContain("'player_status_changed'");
  });

  it("revokes default function access before granting the guarded RPC", () => {
    const sql = readAdminPlayerMigration();

    expect(sql).toContain("revoke all on function private.normalize_season_ranks(uuid)");
    expect(sql).toContain("revoke execute on function public.manage_admin_player_with_secret");
    expect(sql).toContain("from public, authenticated, anon");
    expect(sql).toContain("to anon, service_role");
  });
});
