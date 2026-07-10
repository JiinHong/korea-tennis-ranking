import { describe, expect, it } from "vitest";

import { buildPlayer } from "@/lib/rankingData";
import type { MatchRecord } from "@/lib/matchLogTable";
import type { RankingData } from "@/lib/rankingTable";

describe("buildPlayer", () => {
  it("랭킹표와 경기 기록을 합쳐 선수별 전적과 최근 5경기를 만든다", () => {
    const ranking: RankingData[] = [
      { rank: 1, name: "오준석", note: "" },
      { rank: 2, name: "김도훈", note: "" },
      { rank: 3, name: "박정용", note: "손목 부상" },
    ];

    const matches: MatchRecord[] = [
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
        challenger: "박정용",
        challengerRank: 3,
        defender: "김도훈",
        defenderRank: 2,
        winner: "김도훈",
        score: "6:2",
        defenseResult: "방어 성공",
      },
    ];

    expect(buildPlayer(ranking, matches)).toEqual([
      {
        rank: 1,
        name: "오준석",
        note: "",
        wins: 0,
        losses: 1,
        matches: 1,
        recent5: ["L"],
      },
      {
        rank: 2,
        name: "김도훈",
        note: "",
        wins: 2,
        losses: 0,
        matches: 2,
        recent5: ["W", "W"],
      },
      {
        rank: 3,
        name: "박정용",
        note: "손목 부상",
        wins: 0,
        losses: 1,
        matches: 1,
        recent5: ["L"],
      },
    ]);
  });

  it("선수 상태를 공개 랭킹 데이터에 그대로 전달한다", () => {
    const ranking: RankingData[] = [
      {
        rank: 1,
        name: "박정용",
        note: "왼손잡이",
        status: "injured",
      },
    ];

    expect(buildPlayer(ranking, [])[0]).toMatchObject({
      name: "박정용",
      note: "왼손잡이",
      status: "injured",
    });
  });
});
