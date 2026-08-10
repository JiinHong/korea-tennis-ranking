import {
  getFieldSizeUnits,
  getRecencyFactor,
  getRecencyUnits,
  getTournamentPrestigeFactor,
  getTournamentUnits,
  isUnitNationalFormula,
  NATIONAL_FORMULA_V7,
  scoreVerifiedResult,
  usesFieldSizeUnits,
} from "./formula";
import type { NationalFormula } from "./formula";
import { compareTournamentOccurrences } from "./tournamentPresentation";
import type {
  CalculatedNationalRanking,
  CalculatedRankingRow,
  NationalClubInput,
  NationalGender,
  NationalRankingBestResult,
  NationalRankingDataset,
  NationalRankingHonor,
  PublicTournamentResultStage,
  RankingGender,
  ScoreContribution,
} from "./types";

const PUBLIC_RESULT_STAGES = new Set<PublicTournamentResultStage>([
  "champion",
  "runner_up",
  "semifinal",
  "quarterfinal",
  "round_of_16",
]);

const BEST_RESULT_STAGE_ORDER: Record<PublicTournamentResultStage, number> = {
  champion: 0,
  runner_up: 1,
  semifinal: 2,
  quarterfinal: 3,
  round_of_16: 4,
};

const PODIUM_STAGE_ORDER: Record<NationalRankingHonor["stage"], number> = {
  champion: 0,
  runner_up: 1,
  semifinal: 2,
};

function getTournamentDivisionKey(
  tournamentSlug: string,
  gender: NationalGender
): string {
  return `${tournamentSlug}:${gender}`;
}

function compareBestResults(
  left: NationalRankingBestResult,
  right: NationalRankingBestResult,
  tournamentOrder: Map<string, number>
): number {
  const stageDifference =
    BEST_RESULT_STAGE_ORDER[left.stage] - BEST_RESULT_STAGE_ORDER[right.stage];
  if (stageDifference !== 0) return stageDifference;

  const tournamentUnitDifference =
    (NATIONAL_FORMULA_V7.tournamentUnits[right.tournamentSlug] ?? 0) -
    (NATIONAL_FORMULA_V7.tournamentUnits[left.tournamentSlug] ?? 0);
  if (tournamentUnitDifference !== 0) return tournamentUnitDifference;

  const yearDifference = right.year - left.year;
  if (yearDifference !== 0) return yearDifference;

  const entrantDifference = right.actualEntrants - left.actualEntrants;
  if (entrantDifference !== 0) return entrantDifference;

  const tournamentDifference =
    (tournamentOrder.get(left.tournamentSlug) ?? Number.MAX_SAFE_INTEGER) -
    (tournamentOrder.get(right.tournamentSlug) ?? Number.MAX_SAFE_INTEGER);
  if (tournamentDifference !== 0) return tournamentDifference;

  return left.sourceTeamName.localeCompare(right.sourceTeamName, "ko-KR");
}

function createRankingRow(
  clubSlug: string,
  gender: RankingGender,
  contributions: ScoreContribution[],
  honors: NationalRankingHonor[],
  bestResults: NationalRankingBestResult[],
  latestEditionYearByDivision: Map<string, number>
): CalculatedRankingRow {
  return {
    clubSlug,
    gender,
    rank: 0,
    totalPoints: contributions.reduce((total, item) => total + item.points, 0),
    latestEditionPoints: contributions.reduce(
      (total, item) =>
        total +
        (latestEditionYearByDivision.get(
          getTournamentDivisionKey(item.tournamentSlug, item.gender)
        ) === item.editionYear
          ? item.points
          : 0),
      0
    ),
    maxContribution: Math.max(0, ...contributions.map((item) => item.points)),
    championships: contributions.filter((item) => item.stage === "champion")
      .length,
    runnerUps: contributions.filter((item) => item.stage === "runner_up").length,
    contributions,
    honors,
    bestResults,
  };
}

function combineRankingRows(
  menRow: CalculatedRankingRow,
  womenRow: CalculatedRankingRow,
  tournamentOrder: Map<string, number>
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
    honors: sortHonors([...menRow.honors, ...womenRow.honors]),
    bestResults: [...menRow.bestResults, ...womenRow.bestResults]
      .sort((left, right) =>
        compareBestResults(left, right, tournamentOrder)
      )
      .slice(0, 3),
  };
}

