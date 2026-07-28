import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readPetcLegacyMatchSyncMigration(): string | null {
  const directory = join(process.cwd(), "supabase/migrations");
  const filename = readdirSync(directory).find((entry) =>
    entry.endsWith("_sync_petc_legacy_matches.sql")
  );

  return filename ? readFileSync(join(directory, filename), "utf8") : null;
}

describe("PETC legacy match sync migration", () => {
  it("voids the scoreless duplicate imports without deleting their audit trail", () => {
    const sql = readPetcLegacyMatchSyncMigration();

    expect(sql).not.toBeNull();
    expect(sql).toContain("source_key in ('current:2', 'current:3', 'current:4')");
    expect(sql).toContain("set status = 'voided'");
    expect(sql).not.toContain("delete from public.matches");
  });

  it("imports only the seven complete legacy matches", () => {
    const sql = readPetcLegacyMatchSyncMigration();

    for (const sourceKey of [
      "current:5",
      "current:10",
      "current:11",
      "current:12",
      "current:13",
      "current:14",
      "current:15",
    ]) {
      expect(sql).toContain(sourceKey);
    }

    for (const scorelessSourceKey of [
      "current:6",
      "current:7",
      "current:8",
      "current:9",
    ]) {
      expect(sql).not.toContain(scorelessSourceKey);
    }
  });

  it("synchronizes the complete current PETC ranking and verifies the result", () => {
    const sql = readPetcLegacyMatchSyncMigration();

    expect(sql).toContain("jsonb_to_recordset");
    expect(sql).toContain(
      "perform private.recalculate_season_rankings(v_season_id)"
    );
    expect(sql).toContain("PETC 순위 동기화 검증에 실패했습니다.");
    expect(sql).toContain("PETC 경기 동기화 검증에 실패했습니다.");
  });
});
