import { describe, expect, it } from "vitest";

import type { NationalRankingHonor } from "./types";
import { getCurrentKoreanYear, isRecentHonor } from "./recentHonors";

function honor(tournamentSlug: string, year: number): NationalRankingHonor {
  return {
    editionKey: `${tournamentSlug}-${year}-men`,
    tournamentSlug,
    tournamentName: tournamentSlug,
    year,
    gender: "men",
    stage: "champion",
  };
}

describe("recent honors", () => {
  it("한국 기준 현재 연도와 직전 연도의 모든 입상을 표시한다", () => {
    const yanggu2025 = honor("yanggu", 2025);
    const gyeongin2024 = honor("gyeongin", 2024);
    const inje2025 = honor("inje", 2025);
    const inje2026 = honor("inje", 2026);

    expect(isRecentHonor(yanggu2025, 2026)).toBe(true);
    expect(isRecentHonor(gyeongin2024, 2026)).toBe(false);
    expect(isRecentHonor(inje2025, 2026)).toBe(true);
    expect(isRecentHonor(inje2026, 2026)).toBe(true);
  });

  it("연도 경계는 한국 시간을 기준으로 계산한다", () => {
    expect(getCurrentKoreanYear(new Date("2025-12-31T15:30:00Z"))).toBe(
      2026
    );
  });
});
