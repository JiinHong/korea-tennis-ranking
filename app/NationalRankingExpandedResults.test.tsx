import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NationalRankingBestResult } from "@/lib/nationalRanking/types";

import NationalRankingExpandedResults from "./NationalRankingExpandedResults";

const analytics = vi.hoisted(() => ({
  trackAmplitudeEvent: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/amplitudeAnalytics", () => analytics);

const bestResults: NationalRankingBestResult[] = [
  {
    editionKey: "yanggu-2025-men",
    tournamentSlug: "yanggu",
    tournamentName: "국토정중앙배(양구)",
    year: 2025,
    gender: "men",
    actualEntrants: 64,
    stage: "semifinal",
    sourceTeamName: "느티나무 A",
  },
  {
    editionKey: "gyeongin-2024-men",
    tournamentSlug: "gyeongin",
    tournamentName: "경인지구 연맹전",
    year: 2024,
    gender: "men",
    actualEntrants: 48,
    stage: "champion",
    sourceTeamName: "느티나무",
  },
  {
    editionKey: "chuncheon-2025-men",
    tournamentSlug: "chuncheon",
    tournamentName: "춘천소양강배",
    year: 2025,
    gender: "men",
    actualEntrants: 32,
    stage: "quarterfinal",
    sourceTeamName: "서울과기대",
  },
  {
    editionKey: "inje-2023-men",
    tournamentSlug: "inje",
    tournamentName: "하늘내린인제",
    year: 2023,
    gender: "men",
    actualEntrants: 24,
    stage: "round_of_16",
    sourceTeamName: "느티나무 B",
  },
];

describe("NationalRankingExpandedResults", () => {
  beforeEach(() => {
    analytics.trackAmplitudeEvent.mockClear();
  });

  it("전체 연도 최고 성적을 최대 세 개만 표시한다", () => {
    render(
      <NationalRankingExpandedResults
        activeGender="men"
        bestResults={bestResults}
        clubSlug="seoultech-neutinamu"
        displayName="서울과학기술대학교 느티나무"
        isOpen
        regionId="seoultech-results"
      />
    );

    const region = screen.getByRole("region", {
      name: "서울과학기술대학교 느티나무 최고 성적",
    });

    expect(within(region).getAllByRole("listitem")).toHaveLength(3);
    expect(within(region).queryByText("2023 하늘내린인제")).toBeNull();
  });

  it("2025년 입상에만 왕관을 붙이고 전체 성적 링크에 현재 부문을 보존한다", () => {
    const { container } = render(
      <NationalRankingExpandedResults
        activeGender="men"
        bestResults={bestResults}
        clubSlug="seoultech-neutinamu"
        displayName="서울과학기술대학교 느티나무"
        isOpen
        regionId="seoultech-results"
      />
    );

    const crowns = container.querySelectorAll<HTMLImageElement>(
      ".national-result-crown"
    );
    expect(crowns).toHaveLength(1);
    expect(crowns[0].getAttribute("src")).toContain(
      encodeURIComponent("/national-ranking/bronze-crown.png")
    );
    expect(
      screen.getByRole("link", { name: "전체 성적 보기" }).getAttribute("href")
    ).toBe("/clubs/seoultech-neutinamu?gender=men");
  });

  it("닫힌 영역은 접근성 트리와 탭 순서에서 제외한다", () => {
    const { container } = render(
      <NationalRankingExpandedResults
        activeGender="women"
        bestResults={bestResults}
        clubSlug="seoultech-neutinamu"
        displayName="서울과학기술대학교 느티나무"
        isOpen={false}
        regionId="seoultech-results"
      />
    );

    expect(
      screen.queryByRole("region", {
        name: "서울과학기술대학교 느티나무 최고 성적",
      })
    ).toBeNull();
    expect(container.querySelector('[role="region"]')?.getAttribute("aria-hidden")).toBe(
      "true"
    );
    expect(container.querySelector("a")?.getAttribute("tabindex")).toBe("-1");
  });

  it("전체 성적 페이지 이동을 현재 부문과 함께 기록한다", () => {
    render(
      <NationalRankingExpandedResults
        activeGender="men"
        bestResults={bestResults}
        clubSlug="seoultech-neutinamu"
        displayName="서울과학기술대학교 느티나무"
        isOpen
        regionId="seoultech-results"
      />
    );

    const resultsLink = screen.getByRole("link", { name: "전체 성적 보기" });
    resultsLink.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(resultsLink);

    expect(analytics.trackAmplitudeEvent).toHaveBeenCalledWith(
      "National Club Results Opened",
      {
        club_slug: "seoultech-neutinamu",
        division: "men",
      }
    );
  });
});
