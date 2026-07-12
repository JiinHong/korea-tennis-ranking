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
