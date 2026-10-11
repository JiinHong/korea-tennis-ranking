import { describe, expect, it } from "vitest";

import { calculateNationalRankings } from "./calculate";
import { loadNationalRankingDataset } from "./dataset";

describe("2026 Chuncheon gold-division results", () => {
  const dataset = loadNationalRankingDataset();

  it.each([
    ["men", 106, "978"],
    ["women", 52, "980"],
  ] as const)("imports every named %s entrant, excluding BYEs", (gender, count, draw) => {
    const key = `chuncheon-2026-${gender}`;
    expect(dataset.editions.find((edition) => edition.key === key)).toMatchObject({
      actualEntrants: count,
      sourceStatus: "verified",
      sourceRefs: [`https://www.tennisgame.co.kr/dashboard/onair/tm/415/${draw}`],
    });
    const results = dataset.results.filter((result) => result.editionKey === key);
    expect(results).toHaveLength(count);
    expect(results.some((result) => /BYE/i.test(result.sourceTeamName))).toBe(false);
    expect(results.filter((result) => result.stage === "champion")).toHaveLength(1);
    expect(results.filter((result) => result.stage === "runner_up")).toHaveLength(1);
    expect(results.filter((result) => result.stage === "semifinal")).toHaveLength(2);
    expect(results.filter((result) => result.stage === "quarterfinal")).toHaveLength(4);
    expect(results.filter((result) => result.stage === "round_of_16")).toHaveLength(8);
  });

  it.each([
    ["men", "서강대A", "sogang-sgtc", "champion"],
    ["men", "서울대A", "seoul-university", "runner_up"],
    ["men", "서울과학기술대학교 느티나무A", "seoultech-neutinamu", "semifinal"],
    ["men", "전북대 ace a", "jeonbuk-ace", "semifinal"],
    ["women", "연세대 진리", "yonsei-yutt", "champion"],
    ["women", "서울과기대 느티나무 A", "seoultech-neutinamu", "runner_up"],
    ["women", "한양대학교 HYTC A", "hanyang-hytc", "semifinal"],
    ["women", "고려대학교 KUTC A", "korea-kutc", "semifinal"],
  ])("preserves the %s podium result for %s", (gender, name, clubSlug, stage) => {
    expect(dataset.results.find((result) =>
      result.editionKey === `chuncheon-2026-${gender}` && result.sourceTeamName === name
    )).toMatchObject({ clubSlug, stage, qualityStatus: "verified" });
  });

  it("does not award a win for an opening BYE", () => {
    for (const [gender, name] of [["men", "성균관대 맹자"], ["men", "한림대 타이브레이크"], ["women", "홍익대 HITC B"], ["women", "중앙대A"]]) {
      expect(dataset.results.find((result) => result.editionKey === `chuncheon-2026-${gender}` && result.sourceTeamName === name)).toMatchObject({ stage: "first_match_loss" });
    }
  });

  it("applies the administrator-confirmed club identities without merging distinct SNU clubs", () => {
    for (const [gender, name, clubSlug] of [["men", "단대치대A", "dankook-ace"], ["men", "서울대 PnC", "seoul-university"], ["men", "서울대학교 IMPACT", "seoul-social-impact"], ["women", "강원대", "kangwon-baekryeong"], ["men", "강원대(SHOT)", "gangwon-shot"]]) {
      expect(dataset.results.find((result) => result.editionKey === `chuncheon-2026-${gender}` && result.sourceTeamName === name)).toMatchObject({ clubSlug, qualityStatus: "verified" });
    }
    expect(dataset.clubs.find((club) => club.slug === "seoul-social-impact")).toMatchObject({ universityName: "서울대학교 사회대학", clubName: "IMPACT", displayName: "서울대학교 사회대학 IMPACT" });
    expect(dataset.clubs.find((club) => club.slug === "kangwon-baekryeong")).toMatchObject({ clubName: "백령", displayName: "강원대학교 백령" });
    expect(dataset.results.find((result) => result.editionKey === "chuncheon-2025-men" && result.sourceTeamName === "단대치대 A")).toMatchObject({ clubSlug: "dankook-ace", qualityStatus: "verified" });
  });

  it("uses each club's best team and ages the previous Chuncheon edition", () => {
    const rows = calculateNationalRankings(dataset).rows;
    const yonsei = rows.find((row) => row.gender === "women" && row.clubSlug === "yonsei-yutt")!;
    expect(yonsei.contributions.filter((entry) => entry.editionKey === "chuncheon-2026-women")).toMatchObject([{ stage: "champion", sourceTeamName: "연세대 진리", latestEditionYear: 2026 }]);
    expect(yonsei.bestResults[0]).toMatchObject({ tournamentSlug: "chuncheon", year: 2026, stage: "champion" });
    expect(rows.flatMap((row) => row.contributions).filter((entry) => entry.tournamentSlug === "chuncheon" && entry.editionYear === 2025).every((entry) => entry.latestEditionYear === 2026)).toBe(true);
  });
});
