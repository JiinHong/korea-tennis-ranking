import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildLatestEditionYearMap } from "@/lib/nationalRanking/recentHonors";
import type {
  NationalRankingBestResult,
  NationalRankingHonor,
} from "@/lib/nationalRanking/types";

import NationalRankingExpandedResults from "./NationalRankingExpandedResults";

const analytics = vi.hoisted(() => ({
  trackAmplitudeEvent: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/analytics/amplitude", () => analytics);

const bestResults: NationalRankingBestResult[] = [
  {
    editionKey: "inje-2026-men",
    tournamentSlug: "inje",
    tournamentName: "하늘내린인제",
    year: 2026,
    gender: "men",
    actualEntrants: 32,
    stage: "runner_up",
    sourceTeamName: "느티나무",
  },
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
const latestEditionYears = buildLatestEditionYearMap(bestResults, 2026);

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
        latestEditionYears={latestEditionYears}
        regionId="seoultech-results"
      />
    );

    const region = screen.getByRole("region", {
      name: "서울과학기술대학교 느티나무 최고 성적",
    });

    expect(within(region).getAllByRole("listitem")).toHaveLength(3);
    expect(within(region).queryByText("2023 하늘내린인제")).toBeNull();
  });

  it("최근 왕관 기록을 먼저 포함하고 남는 자리를 기존 최고 성적으로 채운다", () => {
    const seoulBestResults: NationalRankingBestResult[] = [
      {
        editionKey: "gyeongin-2025-men",
        tournamentSlug: "gyeongin",
        tournamentName: "경인지구 연맹전",
        year: 2025,
        gender: "men",
        actualEntrants: 48,
        stage: "champion",
        sourceTeamName: "서울대학교 테니스부",
      },
      {
        editionKey: "gyeongin-2024-men",
        tournamentSlug: "gyeongin",
        tournamentName: "경인지구 연맹전",
        year: 2024,
        gender: "men",
        actualEntrants: 42,
        stage: "champion",
        sourceTeamName: "서울대학교 테니스부",
      },
      {
        editionKey: "chuncheon-2023-men",
        tournamentSlug: "chuncheon",
        tournamentName: "춘천소양강배",
        year: 2023,
        gender: "men",
        actualEntrants: 36,
        stage: "champion",
        sourceTeamName: "서울대학교 테니스부",
      },
    ];
    const seoulHonors: NationalRankingHonor[] = [
      {
        editionKey: "inje-2026-men",
        tournamentSlug: "inje",
        tournamentName: "하늘내린인제",
        year: 2026,
        gender: "men",
        stage: "champion",
      },
      {
        editionKey: "gyeongin-2025-men",
        tournamentSlug: "gyeongin",
        tournamentName: "경인지구 연맹전",
        year: 2025,
        gender: "men",
        stage: "champion",
      },
    ];
    const seoulLatestEditionYears = buildLatestEditionYearMap(
      seoulHonors,
      2026
    );

    const { container } = render(
      <NationalRankingExpandedResults
        activeGender="men"
        bestResults={seoulBestResults}
        clubSlug="snu-tennis"
        displayName="서울대학교 테니스부"
        honors={seoulHonors}
        latestEditionYears={seoulLatestEditionYears}
        regionId="snu-results"
      />
    );

    const region = screen.getByRole("region", {
      name: "서울대학교 테니스부 최고 성적",
    });
    const items = within(region)
      .getAllByRole("listitem")
      .map((item) => item.textContent);

    expect(items).toEqual([
      "2026 하늘내린인제남자부 · 우승",
      "2025 경인지구 연맹전남자부 · 우승",
      "2024 경인지구 연맹전남자부 · 우승",
    ]);
    expect(
      container.querySelectorAll<HTMLImageElement>(".national-result-crown")
    ).toHaveLength(2);
  });

  it("대회별 최신 완료 대회 입상에만 왕관을 붙이고 현재 부문을 보존한다", () => {
    const { container } = render(
      <NationalRankingExpandedResults
        activeGender="men"
        bestResults={bestResults}
        clubSlug="seoultech-neutinamu"
        displayName="서울과학기술대학교 느티나무"
        latestEditionYears={latestEditionYears}
        regionId="seoultech-results"
      />
    );

    const crowns = container.querySelectorAll<HTMLImageElement>(
      ".national-result-crown"
    );
    expect(crowns).toHaveLength(2);
    expect(crowns[0].getAttribute("src")).toContain(
      encodeURIComponent("/national-ranking/silver-crown.png")
    );
    expect(crowns[1].getAttribute("src")).toContain(
      encodeURIComponent("/national-ranking/bronze-crown.png")
    );
    expect(
      screen.getByRole("link", { name: "전체 성적 보기" }).getAttribute("href")
    ).toBe("/clubs/seoultech-neutinamu?gender=men");
  });

  it("마운트된 상세 영역은 접근성 트리와 탭 순서에 포함한다", () => {
    const { container } = render(
      <NationalRankingExpandedResults
        activeGender="women"
        bestResults={bestResults}
        clubSlug="seoultech-neutinamu"
        displayName="서울과학기술대학교 느티나무"
        latestEditionYears={latestEditionYears}
        regionId="seoultech-results"
      />
    );

    expect(
      screen.getByRole("region", {
        name: "서울과학기술대학교 느티나무 최고 성적",
      })
    ).toBeDefined();
    expect(
      container.querySelector('[role="region"]')?.getAttribute("aria-hidden")
    ).toBeNull();
    expect(container.querySelector("a")?.getAttribute("tabindex")).toBeNull();
  });

  it("전체 성적 페이지 이동을 현재 부문과 함께 기록한다", () => {
    render(
      <NationalRankingExpandedResults
        activeGender="men"
        bestResults={bestResults}
        clubSlug="seoultech-neutinamu"
        displayName="서울과학기술대학교 느티나무"
        latestEditionYears={latestEditionYears}
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

  it("운영 동아리의 단식 랭킹 링크에 현재 부문을 전달하고 클릭을 기록한다", () => {
    render(
      <NationalRankingExpandedResults
        activeGender="women"
        bestResults={bestResults}
        campusRankingLink={{
          campusClubSlug: "seoultech",
          href: "/seoultech",
        }}
        clubSlug="seoultech-neutinamu"
        displayName="서울과학기술대학교 느티나무"
        latestEditionYears={latestEditionYears}
        regionId="seoultech-results"
      />
    );

    const campusLink = screen.getByRole("link", {
      name: "단식 랭킹 보기",
    });
    expect(campusLink.getAttribute("href")).toBe(
      "/seoultech?fromGender=women"
    );
    campusLink.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(campusLink);

    expect(analytics.trackAmplitudeEvent).toHaveBeenCalledWith(
      "Campus Ranking Link Clicked",
      {
        source: "national_ranking_preview",
        club_slug: "seoultech-neutinamu",
        campus_club_slug: "seoultech",
        division: "women",
      }
    );
  });

  it("미운영 동아리는 전체 성적 링크만 보여준다", () => {
    render(
      <NationalRankingExpandedResults
        activeGender="men"
        bestResults={bestResults}
        campusRankingLink={null}
        clubSlug="kaist"
        displayName="한국과학기술원 KAIST Tennis"
        latestEditionYears={latestEditionYears}
        regionId="kaist-results"
      />
    );

    expect(
      screen.getByRole("link", { name: "전체 성적 보기" })
    ).toBeDefined();
    expect(
      screen.queryByRole("link", { name: "단식 랭킹 보기" })
    ).toBeNull();
  });
});
