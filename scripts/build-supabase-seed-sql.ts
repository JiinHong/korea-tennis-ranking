import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadEnvConfig } from "@next/env";

import { getClubConfig } from "../lib/clubs";
import { getSpreadsheetId } from "../lib/googleSheets";
import { getHistoricalMatchLogTable } from "../lib/historicalMatchLogTable";
import { getMatchLogTable } from "../lib/matchLogTable";
import { getRankingTable } from "../lib/rankingTable";
import { buildSupabaseSeedPlan } from "../lib/supabaseSeedPlan";
import {
  buildSupabaseSeedSql,
  buildSupabaseSeedSqlFiles,
} from "../lib/supabaseSeedSql";

function parseArgs(argv: string[]) {
  const [clubSlug = "seoultech", ...rest] = argv;
  const outIndex = rest.indexOf("--out");
  const outPath = outIndex >= 0 ? rest[outIndex + 1] : null;
  const splitDirIndex = rest.indexOf("--split-dir");
  const splitDir = splitDirIndex >= 0 ? rest[splitDirIndex + 1] : null;
  const chunkSizeIndex = rest.indexOf("--match-chunk-size");
  const matchChunkSize =
    chunkSizeIndex >= 0 ? Number(rest[chunkSizeIndex + 1]) : 25;

  return {
    clubSlug,
    outPath,
    splitDir,
    matchChunkSize,
  };
}

async function main() {
  loadEnvConfig(process.cwd());

  const { clubSlug, outPath, splitDir, matchChunkSize } = parseArgs(
    process.argv.slice(2)
  );
  const club = getClubConfig(clubSlug);

  if (!club) {
    throw new Error(`Unknown club slug: ${clubSlug}`);
  }

  const spreadsheetId = getSpreadsheetId(club.sheetIdEnv);
  const [ranking, matches, historicalMatches] = await Promise.all([
    getRankingTable(spreadsheetId),
    getMatchLogTable(spreadsheetId),
    club.historicalMatchLogRange
      ? getHistoricalMatchLogTable(spreadsheetId, club.historicalMatchLogRange)
      : [],
  ]);

  const plan = buildSupabaseSeedPlan({
    club,
    currentSeasonName: "시즌3",
    ranking,
    matches,
    historicalMatches,
  });

  console.error(
    [
      `club=${club.slug}`,
      `players=${plan.players.length}`,
      `currentPlayers=${plan.seasonPlayers.length}`,
      `matches=${plan.matches.length}`,
      `seasons=${plan.seasons.length}`,
    ].join(" ")
  );

  if (splitDir) {
    const targetDir = resolve(splitDir);

    mkdirSync(targetDir, { recursive: true });

    for (const file of buildSupabaseSeedSqlFiles(plan, matchChunkSize)) {
      writeFileSync(resolve(targetDir, file.name), file.sql);
    }

    return;
  }

  const sql = buildSupabaseSeedSql(plan);

  if (outPath) {
    writeFileSync(resolve(outPath), sql);
    return;
  }

  process.stdout.write(sql);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
