import type { FormulaInput, TournamentStage } from "./types";

export const NATIONAL_FORMULA_V1 = {
  version: "national-club-v1",
  stagePoints: {
    champion: 100,
    runner_up: 65,
    semifinal: 40,
    quarterfinal: 20,
    round_of_16: 10,
    round_of_32: 5,
    round_of_64: 2.5,
    first_match_loss: 0,
  },
  field: { minimum: 0.85, maximum: 1.2, baseline: 32, step: 0.1 },
  recencyRetention: 0.6,
  eligibleEditionSpan: 3,
} as const;

export function getStagePoints(stage: TournamentStage): number {
  return NATIONAL_FORMULA_V1.stagePoints[stage];
}

export function getFieldSizeFactor(actualEntrants: number): number {
  if (!Number.isInteger(actualEntrants) || actualEntrants <= 0) {
    throw new Error("actualEntrants must be a positive integer");
  }

  const raw =
    1 +
    NATIONAL_FORMULA_V1.field.step *
      Math.log2(actualEntrants / NATIONAL_FORMULA_V1.field.baseline);

  return Math.min(
    NATIONAL_FORMULA_V1.field.maximum,
    Math.max(NATIONAL_FORMULA_V1.field.minimum, raw)
  );
}

export function getRecencyFactor(
  latestEditionYear: number,
  editionYear: number
): number {
  const age = latestEditionYear - editionYear;

  if (age < 0) throw new Error("editionYear cannot follow latestEditionYear");
  if (age >= NATIONAL_FORMULA_V1.eligibleEditionSpan) return 0;

  return NATIONAL_FORMULA_V1.recencyRetention ** age;
}

export function scoreVerifiedResult(input: FormulaInput): number {
  return (
    getStagePoints(input.stage) *
    input.scopeFactor *
    getFieldSizeFactor(input.actualEntrants) *
    getRecencyFactor(input.latestEditionYear, input.editionYear)
  );
}
