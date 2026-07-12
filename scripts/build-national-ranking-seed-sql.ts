import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadNationalRankingDataset } from "../lib/nationalRanking/dataset";
import { buildNationalRankingSeedPlan } from "../lib/nationalRanking/seedPlan";
import { buildNationalRankingSeedSql } from "../lib/nationalRanking/seedSql";

const dataset = loadNationalRankingDataset();
const revision = createHash("sha256")
  .update(JSON.stringify(dataset))
  .digest("hex");
const sql = buildNationalRankingSeedSql(
  buildNationalRankingSeedPlan(dataset, revision)
);
const outIndex = process.argv.indexOf("--out");

if (outIndex >= 0) {
  const outPath = process.argv[outIndex + 1];

  if (!outPath || outPath.startsWith("--")) {
    throw new Error("--out requires a following path");
  }

  writeFileSync(resolve(outPath), sql);
} else {
  process.stdout.write(sql);
}
