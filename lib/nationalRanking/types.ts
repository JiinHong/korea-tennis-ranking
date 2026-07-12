export type NationalGender = "men" | "women";
export type RankingGender = NationalGender | "combined";

export type TournamentStage =
  | "champion"
  | "runner_up"
  | "semifinal"
  | "quarterfinal"
  | "round_of_16"
  | "round_of_32"
  | "round_of_64"
  | "first_match_loss";

export type ResultQualityStatus =
  | "verified"
  | "unresolved"
  | "missing"
  | "did_not_enter";

export type FormulaInput = {
  stage: TournamentStage;
  scopeFactor: number;
  actualEntrants: number;
  latestEditionYear: number;
  editionYear: number;
};

export type NationalClubInput = {
  slug: string;
  universityName: string;
  clubName: string;
  displayName: string;
};

export type NationalClubAliasInput = {
  clubSlug: string;
  normalizedAlias: string;
  sourceLabel: string;
};

export type TournamentInput = {
  slug: string;
  name: string;
  scope: "national" | "regional";
  scopeFactor: number;
};

export type TournamentEditionInput = {
  key: string;
  tournamentSlug: string;
  year: number;
  gender: NationalGender;
  actualEntrants: number;
  sourceStatus: "verified" | "unresolved" | "missing";
  sourceRefs: string[];
};

export type TeamResultInput = {
  editionKey: string;
  clubSlug: string | null;
  sourceTeamName: string;
  teamLabel: string;
  sourceEntryId?: string;
  stage: TournamentStage | null;
  qualityStatus: ResultQualityStatus;
  sourceRef: string;
  note: string;
};

export type NationalRankingDataset = {
  version: string;
  clubs: NationalClubInput[];
  aliases: NationalClubAliasInput[];
  tournaments: TournamentInput[];
  editions: TournamentEditionInput[];
  results: TeamResultInput[];
};

export type ScoreContribution = FormulaInput & {
  clubSlug: string;
  gender: NationalGender;
  tournamentSlug: string;
  editionKey: string;
  sourceTeamName: string;
  points: number;
};

export type CalculatedRankingRow = {
  clubSlug: string;
  gender: RankingGender;
  rank: number;
  totalPoints: number;
  latestEditionPoints: number;
  maxContribution: number;
  championships: number;
  runnerUps: number;
  contributions: ScoreContribution[];
};

export type CalculatedNationalRanking = {
  formulaVersion: "national-club-v1";
  rows: CalculatedRankingRow[];
};
