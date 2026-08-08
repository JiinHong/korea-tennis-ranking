import { describe, expect, it } from "vitest";

import { getAnalyticsPageContext } from "./pageTracking";

describe("getAnalyticsPageContext", () => {
  it.each([
    [
      "/",
      {
        pageName: "전국 대학 테니스 동아리 랭킹",
        pagePath: "/",
        pageType: "national_ranking",
      },
    ],
    [
      "/methodology",
      {
        pageName: "랭킹 계산 방식",
        pagePath: "/methodology",
        pageType: "ranking_methodology",
      },
    ],
    [
      "/clubs/seoultech-neutinamu",
      {
        nationalClubSlug: "seoultech-neutinamu",
        pageName: "동아리 대회 성적",
        pagePath: "/clubs/seoultech-neutinamu",
        pageType: "national_club_results",
      },
    ],
    [
      "/seoultech",
      {
        clubSlug: "seoultech",
        pageName: "서울과학기술대학교 테니스 단식 랭킹",
        pagePath: "/seoultech",
        pageType: "campus_ranking",
      },
    ],
    [
      "/petc/matches",
      {
        clubSlug: "petc",
        pageName: "고려대학교 체육교육과 PETC 전체 경기",
        pagePath: "/petc/matches",
        pageType: "campus_match_history",
      },
    ],
    [
      "/seoultech/rules",
      {
        clubSlug: "seoultech",
        pageName: "서울과학기술대학교 테니스 운영 규칙",
        pagePath: "/seoultech/rules",
        pageType: "campus_rules",
      },
    ],
    [
      "/seoultech/players/%EC%98%A4%EC%A4%80%EC%84%9D",
      {
        clubSlug: "seoultech",
        pageName: "서울과학기술대학교 테니스 선수 상세",
        pagePath: "/seoultech/players/%EC%98%A4%EC%A4%80%EC%84%9D",
        pageType: "player_profile",
        playerName: "오준석",
      },
    ],
  ])("%s 경로를 고유한 분석 페이지로 구분한다", (pathname, expected) => {
    expect(getAnalyticsPageContext(pathname)).toEqual(expected);
  });

  it("뒤쪽 슬래시를 제거해 같은 페이지로 기록한다", () => {
    expect(getAnalyticsPageContext("/petc/")).toMatchObject({
      pagePath: "/petc",
      pageType: "campus_ranking",
    });
  });

  it.each([
    "/admin",
    "/admin/matches",
    "/internal/analytics",
    "/api/clubs/seoultech/ranking",
    "/unknown",
  ])("분석 대상이 아닌 %s 경로는 제외한다", (pathname) => {
    expect(getAnalyticsPageContext(pathname)).toBeNull();
  });
});
