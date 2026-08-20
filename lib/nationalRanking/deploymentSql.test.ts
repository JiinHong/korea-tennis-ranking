import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { loadNationalRankingDataset } from "./dataset";
import { buildIncrementalNationalRankingDeploymentSql } from "./deploymentSql";
import { buildNationalRankingSeedPlan } from "./seedPlan";

describe("buildIncrementalNationalRankingDeploymentSql", () => {
  it("keeps the current snapshot live until the final publish step", () => {
    const dataset = loadNationalRankingDataset();
    const sourceRevision = createHash("sha256")
      .update("national-ranking-snapshot-v10")
      .update("\0")
      .update(JSON.stringify(dataset))
      .digest("hex");
    const plan = buildNationalRankingSeedPlan(dataset, sourceRevision);

    const stages = buildIncrementalNationalRankingDeploymentSql(plan, {
      tournamentSlug: "yeongwol",
      rowBatchSize: 20,
    });

    expect(stages.map((stage) => stage.name)).toEqual([
      "01-yeongwol-source.sql",
      "02-formula.sql",
      "03-snapshot.sql",
      ...Array.from({ length: Math.ceil(plan.rows.length / 20) }, (_, index) =>
        `04-ranking-${String(index + 1).padStart(2, "0")}.sql`
      ),
      "99-publish.sql",
    ]);

    const sourceSql = stages[0].sql;
    expect(sourceSql).toContain('"tournamentSlug":"yeongwol"');
    expect(sourceSql).toContain('"editionKey":"yeongwol-2023-men"');
    expect(sourceSql).not.toContain('"editionKey":"yanggu-2023-men"');
    expect(sourceSql).toContain("delete from public.national_team_results");

    const formulaSql = stages.find((stage) => stage.name === "02-formula.sql")!
      .sql;
    expect(formulaSql).toContain("'national-club-v10'");
    expect(formulaSql).toContain("false");
    expect(formulaSql).not.toContain("set is_active = true");

    const snapshotSql = stages.find(
      (stage) => stage.name === "03-snapshot.sql"
    )!.sql;
    expect(snapshotSql).toContain("is_published");
    expect(snapshotSql).toContain("false");
    expect(snapshotSql).toContain(sourceRevision);

    const publishSql = stages.at(-1)!.sql;
    expect(publishSql).toContain(`expected_row_count integer := ${plan.rows.length}`);
    expect(publishSql).toContain("set is_active = true");
    expect(publishSql).toContain("set is_published = true");
  });
});
