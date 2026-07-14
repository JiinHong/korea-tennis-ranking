import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { loadNationalRankingDataset } from "../lib/nationalRanking/dataset";
import { buildNationalRankingSeedPlan } from "../lib/nationalRanking/seedPlan";
import { buildNationalRankingSeedSql } from "../lib/nationalRanking/seedSql";
import type { NationalRankingDataset } from "../lib/nationalRanking/types";

export const NATIONAL_RANKING_SNAPSHOT_SCHEMA_VERSION =
  "national-ranking-snapshot-v2";

type CliArgs = {
  outPath?: string;
};

type CliDeps = {
  loadDataset?: () => NationalRankingDataset;
  writeFile?: (path: string, data: string) => void;
  stdout?: {
    write(data: string): unknown;
  };
};

export function parseNationalRankingSeedSqlCliArgs(argv: string[]): CliArgs {
  const outIndexes = argv.flatMap((argument, index) =>
    argument === "--out" ? [index] : []
  );

  if (outIndexes.length > 1) {
    throw new Error("--out may only be provided once");
  }

  const outIndex = outIndexes[0] ?? -1;

  if (outIndex < 0) {
    return {};
  }

  const outPath = argv[outIndex + 1];

  if (outPath === undefined || outPath.startsWith("--")) {
    throw new Error("--out requires a following path");
  }

  if (outPath.trim() === "") {
    throw new Error("--out requires a non-empty path");
  }

  return { outPath: resolve(outPath) };
}

export function runNationalRankingSeedSqlCli(
  argv = process.argv,
  deps: CliDeps = {}
): void {
  const args = parseNationalRankingSeedSqlCliArgs(argv);
  const dataset = (deps.loadDataset ?? loadNationalRankingDataset)();
  // Source revision combines the validated dataset with the snapshot schema version.
  const revision = createHash("sha256")
    .update(NATIONAL_RANKING_SNAPSHOT_SCHEMA_VERSION)
    .update("\0")
    .update(JSON.stringify(dataset))
    .digest("hex");
  const sql = buildNationalRankingSeedSql(
    buildNationalRankingSeedPlan(dataset, revision)
  );

  if (args.outPath) {
    (deps.writeFile ?? writeFileSync)(args.outPath, sql);
  } else {
    (deps.stdout ?? process.stdout).write(sql);
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";

if (import.meta.url === invokedPath) {
  runNationalRankingSeedSqlCli();
}
