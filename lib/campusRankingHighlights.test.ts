import { describe, expect, it } from "vitest";

import { buildRecent30Highlights } from "./campusRankingHighlights";

const players = [
  {
    rank: 1,
    name: "오준석",
    wins: 0,
    losses: 0,
    matches: 0,
  },
  {
    rank: 2,
    name: "김도훈",
    wins: 0,
    losses: 0,
    matches: 0,
  },
  {
    rank: 3,
    name: "박정용",
    wins: 0,
    losses: 0,
    matches: 0,
  },
  {
    rank: 4,
    name: "이민우",
    wins: 0,
    losses: 0,
    matches: 0,
  },
];

describe("buildRecent30Highlights", () => {
  it("최근 30일 경기에서 최다 출전·승리·방어 선수를 집계한다", () => {
    const highlights = buildRecent30Highlights(
      players,
      [
        {
          date: "2026. 7. 29",
          challenger: "김도훈",
          defender: "오준석",
          winner: "오준석",
        },
        {
          date: "2026. 7. 20",
          challenger: "박정용",
          defender: "김도훈",
          winner: "김도훈",
        },
        {
          date: "2026. 7. 10",
          challenger: "박정용",
          defender: "오준석",
          winner: "박정용",
        },
        {
          date: "2026. 6. 29",
          challenger: "이민우",
          defender: "박정용",
          winner: "박정용",
        },
        {
          date: "2026. 6. 28",
          challenger: "오준석",
          defender: "김도훈",
          winner: "오준석",
        },
        {
          date: "날짜 없음",
          challenger: "오준석",
          defender: "김도훈",
          winner: "오준석",
        },
      ],
      new Date(2026, 6, 29, 18, 30)
    );

    expect(highlights).toEqual([
      {
        key: "appearances",
        label: "최다 출전",
        playerName: "박정용",
        playerRank: 3,
        value: 3,
        valueLabel: "3경기",
      },
      {
        key: "wins",
        label: "최다 승리",
        playerName: "박정용",
        playerRank: 3,
        value: 2,
        valueLabel: "2승",
      },
      {
        key: "defenses",
        label: "최다 방어",
        playerName: "오준석",
        playerRank: 1,
        value: 1,
        valueLabel: "1회",
      },
    ]);
  });

  it("동률이면 현재 순위가 높은 선수를 우선한다", () => {
    const highlights = buildRecent30Highlights(
      [...players].reverse(),
      [
        {
          date: "2026-07-29",
          challenger: "김도훈",
          defender: "오준석",
          winner: "오준석",
        },
      ],
      new Date(2026, 6, 29)
    );

    expect(highlights[0]?.playerName).toBe("오준석");
    expect(highlights[0]?.value).toBe(1);
  });

  it("최근 경기가 없으면 빈 배열을 반환한다", () => {
    const highlights = buildRecent30Highlights(
      players,
      [
        {
          date: "2026. 5. 1",
          challenger: "김도훈",
          defender: "오준석",
          winner: "오준석",
        },
      ],
      new Date(2026, 6, 29)
    );

    expect(highlights).toEqual([]);
  });
});
