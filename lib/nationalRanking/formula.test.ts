import { describe, expect, it } from "vitest";

import * as nationalFormula from "@/lib/nationalRanking/formula";
import {
  NATIONAL_FORMULA_V1,
  NATIONAL_FORMULA_V2,
  NATIONAL_FORMULA_V3,
  NATIONAL_FORMULA_V4,
  NATIONAL_FORMULA_V5,
  NATIONAL_FORMULA_V6,
  NATIONAL_FORMULA_V7,
  getFieldSizeFactor,
  getRecencyFactor,
  getRecencyUnits,
  getStagePoints,
  scoreVerifiedResult,
} from "@/lib/nationalRanking/formula";

describe("national ranking formula v2", () => {
  it("defines the approved three-tier tournament prestige weights", () => {
    const formula = Reflect.get(nationalFormula, "NATIONAL_FORMULA_V2");

    expect(formula).toMatchObject({
      version: "national-club-v2",
      tournamentPrestigeFactors: {
        yanggu: 1,
        gyeongin: 0.9,
        chuncheon: 0.9,
        wemix: 0.8,
        inje: 0.8,
      },
    });
  });

  it("uses the approved ATP-shaped stage curve", () => {
    expect(getStagePoints("champion", NATIONAL_FORMULA_V2)).toBe(100);
    expect(getStagePoints("runner_up", NATIONAL_FORMULA_V2)).toBe(65);
    expect(getStagePoints("semifinal", NATIONAL_FORMULA_V2)).toBe(40);
    expect(getStagePoints("quarterfinal", NATIONAL_FORMULA_V2)).toBe(20);
    expect(getStagePoints("round_of_16", NATIONAL_FORMULA_V2)).toBe(10);
    expect(getStagePoints("round_of_32", NATIONAL_FORMULA_V2)).toBe(5);
    expect(getStagePoints("round_of_64", NATIONAL_FORMULA_V2)).toBe(2.5);
    expect(getStagePoints("first_match_loss", NATIONAL_FORMULA_V2)).toBe(0);
  });

  it("applies the logarithmic field factor and clamps its range", () => {
    expect(getFieldSizeFactor(16, NATIONAL_FORMULA_V2)).toBeCloseTo(0.9);
    expect(getFieldSizeFactor(32, NATIONAL_FORMULA_V2)).toBeCloseTo(1);
    expect(getFieldSizeFactor(64, NATIONAL_FORMULA_V2)).toBeCloseTo(1.1);
    expect(getFieldSizeFactor(128, NATIONAL_FORMULA_V2)).toBeCloseTo(1.2);
    expect(getFieldSizeFactor(4, NATIONAL_FORMULA_V2)).toBe(0.85);
    expect(getFieldSizeFactor(512, NATIONAL_FORMULA_V2)).toBe(1.2);
  });

  it("keeps only the latest three edition years", () => {
    expect(getRecencyFactor(2025, 2025, NATIONAL_FORMULA_V2)).toBe(1);
    expect(getRecencyFactor(2025, 2024, NATIONAL_FORMULA_V2)).toBeCloseTo(0.6);
    expect(getRecencyFactor(2025, 2023, NATIONAL_FORMULA_V2)).toBeCloseTo(0.36);
    expect(getRecencyFactor(2025, 2022, NATIONAL_FORMULA_V2)).toBe(0);
  });

  it("multiplies the tournament prestige factor instead of a generic scope factor", () => {
    expect(
      scoreVerifiedResult({
        stage: "champion",
        tournamentPrestigeFactor: 0.9,
        actualEntrants: 64,
        latestEditionYear: 2025,
        editionYear: 2024,
      } as Parameters<typeof scoreVerifiedResult>[0], NATIONAL_FORMULA_V2)
    ).toBeCloseTo(59.4);
  });

  it("keeps the v1 scope-weighted formula reproducible", () => {
    expect(
      scoreVerifiedResult(
        {
          stage: "champion",
          scopeFactor: 0.85,
          actualEntrants: 32,
          latestEditionYear: 2025,
          editionYear: 2025,
        },
        NATIONAL_FORMULA_V1
      )
    ).toBe(85);
  });

  it("keeps v1 and v2 runtime configuration immutable and independent", () => {
    expect(Object.isFrozen(NATIONAL_FORMULA_V1)).toBe(true);
    expect(Object.isFrozen(NATIONAL_FORMULA_V1.stagePoints)).toBe(true);
    expect(Object.isFrozen(NATIONAL_FORMULA_V1.field)).toBe(true);
    expect(Object.isFrozen(NATIONAL_FORMULA_V2)).toBe(true);
    expect(Object.isFrozen(NATIONAL_FORMULA_V2.stagePoints)).toBe(true);
    expect(Object.isFrozen(NATIONAL_FORMULA_V2.field)).toBe(true);
    expect(Object.isFrozen(NATIONAL_FORMULA_V2.tournamentPrestigeFactors)).toBe(
      true
    );
    expect(NATIONAL_FORMULA_V1.stagePoints).not.toBe(
      NATIONAL_FORMULA_V2.stagePoints
    );
    expect(NATIONAL_FORMULA_V1.field).not.toBe(NATIONAL_FORMULA_V2.field);
    expect(
      Reflect.set(NATIONAL_FORMULA_V2.stagePoints, "champion", 999)
    ).toBe(false);
    expect(NATIONAL_FORMULA_V1.stagePoints.champion).toBe(100);
    expect(NATIONAL_FORMULA_V2.stagePoints.champion).toBe(100);
  });
});

