import { describe, expect, it } from "vitest";

import { buildPlayer } from "@/lib/campusRanking/rankingData";
import type { MatchRecord } from "@/lib/googleSheets/currentMatches";
import type { RankingData } from "@/lib/googleSheets/currentRanking";

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
        rankChange: 0,
        wins: 0,
        losses: 1,
        matches: 1,
        recent5: ["L"],
      },
      {
        rank: 2,
        name: "김도훈",
        note: "",
        rankChange: 0,
        wins: 2,
        losses: 0,
        matches: 2,
        recent5: ["W", "W"],
      },
      {
        rank: 3,
        name: "박정용",
        note: "손목 부상",
        rankChange: 0,
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

  it("지난 월요일 순위와 현재 순위의 차이를 선수 데이터에 전달한다", () => {
    const ranking: RankingData[] = [
      { rank: 1, name: "오준석", note: "" },
      { rank: 2, name: "김도훈", note: "" },
      { rank: 3, name: "박정용", note: "" },
    ];

    expect(
      buildPlayer(ranking, [], {
        오준석: 2,
        김도훈: -1,
      }).map(({ name, rankChange }) => ({ name, rankChange }))
    ).toEqual([
      { name: "오준석", rankChange: 2 },
      { name: "김도훈", rankChange: -1 },
      { name: "박정용", rankChange: 0 },
    ]);
  });
});
