import { describe, expect, it } from "vitest";

import {
  compareTournamentOccurrences,
  getTournamentResultDisplayName,
  getTournamentShortName,
} from "./tournamentPresentation";

type Occurrence = {
  year: number;
  tournamentSlug: string;
  tournamentName: string;
};

function occurrence(year: number, tournamentSlug: string): Occurrence {
  return {
    year,
    tournamentSlug,
    tournamentName: tournamentSlug,
  };
}

describe("tournament presentation", () => {
  it("sorts tournaments from the latest to the earliest within a year", () => {
    const results = [
      occurrence(2026, "wemix"),
      occurrence(2026, "yanggu"),
      occurrence(2026, "gyeongin"),
      occurrence(2026, "yeongwol"),
      occurrence(2026, "chuncheon"),
      occurrence(2026, "inje"),
    ].sort(compareTournamentOccurrences);

    expect(results.map((result) => result.tournamentSlug)).toEqual([
      "wemix",
      "chuncheon",
      "yanggu",
      "inje",
      "gyeongin",
      "yeongwol",
    ]);
  });

  it("uses the reverse of the actual 2025 tournament order", () => {
    const results = [
      occurrence(2025, "wemix"),
      occurrence(2025, "gyeongin"),
      occurrence(2025, "yeongwol"),
      occurrence(2025, "chuncheon"),
      occurrence(2025, "yanggu"),
      occurrence(2025, "inje"),
    ].sort(compareTournamentOccurrences);

    expect(results.map((result) => result.tournamentSlug)).toEqual([
      "wemix",
      "gyeongin",
      "chuncheon",
      "yanggu",
      "inje",
      "yeongwol",
    ]);
  });

  it("keeps newer years before older years", () => {
    const results = [
      occurrence(2025, "yeongwol"),
      occurrence(2026, "wemix"),
    ].sort(compareTournamentOccurrences);

    expect(results.map((result) => result.year)).toEqual([2026, 2025]);
  });

  it("uses concise Yeongwol labels without changing the source name", () => {
    expect(
      getTournamentShortName(
        "yeongwol",
        "영월 전국대학 동아리 테니스 대회"
      )
    ).toBe("영월");
    expect(
      getTournamentResultDisplayName(
        "yeongwol",
        "영월 전국대학 동아리 테니스 대회"
      )
    ).toBe("영월 전국대학 테니스 대회");
  });
});
