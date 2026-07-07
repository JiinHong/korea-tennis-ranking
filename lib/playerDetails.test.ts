import { describe, expect, it } from "vitest";

import type { MatchRecord } from "@/lib/matchLogTable";
import { buildPlayerDetails } from "@/lib/playerDetails";
import type { HistoricalMatchRecord } from "@/lib/historicalMatchLogTable";
import type { Player } from "@/lib/rankingData";

describe("buildPlayerDetails", () => {
  it("현재 시즌과 과거 시즌 기록을 합쳐 선수 상세 전적을 만든다", () => {
    const players: Player[] = [
      {
        rank: 1,
        name: "오준석",
        note: "",
        wins: 1,
        losses: 1,
        matches: 2,
        recent5: ["W", "L"],
      },
      {
        rank: 2,
        name: "김도훈",
        note: "",
        wins: 1,
        losses: 1,
        matches: 2,
        recent5: ["L", "W"],
      },
    ];

    const currentMatches: MatchRecord[] = [
      {
        date: "2026. 7. 1",
        challenger: "김도훈",
        challengerRank: 2,
        defender: "오준석",
        defenderRank: 1,
        winner: "김도훈",
        score: "6:4",
        defenseResult: "방어 실패",
      },
      {
        date: "2026. 7. 2",
        challenger: "김도훈",
        challengerRank: 2,
        defender: "오준석",
        defenderRank: 1,
        winner: "오준석",
        score: "6:2",
        defenseResult: "방어 성공",
      },
    ];

    const historicalMatches: HistoricalMatchRecord[] = [
      {
        date: "2025. 12. 18",
        challenger: "김도훈",
        challengerRank: 4,
        defender: "오준석",
        defenderRank: 2,
        winner: "오준석",
        score: "6:1",
        defenseResult: "방어 성공",
        season: "시즌1",
        sourceNote: "카톡 OCR",
      },
      {
        date: "2026. 2. 1",
        challenger: "김도훈",
        challengerRank: 2,
        defender: "오준석",
        defenderRank: 1,
        winner: "김도훈",
        score: "6:5",
        defenseResult: "방어 실패",
        season: "시즌2",
        sourceNote: "시즌2 시트 원본",
      },
    ];

    const details = buildPlayerDetails(
      players,
      currentMatches,
      historicalMatches,
      "시즌3"
    );

    expect(details["오준석"]).toMatchObject({
      name: "오준석",
      rank: 1,
      wins: 2,
      losses: 2,
      matches: 4,
      winRate: 50,
      challengerRecord: {
        wins: 0,
        losses: 0,
        matches: 0,
      },
      defenderRecord: {
        wins: 2,
        losses: 2,
        matches: 4,
      },
    });

    expect(details["오준석"].seasonRecords).toEqual([
      { season: "시즌3", wins: 1, losses: 1, matches: 2, winRate: 50 },
      { season: "시즌2", wins: 0, losses: 1, matches: 1, winRate: 0 },
      { season: "시즌1", wins: 1, losses: 0, matches: 1, winRate: 100 },
    ]);

    expect(details["오준석"].opponentRecords).toEqual([
      {
        opponent: "김도훈",
        wins: 2,
        losses: 2,
        matches: 4,
        winRate: 50,
        latestDate: "2026. 7. 2",
        latestScore: "6:2",
        latestResult: "W",
      },
    ]);

    expect(details["오준석"].recentMatches.slice(0, 2)).toEqual([
      {
        date: "2026. 7. 2",
        season: "시즌3",
        opponent: "김도훈",
        result: "W",
        score: "6:2",
        role: "방어자",
        defenseResult: "방어 성공",
      },
      {
        date: "2026. 7. 1",
        season: "시즌3",
        opponent: "김도훈",
        result: "L",
        score: "6:4",
        role: "방어자",
        defenseResult: "방어 실패",
      },
    ]);
  });
});
