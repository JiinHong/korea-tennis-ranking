import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readMigration(): string | null {
  const directory = join(process.cwd(), "supabase/migrations");
  const filename = readdirSync(directory).find((entry) =>
    entry.endsWith("_simplify_injury_status.sql")
  );

  return filename ? readFileSync(join(directory, filename), "utf8") : null;
}

describe("injury status simplification migration", () => {
  it("removes period and exemption injury structures", () => {
    const sql = readMigration();

    expect(sql).not.toBeNull();
    expect(sql).toContain("drop table if exists public.injury_periods");
    expect(sql).toContain("drop column if exists injury_exemption_limit");
    expect(sql).toContain(
      "drop column if exists injury_notice_deadline_days_before_month_end"
    );
  });
});
