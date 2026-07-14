import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NationalClubResultsPageData } from "@/lib/nationalRanking/clubResults";

import NationalClubResultsView from "./NationalClubResultsView";

const navigation = vi.hoisted(() => ({
  query: "",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.query),
}));

const pageData: NationalClubResultsPageData = {
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
      stage: "champion",
      sourceTeamName: "서울과기대 느티나무 A",
      teamLabel: "A",
    },
    {
      tournamentSlug: "gyeongin",
      tournamentName: "경인지구 연맹전",
      year: 2025,
      gender: "women",
      actualEntrants: 48,
      stage: "runner_up",
      sourceTeamName: "서울과기대 느티나무",
      teamLabel: "",
    },
    {
      tournamentSlug: "inje",
      tournamentName: "하늘내린인제",
      year: 2025,
      gender: "women",
      actualEntrants: 24,
      stage: "semifinal",
      sourceTeamName: "느티나무",
      teamLabel: "",
    },
    {
      tournamentSlug: "chuncheon",
      tournamentName: "춘천소양강배",
      year: 2024,
      gender: "women",
      actualEntrants: 32,
      stage: "champion",
      sourceTeamName: "서울과기대 느티나무",
      teamLabel: "",
    },
    {
      tournamentSlug: "wemix",
      tournamentName: "WEMIX OPEN",
      year: 2025,
      gender: "men",
      actualEntrants: 16,
      stage: "quarterfinal",
      sourceTeamName: "서울과기대",
      teamLabel: "",
    },
  ],
};

describe("NationalClubResultsView", () => {
  beforeEach(() => {
    navigation.query = "";
    navigation.replace.mockReset();
  });

  it("상세 페이지의 기본 부문인 종합에서 남녀 전체 기록을 보여준다", () => {
    render(<NationalClubResultsView pageData={pageData} />);

    expect(
      screen.getByRole("tab", { name: "종합" }).getAttribute("aria-selected")
    ).toBe("true");
    expect(screen.getByText("5개 기록")).toBeDefined();
    expect(screen.getByRole("list", { name: "대회 성적" })).toBeDefined();
    expect(
      screen.getByRole("link", { name: "전국 랭킹으로 돌아가기" }).getAttribute(
        "href"
      )
    ).toBe("/?gender=combined");
  });

  it("여자부 URL로 들어오면 여자 기록만 보여주고 뒤로가기도 여자부를 보존한다", () => {
    navigation.query = "gender=women";
    render(<NationalClubResultsView pageData={pageData} />);

    expect(
      screen.getByRole("tab", { name: "여자부" }).getAttribute("aria-selected")
    ).toBe("true");
    expect(screen.getByText("3개 기록")).toBeDefined();
    expect(screen.queryByText("WEMIX OPEN")).toBeNull();
    expect(screen.queryByText("국토정중앙배(양구)")).toBeNull();
    expect(
      screen.getByRole("link", { name: "전국 랭킹으로 돌아가기" }).getAttribute(
        "href"
      )
    ).toBe("/?gender=women");
  });

  it("2025년 우승·준우승·4강에만 금·은·동 왕관을 표시한다", () => {
    const { container } = render(<NationalClubResultsView pageData={pageData} />);

    const crowns = Array.from(
      container.querySelectorAll<HTMLImageElement>(".national-result-crown")
    );
    expect(crowns).toHaveLength(3);
    expect(crowns.map((crown) => crown.getAttribute("src"))).toEqual(
      expect.arrayContaining([
        expect.stringContaining(encodeURIComponent("/national-ranking/gold-crown.png")),
        expect.stringContaining(encodeURIComponent("/national-ranking/silver-crown.png")),
        expect.stringContaining(encodeURIComponent("/national-ranking/bronze-crown.png")),
      ])
    );

    const oldChampion = screen.getByText("춘천소양강배").closest("li");
    expect(oldChampion?.querySelector("img")).toBeNull();
  });

  it("남자부를 선택하면 기록 수와 URL을 함께 바꾼다", () => {
    render(<NationalClubResultsView pageData={pageData} />);

    fireEvent.click(screen.getByRole("tab", { name: "남자부" }));

    expect(screen.getByText("2개 기록")).toBeDefined();
    expect(navigation.replace).toHaveBeenCalledWith(
      "/clubs/seoultech-neutinamu?gender=men",
      { scroll: false }
    );
    const list = screen.getByRole("list", { name: "대회 성적" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).queryByText("경인지구 연맹전")).toBeNull();
  });
});
