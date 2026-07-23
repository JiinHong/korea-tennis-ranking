import type { NationalRankingHonor } from "./types";

type TournamentEditionReference = Pick<
  NationalRankingHonor,
  "gender" | "tournamentSlug" | "year"
>;

export type LatestEditionYearMap = ReadonlyMap<string, number>;

function getTournamentDivisionKey(
  result: TournamentEditionReference
): string {
  return `${result.tournamentSlug}:${result.gender}`;
}

export function getCurrentKoreanYear(date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      year: "numeric",
    }).format(date)
  );
}

export function buildLatestEditionYearMap(
  results: readonly TournamentEditionReference[],
  referenceYear = getCurrentKoreanYear()
): LatestEditionYearMap {
  const latestEditionYears = new Map<string, number>();
  const earliestRecentYear = referenceYear - 1;

  for (const result of results) {
    if (result.year < earliestRecentYear || result.year > referenceYear) {
      continue;
    }

    const key = getTournamentDivisionKey(result);
    const latestYear = latestEditionYears.get(key);

    if (latestYear === undefined || result.year > latestYear) {
      latestEditionYears.set(key, result.year);
    }
  }

  return latestEditionYears;
}

export function isLatestTournamentEdition(
  result: TournamentEditionReference,
  latestEditionYears: LatestEditionYearMap
): boolean {
  return (
    latestEditionYears.get(getTournamentDivisionKey(result)) === result.year
  );
}