describe("national ranking formula v3", () => {
  it("defines the approved exact integer units", () => {
    const formula = Reflect.get(nationalFormula, "NATIONAL_FORMULA_V3");

    expect(formula).toMatchObject({
      version: "national-club-v3",
      stageUnits: {
        champion: 21,
        runner_up: 13,
        semifinal: 8,
        quarterfinal: 5,
        round_of_16: 3,
        round_of_32: 2,
        round_of_64: 1,
        first_match_loss: 0,
      },
      tournamentUnits: {
        yanggu: 3,
        gyeongin: 2,
        chuncheon: 2,
        inje: 1,
        wemix: 1,
      },
      fieldSizeTiers: [
        { maximumEntrants: 12, units: 1 },
        { maximumEntrants: 31, units: 2 },
        { maximumEntrants: 63, units: 3 },
        { maximumEntrants: null, units: 4 },
      ],
      recencyUnits: [3, 2, 1],
    });
  });

  it("keeps the historical v3 tournament units unchanged", () => {
    expect(NATIONAL_FORMULA_V3.tournamentUnits).toEqual({
      yanggu: 3,
      gyeongin: 2,
      chuncheon: 2,
      inje: 1,
      wemix: 1,
    });
  });

  it.each([
    [1, 1],
    [8, 1],
    [12, 1],
    [13, 2],
    [31, 2],
    [32, 3],
    [63, 3],
    [64, 4],
  ])("maps %i entrants to %i field-size units", (entrants, expected) => {
    const getFieldSizeUnits = Reflect.get(
      nationalFormula,
      "getFieldSizeUnits"
    ) as
      | undefined
      | ((actualEntrants: number, formula: typeof NATIONAL_FORMULA_V3) => number);

    expect(getFieldSizeUnits).toBeTypeOf("function");
    expect(getFieldSizeUnits?.(entrants, NATIONAL_FORMULA_V3)).toBe(expected);
  });

  it.each([
    [2025, 2025, 3],
    [2025, 2024, 2],
    [2025, 2023, 1],
    [2025, 2022, 0],
  ])(
    "maps latest year %i and edition year %i to %i recency units",
    (latestEditionYear, editionYear, expected) => {
      const getRecencyUnits = Reflect.get(
        nationalFormula,
        "getRecencyUnits"
      ) as
        | undefined
        | ((
            latestEditionYear: number,
            editionYear: number,
            formula: typeof NATIONAL_FORMULA_V3
          ) => number);

      expect(getRecencyUnits).toBeTypeOf("function");
      expect(
        getRecencyUnits?.(
          latestEditionYear,
          editionYear,
          NATIONAL_FORMULA_V3
        )
      ).toBe(expected);
    }
  );

  it.each([
    ["yanggu", 3],
    ["gyeongin", 2],
    ["chuncheon", 2],
    ["inje", 1],
    ["wemix", 1],
  ])("maps %s to %i tournament units", (tournamentSlug, expected) => {
    const getTournamentUnits = Reflect.get(
      nationalFormula,
      "getTournamentUnits"
    ) as
      | undefined
      | ((slug: string, formula: typeof NATIONAL_FORMULA_V3) => number);

    expect(getTournamentUnits).toBeTypeOf("function");
    expect(getTournamentUnits?.(tournamentSlug, NATIONAL_FORMULA_V3)).toBe(
      expected
    );
  });

  it("calculates exact integer examples without rounding", () => {
    const formula = Reflect.get(nationalFormula, "NATIONAL_FORMULA_V3");
    const examples = [
      [{ stage: "champion", tournamentSlug: "yanggu", actualEntrants: 94 }, 756],
      [{ stage: "champion", tournamentSlug: "gyeongin", actualEntrants: 22 }, 252],
      [{ stage: "champion", tournamentSlug: "inje", actualEntrants: 20 }, 126],
      [{ stage: "champion", tournamentSlug: "wemix", actualEntrants: 8 }, 63],
    ] as const;

    for (const [example, expected] of examples) {
      const input = {
        ...example,
        latestEditionYear: 2025,
        editionYear: 2025,
      };

      expect(() =>
        scoreVerifiedResult(
          input as unknown as Parameters<typeof scoreVerifiedResult>[0],
          formula
        )
      ).not.toThrow();
      expect(
        scoreVerifiedResult(
          input as unknown as Parameters<typeof scoreVerifiedResult>[0],
          formula
        )
      ).toBe(expected);
    }
  });
});

