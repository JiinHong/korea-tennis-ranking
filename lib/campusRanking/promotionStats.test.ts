import { describe, expect, it, vi } from "vitest";

import { getCampusRankingPromotionStats } from "./promotionStats";

describe("getCampusRankingPromotionStats", () => {
  it("각 동아리의 현재·이전 시즌 경기 수를 모두 더한다", async () => {
    const loader = vi.fn(async (club: { slug: string }) => ({
      seasonSummaries:
        club.slug === "seoultech"
          ? [
              { name: "시즌3", matches: 30, isCurrent: true },
              { name: "시즌2", matches: 154, isCurrent: false },
              { name: "시즌1", matches: 30, isCurrent: false },
            ]
          : [{ name: "현재", matches: 11, isCurrent: true }],
    }));

    await expect(getCampusRankingPromotionStats(loader)).resolves.toEqual({
      petc: 11,
      seoultech: 214,
    });
  });

  it("한 동아리 조회가 실패해도 확인된 동아리의 수치는 유지한다", async () => {
    const loader = vi.fn(async (club: { slug: string }) => {
      if (club.slug === "petc") {
        throw new Error("unavailable");
      }

      return {
        seasonSummaries: [
          { name: "시즌3", matches: 30, isCurrent: true },
          { name: "시즌2", matches: 154, isCurrent: false },
        ],
      };
    });

    await expect(getCampusRankingPromotionStats(loader)).resolves.toEqual({
      seoultech: 184,
    });
  });
});
