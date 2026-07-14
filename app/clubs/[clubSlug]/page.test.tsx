import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getCachedNationalClubResultsPageData } from "@/lib/nationalRanking/clubResults";

import NationalClubResultsPage from "./page";

vi.mock("@/lib/nationalRanking/clubResults", () => ({
  getCachedNationalClubResultsPageData: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("NationalClubResultsPage", () => {
  it("동아리의 16강 이상 대회 성적을 별도 페이지에 리스트로 보여준다", async () => {
    vi.mocked(getCachedNationalClubResultsPageData).mockResolvedValue({
      club: {
        slug: "seoultech-neutinamu",
        universityName: "서울과학기술대학교",
        clubName: "느티나무",
        displayName: "서울과학기술대학교 느티나무",
      },
      results: [
        {
          tournamentSlug: "yanggu",
          tournamentName: "국토정중앙배(양구)",
          year: 2025,
          gender: "men",
          actualEntrants: 64,
          stage: "quarterfinal",
          sourceTeamName: "서울과기대 느티나무 A",
          teamLabel: "A",
        },
        {
          tournamentSlug: "chuncheon",
          tournamentName: "춘천소양강배",
          year: 2024,
          gender: "women",
          actualEntrants: 32,
          stage: "round_of_16",
          sourceTeamName: "서울과기대 느티나무",
          teamLabel: "",
        },
      ],
    });

    render(
      await NationalClubResultsPage({
        params: Promise.resolve({ clubSlug: "seoultech-neutinamu" }),
      })
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "서울과학기술대학교 느티나무",
      })
    ).toBeDefined();
    expect(screen.getByText("16강 이상 대회 최고 성적")).toBeDefined();
    const list = screen.getByRole("list", { name: "대회 성적" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("2025")).toBeDefined();
    expect(within(list).getByText("국토정중앙배(양구)")).toBeDefined();
    expect(within(list).getByText("8강")).toBeDefined();
    expect(within(list).getByText("16강")).toBeDefined();
    expect(
      screen.getByRole("link", { name: "전국 랭킹으로 돌아가기" }).getAttribute(
        "href"
      )
    ).toBe("/?gender=combined");
  });

  it("확인된 16강 이상 성적이 없으면 조용한 빈 상태를 보여준다", async () => {
    vi.mocked(getCachedNationalClubResultsPageData).mockResolvedValue({
      club: {
        slug: "kaist",
        universityName: "한국과학기술원",
        clubName: "KAIST Tennis",
        displayName: "한국과학기술원 KAIST Tennis",
      },
      results: [],
    });

    render(
      await NationalClubResultsPage({
        params: Promise.resolve({ clubSlug: "kaist" }),
      })
    );

    expect(
      screen.getByText("현재 확인된 16강 이상 성적이 없습니다.")
    ).toBeDefined();
  });
});