describe("national ranking formula v4", () => {
  it("adds Yeongwol without rewriting the historical v3 formula", () => {
    expect(NATIONAL_FORMULA_V4).toMatchObject({
      version: "national-club-v4",
      tournamentUnits: {
        yanggu: 3,
        gyeongin: 2,
        chuncheon: 2,
        inje: 1,
        wemix: 1,
        yeongwol: 1,
      },
    });
    expect(NATIONAL_FORMULA_V3.tournamentUnits).not.toHaveProperty("yeongwol");
  });
});

describe("national ranking formula v5", () => {
  it("removes participant scale from scoring and uses 4:2:1 recency", () => {
    expect(NATIONAL_FORMULA_V5).toMatchObject({
      version: "national-club-v5",
      stageUnits: NATIONAL_FORMULA_V4.stageUnits,
      tournamentUnits: NATIONAL_FORMULA_V4.tournamentUnits,
      recencyUnits: [4, 2, 1],
    });
    expect(NATIONAL_FORMULA_V5).not.toHaveProperty("fieldSizeTiers");
  });

  it("awards the same points regardless of participant count", () => {
    const score = (actualEntrants: number) =>
      scoreVerifiedResult(
        {
          stage: "champion",
          tournamentSlug: "yanggu",
          actualEntrants,
          latestEditionYear: 2026,
          editionYear: 2026,
        },
        NATIONAL_FORMULA_V5
      );

    expect(score(12)).toBe(252);
    expect(score(128)).toBe(252);
  });

  it.each([
    [2026, 2026, 4],
    [2026, 2025, 2],
    [2026, 2024, 1],
    [2026, 2023, 0],
  ])(
    "maps latest year %i and edition year %i to %i recency units",
    (latestEditionYear, editionYear, expected) => {
      expect(
        getRecencyUnits(
          latestEditionYear,
          editionYear,
          NATIONAL_FORMULA_V5
        )
      ).toBe(expected);
    }
  );
});

describe("national ranking formula v6", () => {
  it("uses an exact Fibonacci-shaped stage curve without changing other weights", () => {
    expect(NATIONAL_FORMULA_V6).toMatchObject({
      version: "national-club-v6",
      stageUnits: {
        champion: 55,
        runner_up: 34,
        semifinal: 21,
        quarterfinal: 13,
        round_of_16: 8,
        round_of_32: 5,
        round_of_64: 3,
        first_match_loss: 0,
      },
      tournamentUnits: NATIONAL_FORMULA_V5.tournamentUnits,
      recencyUnits: NATIONAL_FORMULA_V5.recencyUnits,
    });
    expect(NATIONAL_FORMULA_V6).not.toHaveProperty("fieldSizeTiers");
  });

  it("awards 660 points for a current Yanggu champion regardless of field size", () => {
    const score = (actualEntrants: number) =>
      scoreVerifiedResult(
        {
          stage: "champion",
          tournamentSlug: "yanggu",
          actualEntrants,
          latestEditionYear: 2026,
          editionYear: 2026,
        },
        NATIONAL_FORMULA_V6
      );

    expect(score(12)).toBe(660);
    expect(score(128)).toBe(660);
  });
});

describe("national ranking formula v7", () => {
  it("rebalances recency to 3.5:2.5:1 without changing the v6 score scale", () => {
    expect(NATIONAL_FORMULA_V7).toMatchObject({
      version: "national-club-v7",
      stageUnits: NATIONAL_FORMULA_V6.stageUnits,
      tournamentUnits: NATIONAL_FORMULA_V6.tournamentUnits,
      recencyUnits: [3.5, 2.5, 1],
    });
    expect(NATIONAL_FORMULA_V6.recencyUnits).toEqual([4, 2, 1]);
  });

  it("preserves exact half-point scores without rounding", () => {
    const score = (editionYear: number) =>
      scoreVerifiedResult(
        {
          stage: "champion",
          tournamentSlug: "yanggu",
          actualEntrants: 64,
          latestEditionYear: 2026,
          editionYear,
        },
        NATIONAL_FORMULA_V7
      );

    expect(score(2026)).toBe(577.5);
    expect(score(2025)).toBe(412.5);
    expect(score(2024)).toBe(165);
    expect(score(2023)).toBe(0);
  });
});
