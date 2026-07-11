import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readMigration(): string | null {
  const directory = join(process.cwd(), "supabase/migrations");
  const filename = readdirSync(directory).find((entry) =>
    entry.endsWith("_monthly_inactivity_settlements.sql")
  );

  return filename ? readFileSync(join(directory, filename), "utf8") : null;
}

function readFutureMemberMigration(): string | null {
  const directory = join(process.cwd(), "supabase/migrations");
  const filename = readdirSync(directory).find((entry) =>
    entry.endsWith("_exclude_future_month_members.sql")
  );

  return filename ? readFileSync(join(directory, filename), "utf8") : null;
}

function readPublicMatchIdempotencyMigration(): string | null {
  const directory = join(process.cwd(), "supabase/migrations");
  const filename = readdirSync(directory).find((entry) =>
    entry.endsWith("_preserve_public_match_idempotency.sql")
  );

  return filename ? readFileSync(join(directory, filename), "utf8") : null;
}

function readSeededMembershipBackfillMigration(): string | null {
  const directory = join(process.cwd(), "supabase/migrations");
  const filename = readdirSync(directory).find((entry) =>
    entry.endsWith("_backfill_seeded_membership_dates.sql")
  );

  return filename ? readFileSync(join(directory, filename), "utf8") : null;
}

describe("monthly inactivity settlement migration", () => {
  it("stores one auditable settlement per season and month behind RLS", () => {
    const sql = readMigration();

    expect(sql).not.toBeNull();
    expect(sql).toContain("create table if not exists public.monthly_settlements");
    expect(sql).toContain("unique (season_id, target_month)");
    expect(sql).toContain("target_player_ids uuid[]");
    expect(sql).toContain("eligible_player_ids uuid[]");
    expect(sql).toContain("rank_before jsonb");
    expect(sql).toContain("rank_after jsonb");
    expect(sql).toContain("alter table public.monthly_settlements enable row level security");
    expect(sql).toContain("create policy \"Public can read monthly settlements\"");
    expect(sql).toContain("grant select on public.monthly_settlements to anon");
  });

  it("replays confirmed matches and settlements in chronological order", () => {
    const sql = readMigration();

    expect(sql).toContain(
      "create or replace function private.apply_monthly_penalty_to_rankings"
    );
    expect(sql).toContain(
      "create or replace function private.recalculate_season_rankings"
    );
    expect(sql).toContain("settlement.target_month + interval '1 month'");
    expect(sql).toContain("event_row.event_kind = 'settlement'");
    expect(sql).toContain("match_row.status = 'confirmed'");
    expect(sql).toContain("match_row.sequence_no");
  });

  it("applies only a completed in-season month once with the private admin secret", () => {
    const sql = readMigration();

    expect(sql).toContain(
      "create or replace function public.apply_monthly_penalty_with_secret"
    );
    expect(sql).toContain("where app_secret.name = 'admin_write'");
    expect(sql).toContain("extensions.crypt(p_admin_secret, v_secret_hash)");
    expect(sql).toContain("p_target_month <> date_trunc('month', p_target_month)::date");
    expect(sql).toContain("v_target_month_end > v_current_month_start");
    expect(sql).toContain("season.starts_on");
    expect(sql).toContain("status <> 'left'");
    expect(sql).toContain("match_row.status = 'confirmed'");
    expect(sql).toContain("on conflict (season_id, target_month) do nothing");
  });

  it("logs the settlement and exposes only the guarded mutation RPC", () => {
    const sql = readMigration();

    expect(sql).toContain("insert into public.ranking_events");
    expect(sql).toContain("insert into public.admin_action_logs");
    expect(sql).toContain(
      "revoke execute on function public.apply_monthly_penalty_with_secret"
    );
    expect(sql).toContain("from public, authenticated, anon");
    expect(sql).toContain("to anon, service_role");
  });

  it("excludes players who joined after the settled month", () => {
    const sql = readFutureMemberMigration();

    expect(sql).not.toBeNull();
    expect(sql).toContain(
      "create or replace function public.apply_monthly_penalty_with_secret"
    );
    expect(sql).toContain("season_player.joined_at < (");
    expect(sql).toContain("v_target_month_end::timestamp at time zone 'Asia/Seoul'");
    expect(sql).toContain("season_player.status <> 'left'");
  });

  it("stores the applied month's match-count snapshot for later audits", () => {
    const sql = readFutureMemberMigration();

    expect(sql).toContain(
      "add column if not exists match_counts jsonb not null default '{}'::jsonb"
    );
    expect(sql).toContain("jsonb_object_agg");
    expect(sql).toContain("match_counts");
  });

  it("recalculates chronological rankings after a public match is recorded", () => {
    const sql = readFutureMemberMigration();

    expect(sql).toContain(
      "create or replace function public.record_public_match_with_secret"
    );
    expect(sql).toContain("perform private.recalculate_season_rankings(v_season_id)");
    expect(sql).toContain("'defenseResult', v_match.defense_result");
  });

  it("returns an existing source-key submission before rejecting settled dates", () => {
    const sql = readPublicMatchIdempotencyMigration();

    expect(sql).not.toBeNull();
    const duplicateLookup = (sql ?? "").indexOf(
      "match_row.source_key = p_source_key"
    );
    const settledDateGuard = (sql ?? "").indexOf(
      "이미 월간 정산이 적용된 기간의 경기는 입력할 수 없습니다."
    );

    expect(duplicateLookup).toBeGreaterThan(-1);
    expect(settledDateGuard).toBeGreaterThan(duplicateLookup);
  });

  it("keeps every season player's initial rank unique when new players are added", () => {
    const sql = readFutureMemberMigration();
    const duplicateRepair = (sql ?? "").indexOf("duplicate_position > 1");
    const uniqueIndex = (sql ?? "").indexOf(
      "create unique index if not exists season_players_season_initial_rank_key"
    );

    expect(sql).toContain(
      "create unique index if not exists season_players_season_initial_rank_key"
    );
    expect(sql).toContain("create trigger ensure_unique_season_player_initial_rank");
    expect(sql).toContain("max(season_player.initial_rank) + 1");
    expect(duplicateRepair).toBeGreaterThan(-1);
    expect(uniqueIndex).toBeGreaterThan(duplicateRepair);
  });

  it("infers missing season starts from confirmed matches without rewriting explicit starts", () => {
    const baseSql = readMigration() ?? "";
    const futureMemberSql = readFutureMemberMigration() ?? "";
    const initialBackfill = baseSql.slice(
      0,
      baseSql.indexOf("create table if not exists public.monthly_settlements")
    );

    expect(initialBackfill).toContain("match_row.status = 'confirmed'");
    expect(futureMemberSql).not.toContain("earliest_confirmed_month");
  });

  it("backfills only seed-default membership timestamps to the season start", () => {
    const sql = readSeededMembershipBackfillMigration();

    expect(sql).not.toBeNull();
    expect(sql).toContain("season_player.joined_at = season_player.created_at");
    expect(sql).toContain("season.starts_on::timestamp at time zone 'Asia/Seoul'");
    expect(sql).toContain("season.starts_on is not null");
    expect(sql).toContain("having count(*) >= 2");
    expect(sql).toContain("ranking_event.event_type = 'player_added'");
  });
});
