import fs from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

const migrationsDirectory = path.join(process.cwd(), "supabase", "migrations");

function readMigration(): string {
  const entry = fs
    .readdirSync(migrationsDirectory)
    .find((name) => name.endsWith("_add_match_ranking_movements.sql"));

  if (!entry) {
    return "";
  }

  return fs.readFileSync(path.join(migrationsDirectory, entry), "utf8");
}

function readAllMovementMigrations(): string {
  return fs
    .readdirSync(migrationsDirectory)
    .filter((name) => name.includes("match_ranking_movement"))
    .map((name) => fs.readFileSync(path.join(migrationsDirectory, name), "utf8"))
    .join("\n");
}

describe("match ranking movement migration", () => {
  test("stores per-player rank movement caused by confirmed matches", () => {
    const sql = readMigration();

    expect(sql).toContain("create table public.match_ranking_movements");
    expect(sql).toContain("match_id uuid not null");
    expect(sql).toContain("player_id uuid not null");
    expect(sql).toContain("rank_delta integer not null");
    expect(sql).toContain("unique (match_id, player_id)");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("for select");
  });

  test("rebuilds movement rows while replaying matches but not settlements", () => {
    const sql = readMigration();

    expect(sql).toContain("delete from public.match_ranking_movements");
    expect(sql).toContain("insert into public.match_ranking_movements");
    expect(sql).toContain("v_match.played_on");
    expect(sql).toContain("v_challenger_rank - v_defender_rank");
    expect(sql).toContain("-1");
    expect(sql).not.toContain("'monthly_settlement'::text");
  });

  test("backfills only current seasons whose confirmed matches have a complete roster", () => {
    const sql = readMigration();

    expect(sql).toContain("where season.is_current = true");
    expect(sql).toContain("match_row.challenger_player_id");
    expect(sql).toContain("match_row.defender_player_id");
    expect(sql).toContain("not exists");
  });

  test("indexes every foreign key used to filter movement history", () => {
    const sql = readAllMovementMigrations();

    expect(sql).toContain("match_ranking_movements_club_id_idx");
    expect(sql).toContain("match_ranking_movements_player_id_idx");
  });
});
