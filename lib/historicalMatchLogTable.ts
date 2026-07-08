import { getSheetsClient, getSpreadsheetId } from "@/lib/googleSheets";
import type { MatchRecord } from "@/lib/matchLogTable";
import { parseRank } from "@/lib/rank";

export type HistoricalMatchRecord = MatchRecord & {
  season: string;
  sourceNote: string;
};

export async function getHistoricalMatchLogTable(
  spreadsheetId = getSpreadsheetId(),
  range = "'시즌1~2 기록'!A1:J1000"
): Promise<HistoricalMatchRecord[]> {
  const sheets = getSheetsClient();

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = result.data.values ?? [];

  const headerRowIndex = rows.findIndex((row) => {
    const challengerHeader = String(row[1] ?? "").trim();
    const defenderHeader = String(row[3] ?? "").trim();
    const winnerHeader = String(row[5] ?? "").trim();
    const seasonHeader = String(row[8] ?? "").trim();

    return (
      challengerHeader.startsWith("도전자") &&
      defenderHeader.startsWith("방어자") &&
      winnerHeader === "승자" &&
      seasonHeader === "시즌"
    );
  });

  if (headerRowIndex === -1) {
    return [];
  }

  const matches: HistoricalMatchRecord[] = [];

  for (const row of rows.slice(headerRowIndex + 1)) {
    const date = String(row[0] ?? "").trim();
    const challenger = String(row[1] ?? "").trim();
    const challengerRankText = String(row[2] ?? "").trim();
    const defender = String(row[3] ?? "").trim();
    const defenderRankText = String(row[4] ?? "").trim();
    const winner = String(row[5] ?? "").trim();
    const score = String(row[6] ?? "").trim();
    const defenseResult = String(row[7] ?? "").trim();
    const season = String(row[8] ?? "").trim();
    const sourceNote = String(row[9] ?? "").trim();

    if (!challenger || !defender || !winner || !season) {
      continue;
    }

    matches.push({
      date,
      challenger,
      challengerRank: parseRank(challengerRankText),
      defender,
      defenderRank: parseRank(defenderRankText),
      winner,
      score,
      defenseResult,
      season,
      sourceNote,
    });
  }

  return matches;
}