function sortHonors(
  honors: NationalRankingHonor[]
): NationalRankingHonor[] {
  return honors.sort((left, right) => {
    const tournamentDifference = compareTournamentOccurrences(left, right);
    if (tournamentDifference !== 0) return tournamentDifference;

    if (left.gender !== right.gender) {
      return left.gender === "women" ? -1 : 1;
    }

    return PODIUM_STAGE_ORDER[left.stage] - PODIUM_STAGE_ORDER[right.stage];
  });
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

function assertUniqueEditions(
  row: CalculatedRankingRow,
  field: "contributions" | "honors" | "bestResults"
): void {
  const identities = new Set<string>();

  for (const item of row[field]) {
    const identity = `${item.editionKey}:${item.gender}`;
    if (identities.has(identity)) {
      throw new Error(
        `Duplicate ${field} edition "${item.editionKey}" for ${row.clubSlug}:${row.gender}`
      );
    }
    identities.add(identity);
  }
}

function assertCalculatedRankingIntegrity(
  rows: CalculatedRankingRow[]
): void {
  const rowsByIdentity = new Map(
    rows.map((row) => [`${row.clubSlug}:${row.gender}`, row])
  );

  for (const row of rows) {
    assertUniqueEditions(row, "contributions");
    assertUniqueEditions(row, "honors");
    assertUniqueEditions(row, "bestResults");

    const stageByEdition = new Map<
      string,
      { field: string; stage: string }
    >();
    for (const [field, items] of [
      ["contributions", row.contributions],
      ["honors", row.honors],
      ["bestResults", row.bestResults],
    ] as const) {
      for (const item of items) {
        const identity = `${item.editionKey}:${item.gender}`;
        const current = stageByEdition.get(identity);

        if (current && current.stage !== item.stage) {
          throw new Error(
            `Inconsistent ${identity} stage for ${row.clubSlug}:${row.gender}: ` +
              `${current.field}=${current.stage}, ${field}=${item.stage}`
          );
        }
        stageByEdition.set(identity, { field, stage: item.stage });
      }
    }

    const contributionTotal = row.contributions.reduce(
      (total, contribution) => total + contribution.points,
      0
    );
    const championships = row.contributions.filter(
      (contribution) => contribution.stage === "champion"
    ).length;
    const runnerUps = row.contributions.filter(
      (contribution) => contribution.stage === "runner_up"
    ).length;
    const maxContribution = Math.max(
      0,
      ...row.contributions.map((contribution) => contribution.points)
    );

    if (
      (row.gender !== "combined" &&
        row.totalPoints !== contributionTotal) ||
      row.championships !== championships ||
      row.runnerUps !== runnerUps ||
      row.maxContribution !== maxContribution
    ) {
      throw new Error(
        `Inconsistent ranking aggregates for ${row.clubSlug}:${row.gender}`
      );
    }

    if (
      row.gender !== "combined" &&
      [
        ...row.contributions,
        ...row.honors,
        ...row.bestResults,
      ].some((item) => item.gender !== row.gender)
    ) {
      throw new Error(
        `Cross-division ranking item for ${row.clubSlug}:${row.gender}`
      );
    }

    if (row.gender === "combined") {
      const men = rowsByIdentity.get(`${row.clubSlug}:men`);
      const women = rowsByIdentity.get(`${row.clubSlug}:women`);
      const expected = {
        totalPoints: (men?.totalPoints ?? 0) + (women?.totalPoints ?? 0),
        latestEditionPoints:
          (men?.latestEditionPoints ?? 0) +
          (women?.latestEditionPoints ?? 0),
        championships:
          (men?.championships ?? 0) + (women?.championships ?? 0),
        runnerUps: (men?.runnerUps ?? 0) + (women?.runnerUps ?? 0),
      };

      if (
        row.totalPoints !== expected.totalPoints ||
        row.latestEditionPoints !== expected.latestEditionPoints ||
        row.championships !== expected.championships ||
        row.runnerUps !== expected.runnerUps
      ) {
        throw new Error(
          `Inconsistent combined ranking aggregates for ${row.clubSlug}`
        );
      }
    }
  }

  for (const gender of ["men", "women", "combined"] as const) {
    const divisionRows = rows.filter((row) => row.gender === gender);
    for (const [index, row] of divisionRows.entries()) {
      if (row.rank !== index + 1) {
        throw new Error(`Non-contiguous ${gender} ranking at ${row.clubSlug}`);
      }
    }
  }
}

export function calculateNationalRankings(
  dataset: NationalRankingDataset,
  formula: NationalFormula = NATIONAL_FORMULA_V7
): CalculatedNationalRanking {
  const clubsBySlug = new Map(dataset.clubs.map((club) => [club.slug, club]));
  const tournamentsBySlug = new Map(
    dataset.tournaments.map((tournament) => [tournament.slug, tournament])
  );
  const tournamentOrder = new Map(
    dataset.tournaments.map((tournament, index) => [tournament.slug, index])
  );
  const editionsByKey = new Map(
    dataset.editions.map((edition) => [edition.key, edition])
  );
  const latestEditionYearByDivision = new Map<string, number>();

  if (formula.version === "national-club-v2") {
    for (const tournament of dataset.tournaments) {
      getTournamentPrestigeFactor(tournament.slug, formula);
    }
  } else if (isUnitNationalFormula(formula)) {
    for (const tournament of dataset.tournaments) {
      getTournamentUnits(tournament.slug, formula);
    }
  }

  for (const edition of dataset.editions) {
    if (edition.sourceStatus !== "verified") continue;

    const divisionKey = getTournamentDivisionKey(
      edition.tournamentSlug,
      edition.gender
    );
    latestEditionYearByDivision.set(
      divisionKey,
      Math.max(latestEditionYearByDivision.get(divisionKey) ?? 0, edition.year)
    );
  }

  const honorByIdentity = new Map<string, NationalRankingHonor>();

  for (const result of dataset.results) {
    if (
      result.clubSlug === null ||
      (result.stage !== "champion" &&
        result.stage !== "runner_up" &&
        result.stage !== "semifinal")
    ) {
      continue;
    }

    const club = clubsBySlug.get(result.clubSlug);
    const edition = editionsByKey.get(result.editionKey);
    const tournament = edition
      ? tournamentsBySlug.get(edition.tournamentSlug)
      : undefined;

    if (!club || !edition || !tournament) continue;

    const honor: NationalRankingHonor = {
      editionKey: edition.key,
      tournamentSlug: tournament.slug,
      tournamentName: tournament.name,
      year: edition.year,
      gender: edition.gender,
      stage: result.stage,
    };
    const identity = [
      club.slug,
      honor.editionKey,
      honor.gender,
    ].join(":");
    const currentHonor = honorByIdentity.get(identity);

    if (
      !currentHonor ||
      PODIUM_STAGE_ORDER[honor.stage] <
        PODIUM_STAGE_ORDER[currentHonor.stage]
    ) {
      honorByIdentity.set(identity, honor);
    }
  }

  const honorsByClubAndGender = new Map<string, NationalRankingHonor[]>();
  for (const [identity, honor] of honorByIdentity) {
    const [clubSlug] = identity.split(":");
    const key = `${clubSlug}:${honor.gender}`;
    const honors = honorsByClubAndGender.get(key) ?? [];

    honors.push(honor);
    honorsByClubAndGender.set(key, honors);
  }
  for (const [key, honors] of honorsByClubAndGender) {
    honorsByClubAndGender.set(key, sortHonors(honors));
  }

  const bestResultByIdentity = new Map<string, NationalRankingBestResult>();

  for (const result of dataset.results) {
    if (
      result.clubSlug === null ||
      result.qualityStatus !== "verified" ||
      result.stage === null ||
      !PUBLIC_RESULT_STAGES.has(result.stage as PublicTournamentResultStage)
    ) {
      continue;
    }

    const club = clubsBySlug.get(result.clubSlug);
    const edition = editionsByKey.get(result.editionKey);
    const tournament = edition
      ? tournamentsBySlug.get(edition.tournamentSlug)
      : undefined;

    if (!club || !edition || !tournament || edition.sourceStatus !== "verified") {
      continue;
    }

    const bestResult: NationalRankingBestResult = {
      editionKey: edition.key,
      tournamentSlug: tournament.slug,
      tournamentName: tournament.name,
      year: edition.year,
      gender: edition.gender,
      actualEntrants: edition.actualEntrants,
      stage: result.stage as PublicTournamentResultStage,
      sourceTeamName: result.sourceTeamName,
    };
    const identity = [
      club.slug,
      edition.gender,
      tournament.slug,
      edition.year,
    ].join(":");
    const currentBest = bestResultByIdentity.get(identity);

    if (
      !currentBest ||
      compareBestResults(bestResult, currentBest, tournamentOrder) < 0
    ) {
      bestResultByIdentity.set(identity, bestResult);
    }
  }

  const bestResultsByClubAndGender = new Map<
    string,
    NationalRankingBestResult[]
  >();
  for (const [identity, bestResult] of bestResultByIdentity) {
    const [clubSlug] = identity.split(":");
    const key = `${clubSlug}:${bestResult.gender}`;
    const bestResults = bestResultsByClubAndGender.get(key) ?? [];

    bestResults.push(bestResult);
    bestResultsByClubAndGender.set(key, bestResults);
  }
  for (const [key, bestResults] of bestResultsByClubAndGender) {
    bestResultsByClubAndGender.set(
      key,
      bestResults
        .sort((left, right) =>
          compareBestResults(left, right, tournamentOrder)
        )
        .slice(0, 3)
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

    const latestEditionYear =
      latestEditionYearByDivision.get(
        getTournamentDivisionKey(tournament.slug, edition.gender)
      ) ?? edition.year;
    const tournamentPrestigeFactor =
      formula.version === "national-club-v2"
        ? getTournamentPrestigeFactor(tournament.slug, formula)
        : undefined;
    const tournamentUnits =
      isUnitNationalFormula(formula)
        ? getTournamentUnits(tournament.slug, formula)
        : undefined;
    const fieldSizeUnits = usesFieldSizeUnits(formula)
      ? getFieldSizeUnits(edition.actualEntrants, formula)
      : undefined;
    const recencyUnits =
      isUnitNationalFormula(formula)
        ? getRecencyUnits(latestEditionYear, edition.year, formula)
        : undefined;

    if (
      isUnitNationalFormula(formula)
        ? recencyUnits === 0
        : getRecencyFactor(latestEditionYear, edition.year, formula) === 0
    ) {
      continue;
    }

    const points =
      isUnitNationalFormula(formula)
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
    const menHonors = honorsByClubAndGender.get(`${club.slug}:men`) ?? [];
    const womenHonors = honorsByClubAndGender.get(`${club.slug}:women`) ?? [];
    const menBestResults =
      bestResultsByClubAndGender.get(`${club.slug}:men`) ?? [];
    const womenBestResults =
      bestResultsByClubAndGender.get(`${club.slug}:women`) ?? [];
    const menRow = createRankingRow(
      club.slug,
      "men",
      menContributions,
      menHonors,
      menBestResults,
      latestEditionYearByDivision
    );
    const womenRow = createRankingRow(
      club.slug,
      "women",
      womenContributions,
      womenHonors,
      womenBestResults,
      latestEditionYearByDivision
    );

    if (
      menContributions.length > 0 ||
      menHonors.length > 0 ||
      menBestResults.length > 0
    ) {
      genderRows.men.push(menRow);
    }
    if (
      womenContributions.length > 0 ||
      womenHonors.length > 0 ||
      womenBestResults.length > 0
    ) {
      genderRows.women.push(womenRow);
    }
    if (
      menContributions.length > 0 ||
      womenContributions.length > 0 ||
      menHonors.length > 0 ||
      womenHonors.length > 0 ||
      menBestResults.length > 0 ||
      womenBestResults.length > 0
    ) {
      combinedRows.push(
        combineRankingRows(menRow, womenRow, tournamentOrder)
      );
    }
  }

  const rows = [
    ...sortAndRank(genderRows.men, clubsBySlug),
    ...sortAndRank(genderRows.women, clubsBySlug),
    ...sortAndRank(combinedRows, clubsBySlug),
  ];

  assertCalculatedRankingIntegrity(rows);

  return { formulaVersion: formula.version, rows };
}
