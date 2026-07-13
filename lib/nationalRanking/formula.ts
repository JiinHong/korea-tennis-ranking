import type {
  FormulaInput,
  FormulaV1Input,
  FormulaV2Input,
  FormulaV3Input,
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

export type NationalFormulaV3 = {
  readonly version: "national-club-v3";
  readonly stageUnits: Readonly<Record<TournamentStage, number>>;
  readonly tournamentUnits: Readonly<Record<string, number>>;
  readonly fieldSizeTiers: ReadonlyArray<{
    readonly maximumEntrants: number | null;
    readonly units: number;
  }>;
  readonly recencyUnits: readonly [number, number, number];
};

export type NationalFormula =
  | NationalFormulaV1
  | NationalFormulaV2
  | NationalFormulaV3;

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

export const NATIONAL_FORMULA_V3: NationalFormulaV3 = Object.freeze({
  version: "national-club-v3",
  stageUnits: Object.freeze({
    champion: 21,
    runner_up: 13,
    semifinal: 8,
    quarterfinal: 5,
    round_of_16: 3,
    round_of_32: 2,
    round_of_64: 1,
    first_match_loss: 0,
  }),
  tournamentUnits: Object.freeze({
    yanggu: 3,
    gyeongin: 2,
    chuncheon: 2,
    inje: 1,
    wemix: 1,
  }),
  fieldSizeTiers: Object.freeze([
    Object.freeze({ maximumEntrants: 12, units: 1 }),
    Object.freeze({ maximumEntrants: 31, units: 2 }),
    Object.freeze({ maximumEntrants: 63, units: 3 }),
    Object.freeze({ maximumEntrants: null, units: 4 }),
  ]),
  recencyUnits: Object.freeze([3, 2, 1]),
});

export function getStagePoints(
  stage: TournamentStage,
  formula: NationalFormula = NATIONAL_FORMULA_V3
): number {
  return formula.version === "national-club-v3"
    ? formula.stageUnits[stage]
    : formula.stagePoints[stage];
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

export function getFieldSizeUnits(
  actualEntrants: number,
  formula: NationalFormulaV3 = NATIONAL_FORMULA_V3
): number {
  if (!Number.isInteger(actualEntrants) || actualEntrants <= 0) {
    throw new Error("actualEntrants must be a positive integer");
  }

  const tier = formula.fieldSizeTiers.find(
    ({ maximumEntrants }) =>
      maximumEntrants === null || actualEntrants <= maximumEntrants
  );

  if (!tier || !Number.isInteger(tier.units) || tier.units <= 0) {
    throw new Error("Field-size units must be a positive integer");
  }

  return tier.units;
}

export function getRecencyUnits(
  latestEditionYear: number,
  editionYear: number,
  formula: NationalFormulaV3 = NATIONAL_FORMULA_V3
): number {
  const age = latestEditionYear - editionYear;

  if (!Number.isInteger(age)) {
    throw new Error("Edition years must be integers");
  }
  if (age < 0) {
    throw new Error("editionYear cannot follow latestEditionYear");
  }

  return formula.recencyUnits[age] ?? 0;
}

export function getTournamentUnits(
  tournamentSlug: string,
  formula: NationalFormulaV3 = NATIONAL_FORMULA_V3
): number {
  const units = formula.tournamentUnits[tournamentSlug];

  if (!Number.isInteger(units) || units <= 0) {
    throw new Error(`Tournament units are missing for "${tournamentSlug}"`);
  }

  return units;
}

export function scoreVerifiedResult(
  input: FormulaV3Input,
  formula?: NationalFormulaV3
): number;

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
  formula: NationalFormula = NATIONAL_FORMULA_V3
): number {
  if (formula.version === "national-club-v3") {
    if (!("tournamentSlug" in input)) {
      throw new Error("tournamentSlug is required for national-club-v3");
    }

    return (
      getStagePoints(input.stage, formula) *
      getTournamentUnits(input.tournamentSlug, formula) *
      getFieldSizeUnits(input.actualEntrants, formula) *
      getRecencyUnits(
        input.latestEditionYear,
        input.editionYear,
        formula
      )
    );
  }

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
