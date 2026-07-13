import {
  getFieldSizeUnits,
  getRecencyFactor,
  getRecencyUnits,
  getTournamentPrestigeFactor,
  getTournamentUnits,
  NATIONAL_FORMULA_V3,
  scoreVerifiedResult,
} from "./formula";
import type { NationalFormula } from "./formula";
import type {
  CalculatedNationalRanking,
  CalculatedRankingRow,
  NationalClubInput,
  NationalGender,
  NationalRankingDataset,
  RankingGender,
  ScoreContribution,
} from "./types";

function createRankingRow(
  clubSlug: string,
  gender: RankingGender,
  contributions: ScoreContribution[],
  latestYear: Map<string, number>
): CalculatedRankingRow {
  return {
    clubSlug,
    gender,
    rank: 0,
    totalPoints: contributions.reduce((total, item) => total + item.points, 0),
    latestEditionPoints: contributions.reduce(
      (total, item) =>
        total +
        (latestYear.get(item.tournamentSlug) === item.editionYear
          ? item.points
          : 0),
      0
    ),
    maxContribution: Math.max(0, ...contributions.map((item) => item.points)),
    championships: contributions.filter((item) => item.stage === "champion")
      .length,
    runnerUps: contributions.filter((item) => item.stage === "runner_up").length,
    contributions,
  };
}

function combineRankingRows(
  menRow: CalculatedRankingRow,
  womenRow: CalculatedRankingRow
): CalculatedRankingRow {
  return {
    clubSlug: menRow.clubSlug,
    gender: "combined",
    rank: 0,
    totalPoints: menRow.totalPoints + womenRow.totalPoints,
    latestEditionPoints:
      menRow.latestEditionPoints + womenRow.latestEditionPoints,
    maxContribution: Math.max(menRow.maxContribution, womenRow.maxContribution),
    championships: menRow.championships + womenRow.championships,
    runnerUps: menRow.runnerUps + womenRow.runnerUps,
    contributions: [...menRow.contributions, ...womenRow.contributions],
  };
}

