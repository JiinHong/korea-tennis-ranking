import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("public match migrations", () => {
  it("serializes submissions that share the same source key", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260710113000_serialize_public_match_submissions.sql"
      ),
      "utf8"
    );

    const lockPosition = sql.indexOf("pg_advisory_xact_lock");
    const recordPosition = sql.indexOf("return public.record_public_match");

    expect(lockPosition).toBeGreaterThan(-1);
    expect(recordPosition).toBeGreaterThan(lockPosition);
  });
});
