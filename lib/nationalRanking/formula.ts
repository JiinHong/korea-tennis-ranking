import type {
  FormulaInput,
  FormulaV1Input,
  FormulaV2Input,
  TournamentStage,
} from "./types";

function createStagePoints() {
  return Object.freeze({
    champion: 100,
    runner_up: 65,
    semifinal: 40,
    quarterfinal: 20,
    round_of_16: 10,
    round_of_32: 5,
    round_of_64: 2.5,
    first_match_loss: 0,
  } as const);
}

function createFieldFactor() {
  return Object.freeze({
    minimum: 0.85,
    maximum: 1.2,
    baseline: 32,
    step: 0.1,
  } as const);
}

type NationalFormulaBase = {
  readonly stagePoints: Readonly<Record<TournamentStage, number>>;
  readonly field: {
    readonly minimum: number;
    readonly maximum: number;
    readonly baseline: number;
    readonly step: number;
  };
  readonly recencyRetention: number;
  readonly eligibleEditionSpan: number;
};

export type NationalFormulaV1 = NationalFormulaBase & {
  readonly version: "national-club-v1";
};

export type NationalFormulaV2 = NationalFormulaBase & {
  readonly version: "national-club-v2";
  readonly tournamentPrestigeFactors: Readonly<Record<string, number>>;
};

export type NationalFormula = NationalFormulaV1 | NationalFormulaV2;

export const NATIONAL_FORMULA_V1: NationalFormulaV1 = Object.freeze({
  version: "national-club-v1",
  stagePoints: createStagePoints(),
  field: createFieldFactor(),
  recencyRetention: 0.6,
  eligibleEditionSpan: 3,
});

export const NATIONAL_FORMULA_V2: NationalFormulaV2 = Object.freeze({
  version: "national-club-v2",
  stagePoints: createStagePoints(),
  field: createFieldFactor(),
  recencyRetention: 0.6,
  eligibleEditionSpan: 3,
  tournamentPrestigeFactors: Object.freeze({
    yanggu: 1,
    gyeongin: 0.9,
    chuncheon: 0.9,
    wemix: 0.8,
    inje: 0.8,
  }),
});

export function getStagePoints(
  stage: TournamentStage,
  formula: NationalFormula = NATIONAL_FORMULA_V2
): number {
  return formula.stagePoints[stage];
}

export function getFieldSizeFactor(
  actualEntrants: number,
  formula: NationalFormula = NATIONAL_FORMULA_V2
): number {
  if (!Number.isInteger(actualEntrants) || actualEntrants <= 0) {
    throw new Error("actualEntrants must be a positive integer");
  }

  const raw =
    1 +
    formula.field.step * Math.log2(actualEntrants / formula.field.baseline);

  return Math.min(
    formula.field.maximum,
    Math.max(formula.field.minimum, raw)
  );
}

export function getRecencyFactor(
  latestEditionYear: number,
  editionYear: number,
  formula: NationalFormula = NATIONAL_FORMULA_V2
): number {
  const age = latestEditionYear - editionYear;

  if (age < 0) throw new Error("editionYear cannot follow latestEditionYear");
  if (age >= formula.eligibleEditionSpan) return 0;

  return formula.recencyRetention ** age;
}

export function getTournamentPrestigeFactor(
  tournamentSlug: string,
  formula: NationalFormulaV2 = NATIONAL_FORMULA_V2
): number {
  const factor = formula.tournamentPrestigeFactors[tournamentSlug];

  if (factor === undefined) {
    throw new Error(
      `Tournament prestige factor is missing for "${tournamentSlug}"`
    );
  }
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new Error(
      `Tournament prestige factor must be positive for "${tournamentSlug}"`
    );
  }

  return factor;
}

export function scoreVerifiedResult(
  input: FormulaV2Input,
  formula?: NationalFormulaV2
): number;
export function scoreVerifiedResult(
  input: FormulaV1Input,
  formula: NationalFormulaV1
): number;
export function scoreVerifiedResult(
  input: FormulaInput,
  formula: NationalFormula
): number;
export function scoreVerifiedResult(
  input: FormulaInput,
  formula: NationalFormula = NATIONAL_FORMULA_V2
): number {
  const weightingFactor =
    formula.version === "national-club-v1"
      ? "scopeFactor" in input
        ? input.scopeFactor
        : Number.NaN
      : "tournamentPrestigeFactor" in input
        ? input.tournamentPrestigeFactor
        : Number.NaN;

  if (!Number.isFinite(weightingFactor) || weightingFactor <= 0) {
    throw new Error(`Weighting factor is invalid for ${formula.version}`);
  }

  return (
    getStagePoints(input.stage, formula) *
    weightingFactor *
    getFieldSizeFactor(input.actualEntrants, formula) *
    getRecencyFactor(input.latestEditionYear, input.editionYear, formula)
  );
}