function sortAndRank(
  rows: CalculatedRankingRow[],
  clubsBySlug: Map<string, NationalClubInput>
): CalculatedRankingRow[] {
  return rows
    .sort((left, right) => {
      const numericDifferences = [
        right.totalPoints - left.totalPoints,
        right.latestEditionPoints - left.latestEditionPoints,
        right.maxContribution - left.maxContribution,
        right.championships - left.championships,
        right.runnerUps - left.runnerUps,
      ];
      const difference = numericDifferences.find((value) => value !== 0);

      if (difference !== undefined) return difference;

      return (clubsBySlug.get(left.clubSlug)?.displayName ?? "").localeCompare(
        clubsBySlug.get(right.clubSlug)?.displayName ?? "",
        "ko"
      );
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function calculateNationalRankings(
  dataset: NationalRankingDataset,
  formula: NationalFormula = NATIONAL_FORMULA_V3
): CalculatedNationalRanking {
  const clubsBySlug = new Map(dataset.clubs.map((club) => [club.slug, club]));
  const tournamentsBySlug = new Map(
    dataset.tournaments.map((tournament) => [tournament.slug, tournament])
  );
  const editionsByKey = new Map(
    dataset.editions.map((edition) => [edition.key, edition])
  );
  const latestYear = new Map<string, number>();

  if (formula.version === "national-club-v2") {
    for (const tournament of dataset.tournaments) {
      getTournamentPrestigeFactor(tournament.slug, formula);
    }
  } else if (formula.version === "national-club-v3") {
    for (const tournament of dataset.tournaments) {
      getTournamentUnits(tournament.slug, formula);
    }
  }

  for (const edition of dataset.editions) {
    if (edition.sourceStatus !== "verified") continue;

    latestYear.set(
      edition.tournamentSlug,
      Math.max(latestYear.get(edition.tournamentSlug) ?? 0, edition.year)
    );
  }

  const bestContributions = new Map<string, ScoreContribution>();

  for (const result of dataset.results) {
    if (result.qualityStatus !== "verified") continue;
    if (result.stage === null) {
      throw new Error(
        `${result.sourceRef}: verified result is missing a terminal stage`
      );
    }

    const edition = editionsByKey.get(result.editionKey);
    if (!edition) {
      throw new Error(
        `${result.sourceRef}: verified result references unknown edition "${result.editionKey}"`
      );
    }

    const tournament = tournamentsBySlug.get(edition.tournamentSlug);
    if (!tournament) {
      throw new Error(
        `${result.sourceRef}: verified result references unknown tournament "${edition.tournamentSlug}"`
      );
    }

    const club = result.clubSlug ? clubsBySlug.get(result.clubSlug) : undefined;
    if (!club) {
      throw new Error(
        `${result.sourceRef}: verified result references unknown club "${result.clubSlug ?? "null"}"`
      );
    }
    if (edition.sourceStatus !== "verified") continue;

    const latestEditionYear = latestYear.get(tournament.slug) ?? edition.year;
    const tournamentPrestigeFactor =
      formula.version === "national-club-v2"
        ? getTournamentPrestigeFactor(tournament.slug, formula)
        : undefined;
    const tournamentUnits =
      formula.version === "national-club-v3"
        ? getTournamentUnits(tournament.slug, formula)
        : undefined;
    const fieldSizeUnits =
      formula.version === "national-club-v3"
        ? getFieldSizeUnits(edition.actualEntrants, formula)
        : undefined;
    const recencyUnits =
      formula.version === "national-club-v3"
        ? getRecencyUnits(latestEditionYear, edition.year, formula)
        : undefined;

    if (
      formula.version === "national-club-v3"
        ? recencyUnits === 0
        : getRecencyFactor(latestEditionYear, edition.year, formula) === 0
    ) {
      continue;
    }

    const points =
      formula.version === "national-club-v3"
        ? scoreVerifiedResult(
            {
              stage: result.stage,
              tournamentSlug: tournament.slug,
              actualEntrants: edition.actualEntrants,
              latestEditionYear,
              editionYear: edition.year,
            },
            formula
          )
        : formula.version === "national-club-v2"
          ? scoreVerifiedResult(
              {
                stage: result.stage,
                tournamentPrestigeFactor: tournamentPrestigeFactor!,
                actualEntrants: edition.actualEntrants,
                latestEditionYear,
                editionYear: edition.year,
              },
              formula
            )
          : scoreVerifiedResult(
              {
                stage: result.stage,
                scopeFactor: tournament.scopeFactor,
                actualEntrants: edition.actualEntrants,
                latestEditionYear,
                editionYear: edition.year,
              },
              formula
            );

    const contribution: ScoreContribution = {
      clubSlug: club.slug,
      gender: edition.gender,
      tournamentSlug: tournament.slug,
      editionKey: edition.key,
      sourceTeamName: result.sourceTeamName,
      stage: result.stage,
      scopeFactor: tournament.scopeFactor,
      tournamentPrestigeFactor,
      tournamentUnits,
      fieldSizeUnits,
      recencyUnits,
      actualEntrants: edition.actualEntrants,
      latestEditionYear,
      editionYear: edition.year,
      points,
    };
    const scoringUnit = [
      contribution.clubSlug,
      contribution.gender,
      contribution.tournamentSlug,
      contribution.editionYear,
    ].join(":");
    const bestContribution = bestContributions.get(scoringUnit);

    if (!bestContribution || contribution.points > bestContribution.points) {
      bestContributions.set(scoringUnit, contribution);
    }
  }

  const contributionsByClubAndGender = new Map<string, ScoreContribution[]>();
  for (const contribution of bestContributions.values()) {
    const key = `${contribution.clubSlug}:${contribution.gender}`;
    const contributions = contributionsByClubAndGender.get(key) ?? [];

    contributions.push(contribution);
    contributionsByClubAndGender.set(key, contributions);
  }

  const genderRows: Record<NationalGender, CalculatedRankingRow[]> = {
    men: [],
    women: [],
  };
  const combinedRows: CalculatedRankingRow[] = [];

  for (const club of dataset.clubs) {
    const menContributions = contributionsByClubAndGender.get(`${club.slug}:men`) ?? [];
    const womenContributions =
      contributionsByClubAndGender.get(`${club.slug}:women`) ?? [];
    const menRow = createRankingRow(club.slug, "men", menContributions, latestYear);
    const womenRow = createRankingRow(
      club.slug,
      "women",
      womenContributions,
      latestYear
    );

    if (menContributions.length > 0) genderRows.men.push(menRow);
    if (womenContributions.length > 0) genderRows.women.push(womenRow);
    if (menContributions.length > 0 || womenContributions.length > 0) {
      combinedRows.push(combineRankingRows(menRow, womenRow));
    }
  }

  const rows = [
    ...sortAndRank(genderRows.men, clubsBySlug),
    ...sortAndRank(genderRows.women, clubsBySlug),
    ...sortAndRank(combinedRows, clubsBySlug),
  ];

  return { formulaVersion: formula.version, rows };
}
