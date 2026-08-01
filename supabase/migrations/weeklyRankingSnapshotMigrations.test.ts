import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readMigration(): string | null {
  const directory = join(process.cwd(), "supabase/migrations");
  const filename = readdirSync(directory).find((entry) =>
    entry.endsWith("_add_weekly_ranking_snapshots.sql")
  );

  return filename ? readFileSync(join(directory, filename), "utf8") : null;
}

describe("weekly ranking snapshot migration", () => {
  it("stores one immutable rank per player and week", () => {
    const sql = readMigration();

    expect(sql).not.toBeNull();
    expect(sql).toContain("create table public.weekly_ranking_snapshots");
    expect(sql).toContain("primary key (season_id, player_id, week_start)");
    expect(sql).toContain("check (rank > 0)");
    expect(sql).toContain("on conflict (season_id, player_id, week_start) do nothing");
  });

  it("allows public reads but keeps snapshot creation private", () => {
    const sql = readMigration();

    expect(sql).toContain("enable row level security");
    expect(sql).toContain("for select");
    expect(sql).toContain("to anon, authenticated");
    expect(sql).toContain("create or replace function private.capture_weekly_ranking_snapshots");
    expect(sql).toContain("revoke all on function private.capture_weekly_ranking_snapshots");
  });

  it("captures every Monday 0시 KST and seeds the current week", () => {
    const sql = readMigration();

    expect(sql).toContain("'weekly-ranking-snapshot'");
    expect(sql).toContain("'0 15 * * 0'");
    expect(sql).toContain("select private.capture_weekly_ranking_snapshots()");
  });
});
