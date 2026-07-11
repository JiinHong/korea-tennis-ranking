import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readAutomationMigration(): string | null {
  const directory = join(process.cwd(), "supabase/migrations");
  const filename = readdirSync(directory).find((entry) =>
    entry.endsWith("_automate_monthly_inactivity_settlements.sql")
  );

  return filename ? readFileSync(join(directory, filename), "utf8") : null;
}

describe("monthly settlement automation migration", () => {
  it("installs Supabase Cron and registers one named KST settlement job", () => {
    const sql = readAutomationMigration();

    expect(sql).not.toBeNull();
    expect(sql).toContain(
      "create extension if not exists pg_cron with schema pg_catalog"
    );
    expect(sql).toContain("'monthly-inactivity-settlement'");
    expect(sql).toContain("'10 15 28-31 * *'");
    expect(sql).toContain("private.run_monthly_inactivity_settlements()");
  });

  it("uses one private settlement core for automatic and manual application", () => {
    const sql = readAutomationMigration();

    expect(sql).toContain(
      "create or replace function private.apply_monthly_inactivity_penalty"
    );
    expect(sql).toContain(
      "create or replace function public.apply_monthly_penalty_with_secret"
    );
    expect(sql).toContain("return private.apply_monthly_inactivity_penalty(");
    expect(sql).toContain("p_actor_type");
    expect(sql).toContain("'admin'");
    expect(sql).toContain("'system'");
  });

  it("settles only the prior month on the first day in Seoul", () => {
    const sql = readAutomationMigration();

    expect(sql).toContain("p_run_at at time zone 'Asia/Seoul'");
    expect(sql).toContain("extract(day from v_seoul_timestamp) <> 1");
    expect(sql).toContain("'status', 'not_due'");
    expect(sql).toContain("date_trunc('month', v_seoul_timestamp)");
    expect(sql).toContain("interval '1 month'");
  });

  it("isolates each club failure and records automatic outcomes", () => {
    const sql = readAutomationMigration();

    expect(sql).toContain("when unique_violation then");
    expect(sql).toContain("when others then");
    expect(sql).toContain(
      "'automatic_monthly_inactivity_penalty_applied'"
    );
    expect(sql).toContain(
      "'automatic_monthly_inactivity_penalty_skipped'"
    );
    expect(sql).toContain(
      "'automatic_monthly_inactivity_penalty_failed'"
    );
    expect(sql).toContain("returned_sqlstate");
    expect(sql).toContain("message_text");
  });

  it("treats a unique violation as skipped only when a settlement exists", () => {
    const sql = readAutomationMigration() ?? "";
    const uniqueViolationStart = sql.indexOf("when unique_violation then");
    const otherFailureStart = sql.indexOf("when others then", uniqueViolationStart);
    const uniqueViolationBlock = sql.slice(
      uniqueViolationStart,
      otherFailureStart
    );

    expect(uniqueViolationStart).toBeGreaterThan(-1);
    expect(otherFailureStart).toBeGreaterThan(uniqueViolationStart);
    expect(uniqueViolationBlock).toContain(
      "if v_existing_settlement_id is null then"
    );
    expect(uniqueViolationBlock).toContain(
      "'automatic_monthly_inactivity_penalty_failed'"
    );
    expect(uniqueViolationBlock).toContain(
      "'automatic_monthly_inactivity_penalty_skipped'"
    );
  });

  it("keeps automatic functions private and the existing manual RPC guarded", () => {
    const sql = readAutomationMigration();

    expect(sql).toContain(
      "revoke all on function private.apply_monthly_inactivity_penalty"
    );
    expect(sql).toContain(
      "revoke all on function private.run_monthly_inactivity_settlements"
    );
    expect(sql).toContain("from public, authenticated, anon");
    expect(sql).toContain("where app_secret.name = 'admin_write'");
    expect(sql).toContain("extensions.crypt(p_admin_secret, v_secret_hash)");
    expect(sql).toContain("to anon, service_role");
  });
});
