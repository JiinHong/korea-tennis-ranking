import { describe, expect, test } from "vitest";
import {
  applyMatchRanking,
  resolveMatchRoles,
  validateChallengeRange,
  validateRematchCooldown,
  validateScore,
} from "@/lib/rankingRules";

describe("validateScore", () => {
  test("accepts a 6 to 5 result", () => {
    expect(
      validateScore({
        player1Id: "p1",
        player2Id: "p2",
        player1Score: 6,
        player2Score: 5,
        playedOn: "2026-07-10",
      })
    ).toEqual({ ok: true });
  });

  test("rejects a match without a 6-point winner", () => {
    expect(
      validateScore({
        player1Id: "p1",
        player2Id: "p2",
        player1Score: 5,
        player2Score: 4,
        playedOn: "2026-07-10",
      })
    ).toEqual({ ok: false, message: "승자는 반드시 6점이어야 합니다." });
  });

  test("rejects tied scores", () => {
    expect(
      validateScore({
        player1Id: "p1",
        player2Id: "p2",
        player1Score: 6,
        player2Score: 6,
        playedOn: "2026-07-10",
      })
    ).toEqual({ ok: false, message: "동점은 입력할 수 없습니다." });
  });
});

const players = [
  { id: "p1", name: "오준석", rank: 1, status: "active" as const },
  { id: "p2", name: "김도훈", rank: 2, status: "active" as const },
  { id: "p3", name: "박정용", rank: 3, status: "active" as const },
  { id: "p4", name: "이민우", rank: 4, status: "active" as const },
];

describe("resolveMatchRoles", () => {
  test("uses the lower ranked player as challenger and the higher ranked player as defender", () => {
    expect(
      resolveMatchRoles(players, {
        player1Id: "p1",
        player2Id: "p4",
        player1Score: 4,
        player2Score: 6,
        playedOn: "2026-07-10",
      })
    ).toMatchObject({
      challenger: { id: "p4" },
      defender: { id: "p1" },
      winnerId: "p4",
      loserId: "p1",
    });
  });
});

describe("applyMatchRanking", () => {
  test("keeps rankings when the defender wins", () => {
    expect(applyMatchRanking(players, "p4", "p1", "p1")).toEqual(players);
  });

  test("moves the challenger into the defender rank when the challenger wins", () => {
    expect(applyMatchRanking(players, "p4", "p1", "p4")).toEqual([
      { id: "p4", name: "이민우", rank: 1, status: "active" },
      { id: "p1", name: "오준석", rank: 2, status: "active" },
      { id: "p2", name: "김도훈", rank: 3, status: "active" },
      { id: "p3", name: "박정용", rank: 4, status: "active" },
    ]);
  });
});

describe("validateChallengeRange", () => {
  test("allows challenging within four active ranking spots", () => {
    expect(
      validateChallengeRange(players, "p4", "p1", {
        challengeRange: 4,
        rematchCooldownDays: 14,
        inactivityPenaltyDrop: 2,
      })
    ).toEqual({ ok: true });
  });

  test("rejects challenging beyond four active ranking spots", () => {
    const longRanking = [
      ...players,
      { id: "p5", name: "이도현", rank: 5, status: "active" as const },
      { id: "p6", name: "김혜은", rank: 6, status: "active" as const },
    ];

    expect(
      validateChallengeRange(longRanking, "p6", "p1", {
        challengeRange: 4,
        rematchCooldownDays: 14,
        inactivityPenaltyDrop: 2,
      })
    ).toEqual({ ok: false, message: "도전 가능한 순위 범위를 벗어났습니다." });
  });

  test("skips injured players when calculating challenge range", () => {
    const rankingWithInjury = [
      { id: "p1", name: "오준석", rank: 1, status: "active" as const },
      { id: "p2", name: "김도훈", rank: 2, status: "injured" as const },
      { id: "p3", name: "박정용", rank: 3, status: "injured" as const },
      { id: "p4", name: "이민우", rank: 4, status: "active" as const },
      { id: "p5", name: "이도현", rank: 5, status: "active" as const },
      { id: "p6", name: "김혜은", rank: 6, status: "active" as const },
    ];

    expect(
      validateChallengeRange(rankingWithInjury, "p6", "p1", {
        challengeRange: 4,
        rematchCooldownDays: 14,
        inactivityPenaltyDrop: 2,
      })
    ).toEqual({ ok: true });
  });
});

describe("validateRematchCooldown", () => {
  test("rejects rematches within fourteen days", () => {
    expect(
      validateRematchCooldown(
        {
          player1Id: "p1",
          player2Id: "p2",
          player1Score: 6,
          player2Score: 4,
          playedOn: "2026-07-10",
        },
        [{ playerAId: "p2", playerBId: "p1", playedOn: "2026-06-30" }],
        {
          challengeRange: 4,
          rematchCooldownDays: 14,
          inactivityPenaltyDrop: 2,
        }
      )
    ).toEqual({ ok: false, message: "동일 선수와는 2주 동안 재경기할 수 없습니다." });
  });
});
