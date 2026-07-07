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
      logoPath: "/seoultech-logo.png",
      logoAlt: "서울과학기술대학교 로고",
      sheetIdEnv: "GOOGLE_SHEET_ID",
      apiPath: "/api/clubs/seoultech/ranking",
    });
  });

  it("등록되지 않은 slug는 null로 처리한다", () => {
    expect(getClubConfig("unknown-club")).toBeNull();
  });

  it("목록 조회는 등록된 동아리만 반환한다", () => {
    expect(listClubConfigs()).toHaveLength(1);
    expect(listClubConfigs()[0]?.slug).toBe("seoultech");
  });
});
