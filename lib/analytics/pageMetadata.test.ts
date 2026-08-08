import { describe, expect, it } from "vitest";

import {
  createCampusMatchHistoryMetadata,
  createCampusRankingMetadata,
  createCampusRulesMetadata,
  createMethodologyMetadata,
  createNationalClubResultsMetadata,
  createPlayerProfileMetadata,
} from "./pageMetadata";

describe("page metadata", () => {
  it("labels the methodology page independently from the national ranking", () => {
    expect(createMethodologyMetadata()).toMatchObject({
      title: "랭킹 계산 방식 | 전국 대학 테니스 동아리 랭킹",
      alternates: { canonical: "/methodology" },
    });
  });

  it("uses the campus name on a campus ranking page", () => {
    expect(createCampusRankingMetadata("seoultech")).toMatchObject({
      title: "서울과학기술대학교 테니스 단식 랭킹",
      alternates: { canonical: "/seoultech" },
    });
  });

  it("distinguishes campus match history and rules pages", () => {
    expect(createCampusMatchHistoryMetadata("petc")).toMatchObject({
      title: "전체 경기 | 고려대학교 체육교육과 PETC 테니스 단식 랭킹",
      alternates: { canonical: "/petc/matches" },
    });
    expect(createCampusRulesMetadata("seoultech")).toMatchObject({
      title: "운영 규칙 | 서울과학기술대학교 테니스 단식 랭킹",
      alternates: { canonical: "/seoultech/rules" },
    });
  });

  it("includes the player name on a player detail page", () => {
    expect(createPlayerProfileMetadata("seoultech", "오준석")).toMatchObject({
      title: "오준석 선수 상세 | 서울과학기술대학교 테니스 단식 랭킹",
      alternates: { canonical: "/seoultech/players/%EC%98%A4%EC%A4%80%EC%84%9D" },
    });
  });

  it("includes the club display name on a national results page", () => {
    expect(
      createNationalClubResultsMetadata(
        "seoultech-neutinamu",
        "서울과학기술대학교 느티나무",
      ),
    ).toMatchObject({
      title:
        "서울과학기술대학교 느티나무 대회 성적 | 전국 대학 테니스 동아리 랭킹",
      alternates: { canonical: "/clubs/seoultech-neutinamu" },
    });
  });
});
