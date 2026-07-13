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

export type FormulaBaseInput = {
  stage: TournamentStage;
  actualEntrants: number;
  latestEditionYear: number;
  editionYear: number;
};

export type FormulaV1Input = FormulaBaseInput & {
  scopeFactor: number;
};

export type FormulaV2Input = FormulaBaseInput & {
  tournamentPrestigeFactor: number;
};

export type FormulaV3Input = FormulaBaseInput & {
  tournamentSlug: string;
};

export type FormulaInput = FormulaV1Input | FormulaV2Input | FormulaV3Input;

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

export type ScoreContribution = FormulaBaseInput & {
  clubSlug: string;
  gender: NationalGender;
  tournamentSlug: string;
  editionKey: string;
  sourceTeamName: string;
  scopeFactor: number;
  tournamentPrestigeFactor?: number;
  tournamentUnits?: number;
  fieldSizeUnits?: number;
  recencyUnits?: number;
  points: number;
};

export type NationalRankingHonor = {
  editionKey: string;
  tournamentSlug: string;
  tournamentName: string;
  year: number;
  gender: NationalGender;
  stage: "champion" | "runner_up";
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
  honors: NationalRankingHonor[];
};

export type CalculatedNationalRanking = {
  formulaVersion:
    | "national-club-v1"
    | "national-club-v2"
    | "national-club-v3";
  rows: CalculatedRankingRow[];
};
