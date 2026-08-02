import { describe, expect, it } from "vitest";

import {
  applyMonthlyPenalty,
  buildMonthlyPenaltyPreview,
  type MonthlyPenaltyMatch,
  type MonthlyPenaltyPlayer,
} from "./monthlyPenalty";

function player(
  id: string,
  rank: number,
  status: MonthlyPenaltyPlayer["status"] = "active"
): MonthlyPenaltyPlayer {
  return {
    playerId: id,
    name: id.toUpperCase(),
    initialRank: rank,
    currentRank: rank,
    status,
  };
}

function match(
  id: string,
  playedOn: string,
  player1Id: string,
  player2Id: string,
  winnerPlayerId: string,
  sequenceNo: number,
  status: MonthlyPenaltyMatch["status"] = "confirmed"
): MonthlyPenaltyMatch {
  return {
    id,
    playedOn,
    sequenceNo,
    player1Id,
    player2Id,
    winnerPlayerId,
    status,
  };
}

describe("applyMonthlyPenalty", () => {
  it("lets each target yield to up to two non-target players while target order stays stable", () => {
    const players = [
      player("p1", 1),
      player("p2", 2),
      player("p3", 3),
      player("p4", 4),
      player("p5", 5),
    ];

    const result = applyMonthlyPenalty(players, ["p1", "p2", "p3"], 2);

    expect(result.map((entry) => entry.playerId)).toEqual([
      "p4",
      "p5",
      "p1",
      "p2",
      "p3",
    ]);
  });

  it("keeps everyone in place when every player is penalized", () => {
    const players = [player("p1", 1), player("p2", 2), player("p3", 3)];

    const result = applyMonthlyPenalty(players, ["p1", "p2", "p3"], 2);

    expect(result.map((entry) => entry.playerId)).toEqual(["p1", "p2", "p3"]);
  });

  it("caps the actual drop when there are not enough participating players below", () => {
    const players = [player("p1", 1), player("p2", 2), player("p3", 3)];

    const result = applyMonthlyPenalty(players, ["p2"], 2);

    expect(result.map((entry) => entry.playerId)).toEqual(["p1", "p3", "p2"]);
  });
});

