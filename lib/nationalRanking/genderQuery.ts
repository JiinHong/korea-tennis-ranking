import type { RankingGender } from "./types";

export function parseRankingGender(
  value: string | null | undefined,
  fallback: RankingGender
): RankingGender {
  return value === "men" || value === "women" || value === "combined"
    ? value
    : fallback;
}
