type TournamentOccurrence = {
  year: number;
  tournamentSlug: string;
  tournamentName?: string;
};

const DEFAULT_TOURNAMENT_ORDER = [
  "yeongwol",
  "gyeongin",
  "inje",
  "yanggu",
  "chuncheon",
  "wemix",
] as const;

const TOURNAMENT_ORDER_2025 = [
  "yeongwol",
  "inje",
  "yanggu",
  "chuncheon",
  "gyeongin",
  "wemix",
] as const;

const TOURNAMENT_SHORT_NAMES: Readonly<Record<string, string>> = {
  yeongwol: "영월",
  yanggu: "양구",
  gyeongin: "경인지구",
  inje: "인제",
  chuncheon: "춘천",
  wemix: "위믹스",
};

function getTournamentOrder(year: number): readonly string[] {
  return year === 2025
    ? TOURNAMENT_ORDER_2025
    : DEFAULT_TOURNAMENT_ORDER;
}

function getTournamentOrderIndex(
  order: readonly string[],
  tournamentSlug: string
): number {
  const index = order.indexOf(tournamentSlug);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function compareTournamentOccurrences(
  left: TournamentOccurrence,
  right: TournamentOccurrence
): number {
  const yearDifference = right.year - left.year;
  if (yearDifference !== 0) return yearDifference;

  const order = getTournamentOrder(left.year);
  const tournamentDifference =
    getTournamentOrderIndex(order, left.tournamentSlug) -
    getTournamentOrderIndex(order, right.tournamentSlug);
  if (tournamentDifference !== 0) return tournamentDifference;

  return (left.tournamentName ?? left.tournamentSlug).localeCompare(
    right.tournamentName ?? right.tournamentSlug,
    "ko-KR"
  );
}

export function getTournamentShortName(
  tournamentSlug: string,
  fallbackName: string
): string {
  return TOURNAMENT_SHORT_NAMES[tournamentSlug] ?? fallbackName;
}

export function getTournamentResultDisplayName(
  tournamentSlug: string,
  fallbackName: string
): string {
  return tournamentSlug === "yeongwol"
    ? "영월 전국대학 테니스 대회"
    : fallbackName;
}