describe("buildMonthlyPenaltyPreview", () => {
  it("includes injured and inactive members, excludes departed members, and ignores voided matches", () => {
    const players = [
      player("p1", 1, "active"),
      player("p2", 2, "injured"),
      player("p3", 3, "inactive"),
      player("p4", 4, "left"),
      player("p5", 5, "active"),
    ];
    const matches = [
      match("m1", "2026-07-10", "p3", "p5", "p5", 1, "voided"),
      match("m2", "2026-07-11", "p4", "p5", "p5", 2),
    ];

    const preview = buildMonthlyPenaltyPreview({
      targetMonth: "2026-07",
      penaltyDrop: 2,
      players,
      matches,
      settlements: [],
    });

    expect(preview.targets.map((entry) => entry.playerId)).toEqual([
      "p1",
      "p2",
      "p3",
    ]);
    expect(preview.players.find((entry) => entry.playerId === "p4")?.penalized).toBe(
      false
    );
    expect(preview.players.find((entry) => entry.playerId === "p5")?.matchCount).toBe(
      1
    );
  });

  it("replays ranking matches before applying the month-end settlement", () => {
    const players = [
      player("p1", 1),
      { ...player("p2", 2), currentRank: 3 },
      { ...player("p3", 3), currentRank: 4 },
      { ...player("p4", 4), currentRank: 2 },
    ];
    const matches = [match("m1", "2026-07-20", "p4", "p2", "p4", 1)];

    const preview = buildMonthlyPenaltyPreview({
      targetMonth: "2026-07",
      penaltyDrop: 2,
      players,
      matches,
      settlements: [],
    });

    expect(preview.targets.map((entry) => entry.playerId)).toEqual(["p1", "p3"]);
    expect(
      preview.players
        .slice()
        .sort((a, b) => a.expectedRank - b.expectedRank)
        .map((entry) => entry.playerId)
    ).toEqual(["p4", "p2", "p1", "p3"]);
    expect(preview.players.find((entry) => entry.playerId === "p1")).toMatchObject({
      currentRank: 1,
      expectedRank: 3,
      actualDrop: 2,
    });
  });

  it("marks an already settled month without applying it twice", () => {
    const players = [player("p1", 1), player("p2", 2)];

    const preview = buildMonthlyPenaltyPreview({
      targetMonth: "2026-07",
      penaltyDrop: 2,
      players,
      matches: [],
      settlements: [
        {
          id: "settlement-1",
          targetMonth: "2026-07",
          penaltyDrop: 2,
          targetPlayerIds: ["p1", "p2"],
        },
      ],
    });

    expect(preview.alreadyApplied).toBe(true);
    expect(preview.targets).toHaveLength(2);
    expect(preview.players.map((entry) => entry.expectedRank)).toEqual([1, 2]);
  });

  it("uses the stored eligibility, targets, and match counts for an applied month", () => {
    const players = [player("p1", 1), player("p2", 2), player("p3", 3)];
    const matches = [match("m1", "2026-07-20", "p1", "p2", "p1", 1)];

    const preview = buildMonthlyPenaltyPreview({
      targetMonth: "2026-07",
      penaltyDrop: 2,
      players,
      matches,
      settlements: [
        {
          id: "settlement-1",
          targetMonth: "2026-07",
          penaltyDrop: 2,
          eligiblePlayerIds: ["p1", "p2"],
          targetPlayerIds: ["p1"],
          matchCounts: { p1: 0, p2: 1 },
        },
      ],
    });

    expect(preview.targets.map((entry) => entry.playerId)).toEqual(["p1"]);
    expect(preview.players.find((entry) => entry.playerId === "p1")).toMatchObject({
      eligible: true,
      matchCount: 0,
      penalized: true,
    });
    expect(preview.players.find((entry) => entry.playerId === "p2")).toMatchObject({
      eligible: true,
      matchCount: 1,
      penalized: false,
    });
    expect(preview.players.find((entry) => entry.playerId === "p3")).toMatchObject({
      eligible: false,
      matchCount: 0,
      penalized: false,
    });
  });

  it("does not let a player added after a settlement affect that past penalty", () => {
    const players = [player("p1", 1), player("p2", 2), player("p3", 3)];

    const preview = buildMonthlyPenaltyPreview({
      targetMonth: "2026-07",
      penaltyDrop: 2,
      players,
      matches: [],
      settlements: [
        {
          id: "settlement-1",
          targetMonth: "2026-06",
          penaltyDrop: 2,
          targetPlayerIds: ["p1"],
          eligiblePlayerIds: ["p1", "p2"],
        },
      ],
    });

    expect(
      preview.players
        .slice()
        .sort((a, b) => a.expectedRank - b.expectedRank)
        .map((entry) => entry.playerId)
    ).toEqual(["p2", "p1", "p3"]);
  });

  it("replays a departed player's past matches before moving them below current members", () => {
    const players = [
      { ...player("p1", 1, "left"), currentRank: 3 },
      player("p2", 2),
      { ...player("p3", 3), currentRank: 1 },
    ];
    const matches = [match("m1", "2026-07-10", "p3", "p1", "p3", 1)];

    const preview = buildMonthlyPenaltyPreview({
      targetMonth: "2026-08",
      penaltyDrop: 2,
      players,
      matches,
      settlements: [],
    });

    expect(
      preview.players
        .slice()
        .sort((a, b) => a.expectedRank - b.expectedRank)
        .map((entry) => entry.playerId)
    ).toEqual(["p3", "p2", "p1"]);
  });

  it("excludes a player who joined after the target month ended", () => {
    const players = [
      player("p1", 1),
      player("p2", 2),
      { ...player("p3", 3), joinedAt: "2026-08-03T09:00:00+09:00" },
    ];
    const matches = [match("m1", "2026-07-20", "p1", "p2", "p1", 1)];

    const preview = buildMonthlyPenaltyPreview({
      targetMonth: "2026-07",
      penaltyDrop: 2,
      players,
      matches,
      settlements: [],
    });

    expect(preview.targets).toHaveLength(0);
    expect(preview.players.find((entry) => entry.playerId === "p3")).toMatchObject({
      matchCount: 0,
      penalized: false,
    });
  });
});
