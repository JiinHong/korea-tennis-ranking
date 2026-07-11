import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readMigration(): string | null {
  const directory = join(process.cwd(), "supabase/migrations");
  const filename = readdirSync(directory).find((entry) =>
    entry.endsWith("_expose_monthly_automation_status.sql")
  );

  return filename ? readFileSync(join(directory, filename), "utf8") : null;
}

function readMigrationBySuffix(suffix: string): string | null {
  const directory = join(process.cwd(), "supabase/migrations");
  const filename = readdirSync(directory).find((entry) =>
    entry.endsWith(suffix)
  );

  return filename ? readFileSync(join(directory, filename), "utf8") : null;
}

function readAllMigrations(): string {
  const directory = join(process.cwd(), "supabase/migrations");

  return readdirSync(directory)
    .filter((entry) => entry.endsWith(".sql"))
    .map((entry) => readFileSync(join(directory, entry), "utf8"))
    .join("\n");
}

describe("monthly automation status migration", () => {
  it("creates an auditable sanitized run table", () => {
    const sql = readMigration();

    expect(sql).not.toBeNull();
    expect(sql).toContain(
      "create table if not exists public.monthly_settlement_automation_runs"
    );
    expect(sql).toContain("admin_action_log_id uuid not null unique");
    expect(sql).toContain("status text not null check");
    expect(sql).toContain("'succeeded', 'skipped', 'failed'");
    expect(sql).toContain("target_month date not null");
    expect(sql).toContain(
      "error_code is null or error_code ~ '^[0-9A-Z]{5}$'"
    );
    expect(sql).toContain("public_message text not null");
    expect(sql).toContain("executed_at timestamptz not null");
  });

  it("allows anonymous reads without granting public writes", () => {
    const sql = readMigration();

    expect(sql).toContain(
      "alter table public.monthly_settlement_automation_runs enable row level security"
    );
    expect(sql).toContain(
      'create policy "Public can read monthly settlement automation runs"'
    );
    expect(sql).toContain(
      "grant select on public.monthly_settlement_automation_runs to anon"
    );
    expect(sql).not.toContain(
      "grant insert on public.monthly_settlement_automation_runs to anon"
    );
    expect(sql).not.toContain(
      "grant update on public.monthly_settlement_automation_runs to anon"
    );
  });

  it("projects only automatic settlement actions through a private trigger", () => {
    const sql = readMigration();

    expect(sql).toContain(
      "create or replace function private.capture_monthly_settlement_automation_run"
    );
    expect(sql).toContain(
      "create trigger capture_monthly_settlement_automation_run"
    );
    expect(sql).toContain(
      "after insert on public.admin_action_logs"
    );
    expect(sql).toContain(
      "'automatic_monthly_inactivity_penalty_applied'"
    );
    expect(sql).toContain(
      "'automatic_monthly_inactivity_penalty_skipped'"
    );
    expect(sql).toContain(
      "'automatic_monthly_inactivity_penalty_failed'"
    );
    expect(sql).toContain(
      "revoke all on function private.capture_monthly_settlement_automation_run"
    );
    expect(sql).toContain("from public, authenticated, anon");
  });

  it("exposes fixed guidance but never copies the raw database error", () => {
    const sql = readMigration() ?? "";

    expect(sql).toContain("자동 정산을 완료했습니다.");
    expect(sql).toContain("이미 정산되어 건너뛰었습니다.");
    expect(sql).toContain(
      "자동 정산에 실패했습니다. 미리보기에서 수동 정산을 확인해주세요."
    );
    expect(sql).toContain("payload ->> 'errorCode'");
    expect(sql).not.toContain("new.payload ->> 'errorCode',");
    expect(sql).not.toContain("action_log.payload ->> 'errorCode',");
    expect(sql).not.toContain("payload ->> 'errorMessage'");
  });

  it("backfills prior automatic logs without duplicating projections", () => {
    const sql = readMigration();

    expect(sql).toContain("insert into public.monthly_settlement_automation_runs");
    expect(sql).toContain("from public.admin_action_logs as action_log");
    expect(sql).toContain("join public.seasons as season");
    expect(sql).toContain(
      "season.id::text = lower(action_log.payload ->> 'seasonId')"
    );
    expect(sql).toContain(
      "left join public.monthly_settlements as settlement"
    );
    expect(sql).toContain("on conflict (admin_action_log_id) do nothing");
    expect(sql).toContain(
      "'^[1-9][0-9]{3}-(0[1-9]|1[0-2])$'"
    );
  });

  it("exposes only the latest run per club without relying on API row limits", () => {
    const sql = readMigrationBySuffix(
      "_create_latest_monthly_automation_status_view.sql"
    );

    expect(sql).not.toBeNull();
    expect(sql).toContain(
      "create or replace view public.latest_monthly_settlement_automation_runs"
    );
    expect(sql).toContain("with (security_invoker = true)");
    expect(sql).toContain("distinct on (automation_run.club_id)");
    expect(sql).toContain(
      "grant select on public.latest_monthly_settlement_automation_runs to anon"
    );
  });

  it("indexes the foreign keys used to maintain automation run history", () => {
    const sql = readAllMigrations();

    expect(sql).toContain(
      "monthly_settlement_automation_runs_season_id_idx"
    );
    expect(sql).toContain(
      "on public.monthly_settlement_automation_runs (season_id)"
    );
    expect(sql).toContain(
      "monthly_settlement_automation_runs_settlement_id_idx"
    );
    expect(sql).toContain(
      "on public.monthly_settlement_automation_runs (settlement_id)"
    );
  });

  it("hardens an already-applied status table before adding the SQLSTATE constraint", () => {
    const sql = readMigrationBySuffix(
      "_harden_monthly_automation_status.sql"
    );

    expect(sql).not.toBeNull();
    expect(sql).toContain(
      "update public.monthly_settlement_automation_runs"
    );
    expect(sql).toContain("set error_code = null");
    expect(sql).toContain(
      "drop constraint if exists monthly_settlement_automation_runs_error_code_check"
    );
    expect(sql).toContain(
      "add constraint monthly_settlement_automation_runs_error_code_check"
    );
    expect(sql).toContain(
      "create or replace function private.capture_monthly_settlement_automation_run"
    );
  });
});
