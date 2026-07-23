import { describe, expect, it } from "vitest";

import { getClubConfig, listClubConfigs } from "@/lib/clubs";

describe("club configuration", () => {
  it("seoultech slug를 서울과기대 단식 랭킹 설정으로 바꾼다", () => {
    expect(getClubConfig("seoultech")).toEqual({
      slug: "seoultech",
      title: "서울과학기술대학교 테니스 단식 랭킹",
      titleLines: ["서울과학기술대학교", "테니스 단식 랭킹"],
      organization: "서울과학기술대학교 테니스",
      subtitle: "도전과 방어로 만들어가는 우리들의 랭킹",
      logoPath: "/seoultech-symbol.png",
      logoAlt: "서울과학기술대학교 로고",
      sheetIdEnv: "GOOGLE_SHEET_ID",
      apiPath: "/api/clubs/seoultech/ranking",
      currentSeasonName: "시즌3",
      currentSeasonStartsOn: "2026-07-01",
      historicalMatchLogRange: "'시즌1~2 기록'!A1:J1000",
    });
  });

  it("petc slug를 고려대 체육교육과 PETC 단식 랭킹 설정으로 바꾼다", () => {
    expect(getClubConfig("petc")).toEqual({
      slug: "petc",
      title: "고려대학교 체육교육과 PETC 테니스 단식 랭킹",
      titleLines: ["고려대학교 체육교육과 PETC", "테니스 단식 랭킹"],
      organization: "고려대학교 체육교육과 PETC",
      subtitle: "도전과 방어로 만들어가는 우리들의 랭킹",
      logoPath: "/petc-logo.png",
      logoAlt: "고려대학교 체육교육과 PETC 로고",
      sheetIdEnv: "PETC_GOOGLE_SHEET_ID",
      apiPath: "/api/clubs/petc/ranking",
      currentSeasonName: "현재",
      currentSeasonStartsOn: "2026-07-01",
    });
  });

  it("등록되지 않은 slug는 null로 처리한다", () => {
    expect(getClubConfig("unknown-club")).toBeNull();
  });

  it("목록 조회는 등록된 동아리만 반환한다", () => {
    expect(listClubConfigs()).toHaveLength(2);
    expect(listClubConfigs()[0]?.slug).toBe("seoultech");
    expect(listClubConfigs()[1]?.slug).toBe("petc");
  });
});
