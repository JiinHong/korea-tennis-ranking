import { describe, expect, test } from "vitest";

import {
  RANKING_MOVEMENT_WINDOW_DAYS,
  buildRankChanges,
  getKstRollingDateRange,
} from "@/lib/campusRanking/movementWindow";

describe("getKstRollingDateRange", () => {
  test("uses today and the previous 29 Korean calendar dates", () => {
    expect(RANKING_MOVEMENT_WINDOW_DAYS).toBe(30);
    expect(
      getKstRollingDateRange(new Date("2026-08-01T12:00:00Z"))
    ).toEqual({
      startDate: "2026-07-03",
      endDate: "2026-08-01",
    });
  });

  test("moves the window at Korean midnight", () => {
    expect(
      getKstRollingDateRange(new Date("2026-08-01T15:00:00Z"))
    ).toEqual({
      startDate: "2026-07-04",
      endDate: "2026-08-02",
    });
  });

  test("accepts a shorter window from the same helper", () => {
    expect(
      getKstRollingDateRange(new Date("2026-08-01T12:00:00Z"), 14)
    ).toEqual({
      startDate: "2026-07-19",
      endDate: "2026-08-01",
    });
  });
});

describe("buildRankChanges", () => {
  test("sums match movements and omits players whose net movement is zero", () => {
    expect(
      buildRankChanges([
        { playerId: "p1", rankDelta: 3 },
        { playerId: "p1", rankDelta: -1 },
        { playerId: "p2", rankDelta: -1 },
        { playerId: "p3", rankDelta: 2 },
        { playerId: "p3", rankDelta: -2 },
      ])
    ).toEqual({ p1: 2, p2: -1 });
  });
});
