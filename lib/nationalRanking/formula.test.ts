import { describe, expect, it } from "vitest";

import * as nationalFormula from "@/lib/nationalRanking/formula";
import {
  NATIONAL_FORMULA_V1,
  NATIONAL_FORMULA_V2,
  getFieldSizeFactor,
  getRecencyFactor,
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
    expect(getStagePoints("champion")).toBe(100);
    expect(getStagePoints("runner_up")).toBe(65);
    expect(getStagePoints("semifinal")).toBe(40);
    expect(getStagePoints("quarterfinal")).toBe(20);
    expect(getStagePoints("round_of_16")).toBe(10);
    expect(getStagePoints("round_of_32")).toBe(5);
    expect(getStagePoints("round_of_64")).toBe(2.5);
    expect(getStagePoints("first_match_loss")).toBe(0);
  });

  it("applies the logarithmic field factor and clamps its range", () => {
    expect(getFieldSizeFactor(16)).toBeCloseTo(0.9);
    expect(getFieldSizeFactor(32)).toBeCloseTo(1);
    expect(getFieldSizeFactor(64)).toBeCloseTo(1.1);
    expect(getFieldSizeFactor(128)).toBeCloseTo(1.2);
    expect(getFieldSizeFactor(4)).toBe(0.85);
    expect(getFieldSizeFactor(512)).toBe(1.2);
  });

  it("keeps only the latest three edition years", () => {
    expect(getRecencyFactor(2025, 2025)).toBe(1);
    expect(getRecencyFactor(2025, 2024)).toBeCloseTo(0.6);
    expect(getRecencyFactor(2025, 2023)).toBeCloseTo(0.36);
    expect(getRecencyFactor(2025, 2022)).toBe(0);
  });

  it("multiplies the tournament prestige factor instead of a generic scope factor", () => {
    expect(
      scoreVerifiedResult({
        stage: "champion",
        tournamentPrestigeFactor: 0.9,
        actualEntrants: 64,
        latestEditionYear: 2025,
        editionYear: 2024,
      } as Parameters<typeof scoreVerifiedResult>[0])
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
