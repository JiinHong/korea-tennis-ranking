import { describe, expect, test } from "vitest";

import { buildSupabaseSeedPlan } from "@/lib/supabaseSeedPlan";

describe("buildSupabaseSeedPlan", () => {
  test("builds idempotent seed records from current and historical sheet data", () => {
    const plan = buildSupabaseSeedPlan({
      club: {
        slug: "seoultech",
        title: "서울과학기술대학교 테니스 단식 랭킹",
        titleLines: ["서울과학기술대학교", "테니스 단식 랭킹"],
        organization: "서울과학기술대학교 테니스",
        subtitle: "도전과 방어로 만들어가는 우리들의 랭킹",
        logoPath: "/seoultech-symbol.png",
        logoAlt: "서울과학기술대학교 로고",
        sheetIdEnv: "GOOGLE_SHEET_ID",
        apiPath: "/api/clubs/seoultech/ranking",
        historicalMatchLogRange: "'시즌1~2 기록'!A1:J1000",
      },
      currentSeasonName: "시즌3",
      ranking: [
        { rank: 1, name: "오준석", note: "" },
        { rank: 2, name: "김도훈", note: "손목 부상" },
      ],
      matches: [
        {
          date: "2026. 7. 8",
          challenger: "김도훈",
          challengerRank: 2,
          defender: "오준석",
          defenderRank: 1,
          winner: "오준석",
          score: "6:4",
          defenseResult: "",
        },
      ],
      historicalMatches: [
        {
          date: "2026. 5. 26",
          challenger: "최재혁",
          challengerRank: 4,
          defender: "오준석",
          defenderRank: 1,
          winner: "최재혁",
          score: "6:5",
          defenseResult: "방어 실패",
          season: "시즌2",
          sourceNote: "카톡 OCR",
        },
      ],
    });

    expect(plan.club).toEqual({
      slug: "seoultech",
      title: "서울과학기술대학교 테니스 단식 랭킹",
      organization: "서울과학기술대학교 테니스",
      subtitle: "도전과 방어로 만들어가는 우리들의 랭킹",
      logoPath: "/seoultech-symbol.png",
    });
    expect(plan.seasons).toEqual([
      { name: "시즌3", isCurrent: true },
      { name: "시즌2", isCurrent: false },
    ]);
    expect(plan.players).toEqual([
      { name: "오준석", displayName: "오준석", normalizedName: "오준석" },
      { name: "김도훈", displayName: "김도훈", normalizedName: "김도훈" },
      { name: "최재혁", displayName: "최재혁", normalizedName: "최재혁" },
    ]);
    expect(plan.seasonPlayers).toEqual([
      {
        seasonName: "시즌3",
        playerName: "오준석",
        initialRank: 1,
        currentRank: 1,
        note: "",
        status: "active",
      },
      {
        seasonName: "시즌3",
        playerName: "김도훈",
        initialRank: 2,
        currentRank: 2,
        note: "손목 부상",
        status: "injured",
      },
    ]);
    expect(plan.matches).toEqual([
      {
        seasonName: "시즌3",
        playedOn: "2026-07-08",
        challengerName: "김도훈",
        defenderName: "오준석",
        challengerRank: 2,
        defenderRank: 1,
        winnerName: "오준석",
        winnerScore: 6,
        loserScore: 4,
        defenseResult: "방어 성공",
        source: "import",
        sourceKey: "current:1",
      },
      {
        seasonName: "시즌2",
        playedOn: "2026-05-26",
        challengerName: "최재혁",
        defenderName: "오준석",
        challengerRank: 4,
        defenderRank: 1,
        winnerName: "최재혁",
        winnerScore: 6,
        loserScore: 5,
        defenseResult: "방어 실패",
        source: "import",
        sourceKey: "historical:1",
      },
    ]);
    expect(plan.ruleConfig).toEqual({
      seasonName: "시즌3",
      challengeRange: 4,
      rematchCooldownDays: 14,
      inactivityPenaltyDrop: 2,
      injuryExemptionLimit: 2,
      injuryNoticeDeadlineDaysBeforeMonthEnd: 7,
    });
  });

  test("deduplicates names after trimming whitespace", () => {
    const plan = buildSupabaseSeedPlan({
      club: {
        slug: "seoultech",
        title: "서울과학기술대학교 테니스 단식 랭킹",
        titleLines: ["서울과학기술대학교", "테니스 단식 랭킹"],
        organization: "서울과학기술대학교 테니스",
        subtitle: "도전과 방어로 만들어가는 우리들의 랭킹",
        logoPath: "/seoultech-symbol.png",
        logoAlt: "서울과학기술대학교 로고",
        sheetIdEnv: "GOOGLE_SHEET_ID",
        apiPath: "/api/clubs/seoultech/ranking",
      },
      currentSeasonName: "시즌3",
      ranking: [{ rank: 1, name: " 오준석 ", note: "" }],
      matches: [
        {
          date: "2026. 7. 8",
          challenger: "오준석",
          challengerRank: 1,
          defender: " 오준석 ",
          defenderRank: 1,
          winner: "오준석",
          score: "6:4",
          defenseResult: "방어 성공",
        },
      ],
      historicalMatches: [],
    });

    expect(plan.players).toEqual([
      { name: "오준석", displayName: "오준석", normalizedName: "오준석" },
    ]);
  });

  test("normalizes forfeits to a 6 to 0 import score", () => {
    const plan = buildSupabaseSeedPlan({
      club: {
        slug: "seoultech",
        title: "서울과학기술대학교 테니스 단식 랭킹",
        titleLines: ["서울과학기술대학교", "테니스 단식 랭킹"],
        organization: "서울과학기술대학교 테니스",
        subtitle: "도전과 방어로 만들어가는 우리들의 랭킹",
        logoPath: "/seoultech-symbol.png",
        logoAlt: "서울과학기술대학교 로고",
        sheetIdEnv: "GOOGLE_SHEET_ID",
        apiPath: "/api/clubs/seoultech/ranking",
      },
      currentSeasonName: "시즌3",
      ranking: [
        { rank: 1, name: "오준석", note: "" },
        { rank: 2, name: "김도훈", note: "" },
      ],
      matches: [
        {
          date: "2026. 7. 8",
          challenger: "김도훈",
          challengerRank: 2,
          defender: "오준석",
          defenderRank: 1,
          winner: "오준석",
          score: "기권",
          defenseResult: "방어 성공",
        },
      ],
      historicalMatches: [],
    });

    expect(plan.matches[0]).toMatchObject({
      winnerScore: 6,
      loserScore: 0,
    });
  });

  test("normalizes blank legacy scores to a 6 to 0 import score", () => {
    const plan = buildSupabaseSeedPlan({
      club: {
        slug: "seoultech",
        title: "서울과학기술대학교 테니스 단식 랭킹",
        titleLines: ["서울과학기술대학교", "테니스 단식 랭킹"],
        organization: "서울과학기술대학교 테니스",
        subtitle: "도전과 방어로 만들어가는 우리들의 랭킹",
        logoPath: "/seoultech-symbol.png",
        logoAlt: "서울과학기술대학교 로고",
        sheetIdEnv: "GOOGLE_SHEET_ID",
        apiPath: "/api/clubs/seoultech/ranking",
      },
      currentSeasonName: "시즌3",
      ranking: [
        { rank: 1, name: "오준석", note: "" },
        { rank: 2, name: "김도훈", note: "" },
      ],
      matches: [],
      historicalMatches: [
        {
          date: "2026. 2. 23",
          challenger: "김도훈",
          challengerRank: 2,
          defender: "오준석",
          defenderRank: 1,
          winner: "오준석",
          score: "",
          defenseResult: "방어 성공",
          season: "시즌2",
          sourceNote: "원본 스코어 공란",
        },
      ],
    });

    expect(plan.matches[0]).toMatchObject({
      winnerScore: 6,
      loserScore: 0,
    });
  });

  test("keeps duplicate-looking source rows distinguishable with source keys", () => {
    const plan = buildSupabaseSeedPlan({
      club: {
        slug: "seoultech",
        title: "서울과학기술대학교 테니스 단식 랭킹",
        titleLines: ["서울과학기술대학교", "테니스 단식 랭킹"],
        organization: "서울과학기술대학교 테니스",
        subtitle: "도전과 방어로 만들어가는 우리들의 랭킹",
        logoPath: "/seoultech-symbol.png",
        logoAlt: "서울과학기술대학교 로고",
        sheetIdEnv: "GOOGLE_SHEET_ID",
        apiPath: "/api/clubs/seoultech/ranking",
      },
      currentSeasonName: "시즌3",
      ranking: [
        { rank: 1, name: "오준석", note: "" },
        { rank: 2, name: "김도훈", note: "" },
      ],
      matches: [
        {
          date: "2026. 7. 8",
          challenger: "김도훈",
          challengerRank: 2,
          defender: "오준석",
          defenderRank: 1,
          winner: "오준석",
          score: "6:4",
          defenseResult: "방어 성공",
        },
        {
          date: "2026. 7. 8",
          challenger: "김도훈",
          challengerRank: 2,
          defender: "오준석",
          defenderRank: 1,
          winner: "오준석",
          score: "6:4",
          defenseResult: "방어 성공",
        },
      ],
      historicalMatches: [],
    });

    expect(plan.matches.map((match) => match.sourceKey)).toEqual([
      "current:1",
      "current:2",
    ]);
  });
});
