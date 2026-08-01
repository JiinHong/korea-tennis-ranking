import { describe, expect, it } from "vitest";

import { getKstWeekStart } from "@/lib/weeklyRankingSnapshots";

describe("getKstWeekStart", () => {
  it("한국시간 월요일 0시 전까지는 직전 월요일을 반환한다", () => {
    expect(getKstWeekStart(new Date("2026-08-02T14:59:59Z"))).toBe(
      "2026-07-27"
    );
  });

  it("한국시간 월요일 0시부터 새 주의 월요일을 반환한다", () => {
    expect(getKstWeekStart(new Date("2026-08-02T15:00:00Z"))).toBe(
      "2026-08-03"
    );
  });
});
