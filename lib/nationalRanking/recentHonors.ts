import type { NationalRankingHonor } from "./types";

type TournamentEditionReference = Pick<
  NationalRankingHonor,
  "year"
>;

export function getCurrentKoreanYear(date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      year: "numeric",
    }).format(date)
  );
}

export function isRecentHonor(
  result: TournamentEditionReference,
  referenceYear = getCurrentKoreanYear()
): boolean {
  return result.year >= referenceYear - 1 && result.year <= referenceYear;
}
