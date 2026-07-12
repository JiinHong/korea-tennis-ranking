import { describe, expect, it } from "vitest";

import {
  getFieldSizeFactor,
  getRecencyFactor,
  getStagePoints,
  scoreVerifiedResult,
} from "@/lib/nationalRanking/formula";

describe("national ranking formula v1", () => {
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

  it("multiplies every approved factor", () => {
    expect(
      scoreVerifiedResult({
        stage: "champion",
        scopeFactor: 1,
        actualEntrants: 64,
        latestEditionYear: 2025,
        editionYear: 2024,
      })
    ).toBeCloseTo(66);
  });
});
