import { describe, expect, it } from "vitest";

import type { NationalRankingHonor } from "./types";
import {
  buildLatestEditionYearMap,
  getCurrentKoreanYear,
  isLatestTournamentEdition,
} from "./recentHonors";

function honor(
  tournamentSlug: string,
  year: number,
  gender: NationalRankingHonor["gender"] = "men"
): NationalRankingHonor {
  return {
    editionKey: `${tournamentSlug}-${year}-${gender}`,
    tournamentSlug,
    tournamentName: tournamentSlug,
    year,
    gender,
    stage: "champion",
  };
}

describe("recent honors", () => {
  it("최근 연도 범위에서 대회·부문별 최신 완료 회차의 입상만 표시한다", () => {
    const yanggu2025 = honor("yanggu", 2025);
    const gyeongin2024 = honor("gyeongin", 2024);
    const inje2025 = honor("inje", 2025);
    const inje2026 = honor("inje", 2026);
    const latestEditionYears = buildLatestEditionYearMap(
      [yanggu2025, gyeongin2024, inje2025, inje2026],
      2026
    );

    expect(isLatestTournamentEdition(yanggu2025, latestEditionYears)).toBe(
      true
    );
    expect(isLatestTournamentEdition(gyeongin2024, latestEditionYears)).toBe(
      false
    );
    expect(isLatestTournamentEdition(inje2025, latestEditionYears)).toBe(
      false
    );
    expect(isLatestTournamentEdition(inje2026, latestEditionYears)).toBe(
      true
    );
  });

  it("같은 대회라도 남자부와 여자부의 최신 회차를 따로 계산한다", () => {
    const injeMen2026 = honor("inje", 2026, "men");
    const injeWomen2025 = honor("inje", 2025, "women");
    const latestEditionYears = buildLatestEditionYearMap(
      [injeMen2026, injeWomen2025],
      2026
    );

    expect(
      isLatestTournamentEdition(injeMen2026, latestEditionYears)
    ).toBe(true);
    expect(
      isLatestTournamentEdition(injeWomen2025, latestEditionYears)
    ).toBe(true);
  });

  it("연도 경계는 한국 시간을 기준으로 계산한다", () => {
    expect(getCurrentKoreanYear(new Date("2025-12-31T15:30:00Z"))).toBe(
      2026
    );
  });
});
