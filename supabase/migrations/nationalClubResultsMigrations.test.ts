import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260713151047_expose_public_national_club_results.sql"
);

function readMigration(): string {
  return readFileSync(migrationPath, "utf8").replace(/\s+/g, " ").trim();
}

describe("public national club results migration", () => {
  it("익명 사용자는 검증된 16강 이상 결과에 필요한 열만 읽는다", () => {
    const sql = readMigration();

    expect(sql).toMatch(
      /create policy "Public can read verified national tournament editions" on public\.national_tournament_editions for select to anon using \(source_status = 'verified'\)/i
    );
    expect(sql).toMatch(
      /create policy "Public can read verified top-16 national team results" on public\.national_team_results for select to anon using \(\s*quality_status = 'verified' and club_id is not null and stage in \(\s*'champion', 'runner_up', 'semifinal', 'quarterfinal', 'round_of_16'\s*\)\s*\)/i
    );
    expect(sql).toMatch(
      /grant select \(\s*id, tournament_id, edition_year, gender, actual_entrants, source_status\s*\) on public\.national_tournament_editions to anon/i
    );
    expect(sql).toMatch(
      /grant select \(\s*id, edition_id, club_id, source_team_name, team_label, stage, quality_status\s*\) on public\.national_team_results to anon/i
    );
  });

  it("동아리별 대회 성적 공개 뷰는 같은 대회에서 최고 성적 한 팀만 남긴다", () => {
    const sql = readMigration();

    expect(sql).toContain(
      "create or replace view public.public_national_club_results with (security_invoker = true)"
    );
    expect(sql).toContain(
      "row_number() over ( partition by result.club_id, edition.id"
    );
    expect(sql).toContain("ranked_result.result_rank = 1");
    expect(sql).toContain("left join ranked_results as ranked_result");
    expect(sql).toContain(
      "grant select on public.public_national_club_results to anon"
    );
    expect(sql).not.toContain("security definer");
  });
});
